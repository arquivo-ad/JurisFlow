import crypto from 'node:crypto';
import { DataJudAdapter } from './DataJudAdapter.ts';
import { PrecedentVerifier } from '../verifier.ts';
import { isExactTjrrSearchUrl, isExactTjrrPdfUrl } from '../officialSources.ts';
import type { CanonicalLegalDecision, OfficialSourceDiagnostic } from '../types.ts';

const TJRR_BASE = 'https://jurisprudencia.tjrr.jus.br';
const TJRR_HOME = TJRR_BASE + '/';
type FetchLike = typeof fetch;

interface TjrrRecord {
  id: string;
  rawCaseNumber: string;
  processClass: string;
  rapporteur: string;
  organ: string;
  judgmentDate?: string;
  publicationDate?: string;
  headnote: string;
  fullText: string;
}

function sha256(value: string | Buffer): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function textOnly(value: string): string {
  return value
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function brDate(value?: string): string | undefined {
  const m = String(value || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : undefined;
}

function collectCookies(headers: Headers): string {
  const h: any = headers as any;
  const values: string[] = typeof h.getSetCookie === 'function' ? h.getSetCookie() : [];
  if (!values.length) {
    const one = headers.get('set-cookie');
    if (one) values.push(one);
  }
  return values.map((x) => x.split(';', 1)[0]).join('; ');
}

function formFields(html: string): Array<[string,string]> {
  const body = /<form\b[^>]*id=["']menuinicial["'][^>]*>([\s\S]*?)<\/form>/i.exec(html)?.[1] || '';
  const out:Array<[string,string]> = [];
  for (const tag of body.match(/<(?:input|select|textarea)\b[^>]*>/gi) || []) {
    const name = /name=["']([^"']+)/i.exec(tag)?.[1];
    if (!name) continue;
    const type = (/type=["']([^"']+)/i.exec(tag)?.[1] || '').toLowerCase();
    if (['button','image','file','reset'].includes(type)) continue;
    if (['checkbox','radio'].includes(type) && !/checked/i.test(tag)) continue;
    const value = /value=["']([^"']*)/i.exec(tag)?.[1] || '';
    out.push([name, value]);
  }
  return out;
}

function encode(entries:Array<[string,string]>): string {
  const p = new URLSearchParams();
  for (const [k,v] of entries) p.append(k,v);
  return p.toString();
}
function extractResults(html: string): TjrrRecord[] {
  const out:TjrrRecord[] = [];
  const chunks = html.split(/<tr\s+data-ri=["']\d+["'][^>]*>/i).slice(1);
  const field = (chunk: string, label: RegExp): string => {
    const start = label.exec(chunk);
    if (!start) return '';
    const tail = chunk.slice(start.index + start[0].length, start.index + start[0].length + 18_000);
    return textOnly(/<div\s+class=["']docTexto["'][^>]*>([\s\S]*?)<\/div>/i.exec(tail)?.[1] || '');
  };

  for (const chunk of chunks) {
    const id = /abrirJanela\('\/inteiroTeor\.xhtml\?id=(\d+)'\)/i.exec(chunk)?.[1] || '';
    if (!id) continue;

    const processText = field(chunk, /<div\s+class=["']docTitulo["']>\s*PROCESSO\s*<\/div>/i);
    const cnj = /\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}/.exec(processText)?.[0] || '';
    const processClass = processText.replace(cnj, '').trim();
    const headnote = field(chunk, /<div\s+class=["']docTitulo["']>\s*EMENTA:\s*<\/div>/i);
    const fullMarker = chunk.indexOf('INTEIRO TEOR');
    const fullTail = fullMarker >= 0 ? chunk.slice(fullMarker, fullMarker + 45_000) : '';
    const fullText = textOnly(/<div[^>]*style=["'][^"']*display\s*:\s*none[^"']*["'][^>]*>([\s\S]*?)<\/div>/i.exec(fullTail)?.[1] || '');

    if (!cnj || !headnote || !fullText) continue;
    out.push({
      id,
      rawCaseNumber: cnj,
      processClass,
      rapporteur: field(chunk, /<div\s+class=["']docTitulo["']>\s*RELATOR\s*<\/div>/i),
      organ: field(chunk, /<div\s+class=["']docTitulo["']>\s*[ÓO]RG[ÃA]O JULGADOR:\s*<\/div>/i),
      judgmentDate: brDate(field(chunk, /<div\s+class=["']docTitulo["']>\s*DATA DO JULGAMENTO:\s*<\/div>/i)),
      publicationDate: brDate(field(chunk, /<div\s+class=["']docTitulo["']>\s*DATA DA PUBLICA[ÇC][ÃA]O:\s*<\/div>/i)),
      headnote,
      fullText,
    });
  }
  return out;
}

export class TjrrJurisprudenciaAdapter {
  constructor(private readonly fetchImpl:FetchLike=fetch, private readonly timeoutMs=35_000) {}

  async searchOfficialJurisprudence(query:string, limit=5) {
    const startedAt=Date.now(), timestamp=new Date().toISOString();
    const safeQuery=String(query||'').trim().slice(0,500);
    const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),this.timeoutMs);
    try {
      if (!safeQuery) throw new Error('Consulta TJRR vazia.');
      const first=await this.fetchImpl(TJRR_HOME,{headers:{'User-Agent':'Mozilla/5.0 JurisFlow/1.4'},signal:controller.signal});
      const home=await first.text();
      const actionMatch=/<form\b[^>]*id=["']menuinicial["'][^>]*action=["']([^"']+)/i.exec(home);
      const action=new URL(actionMatch?.[1] || '/index.xhtml',TJRR_HOME).toString();
      if(!isExactTjrrSearchUrl(action)) throw new Error('Endpoint TJRR fora da allowlist.');
      const cookie=collectCookies(first.headers);
      let fields=formFields(home).filter(([k])=>!['menuinicial:j_idt35','menuinicial:j_idt38'].includes(k));
      fields.push(['menuinicial:j_idt35',safeQuery],['menuinicial:j_idt38','']);
      const body=encode(fields);
      const response=await this.fetchImpl(action,{method:'POST',headers:{
        'Content-Type':'application/x-www-form-urlencoded','User-Agent':'Mozilla/5.0 JurisFlow/1.4',Referer:TJRR_HOME,
        ...(cookie?{Cookie:cookie}:{})
      },body,signal:controller.signal});
      const bytes=Buffer.from(await response.arrayBuffer());
      if(!response.ok) throw new Error('HTTP '+response.status+' na busca TJRR.');
      const html=bytes.toString('utf8');
      const records=extractResults(html).slice(0,Math.max(1,Math.min(limit,10)));
      const decisions:CanonicalLegalDecision[]=[]; const rejected:string[]=[];
      for(const record of records) {
        const cnj=DataJudAdapter.normalizeCnjNumber(record.rawCaseNumber);
        if(!cnj){rejected.push('CNJ TJRR inválido.');continue;}
        const detailUrl=`${TJRR_BASE}/inteiroTeor.xhtml?id=${record.id}`;
        const detail=await this.fetchImpl(detailUrl,{headers:{'User-Agent':'Mozilla/5.0 JurisFlow/1.4',Referer:action,...(cookie?{Cookie:cookie}:{})},signal:controller.signal});
        const detailHtml=await detail.text();
        const pdfHref=/href=["']([^"']*\/pdf[^"']*id=\d+[^"']*)/i.exec(detailHtml)?.[1];
        if(!pdfHref){rejected.push('TJRR sem PDF individual.');continue;}
        const pdfUrl=new URL(pdfHref,detailUrl).toString();
        if(!isExactTjrrPdfUrl(pdfUrl,record.id)){rejected.push('PDF TJRR fora da allowlist.');continue;}
        const pdfResp=await this.fetchImpl(pdfUrl,{headers:{'User-Agent':'Mozilla/5.0 JurisFlow/1.4',Referer:detailUrl,...(cookie?{Cookie:cookie}:{})},signal:controller.signal});
        const pdf=Buffer.from(await pdfResp.arrayBuffer());
        if(!pdfResp.ok || !/^application\/pdf/i.test(pdfResp.headers.get('content-type')||'') || !pdf.subarray(0,5).equals(Buffer.from('%PDF-'))){
          rejected.push('PDF individual TJRR inválido.');continue;
        }
        const hash=sha256(pdf);
        const decision:CanonicalLegalDecision={
          id:'tjrr-'+hash.slice(0,20),sourceId:'tjrr-jurisprudencia',
          officialUrl:pdfUrl,fullTextUrl:pdfUrl,court:'Tribunal de Justiça do Estado de Roraima',
          courtCode:'TJRR',judicialBranch:'ESTADUAL',jurisdiction:'RR',courtOrgan:record.organ,
          processClass:record.processClass,rawCaseNumber:cnj,normalizedCnjNumber:cnj,alternativeNumber:record.id,
          rapporteur:record.rapporteur,judgmentDate:record.judgmentDate,publicationDate:record.publicationDate,
          officialHeadnote:record.headnote,fullText:record.fullText,documentType:'ACORDAO',
          precedentSituation:'JULGADO',precedentStrength:'PERSUASIVO_REGIONAL',language:'pt-BR',
          contentSha256:hash,collectedAt:timestamp,lastVerifiedAt:timestamp,verificationStatus:'FOUND_UNVERIFIED',
          parserVersion:'tjrr-primefaces-2026.1',documentVersion:1,
          rawPayloadPreserved:{id:record.id,verificationEvidence:{
            individualDocument:{confirmed:true,url:pdfUrl,httpStatus:pdfResp.status,contentSha256:hash,bytes:pdf.length,fetchedAt:timestamp},
            originatingQuery:{id:'tjrr-query-'+sha256(body).slice(0,24),endpoint:action,querySha256:sha256(body),responseRecordSha256:sha256(JSON.stringify(record)),executedAt:timestamp}
          }}
        };
        const vr=PrecedentVerifier.verifyDecision(decision);
        decision.verificationStatus=vr.status;decision.lastVerifiedAt=vr.verificationTimestamp;
        decision.verificationBadge=vr.isPassed?'[OFICIAL TJRR - VERIFICADO]':undefined;
        decision.rejectionReasons=vr.isPassed?undefined:vr.issues;
        if(vr.isPassed) decisions.push(decision); else rejected.push(...vr.issues);
      }
      return {decisions,totalRecords:records.length,diagnostic:{
        adapter:'tjrr-jurisprudencia',sourceName:'Tribunal de Justiça do Estado de Roraima - Jurisprudência',
        courtCode:'TJRR',officialUrl:TJRR_HOME,timestamp,httpStatus:response.status,latencyMs:Date.now()-startedAt,
        lifecycleState:decisions.length?'SEARCH_SUCCESS':'EMPTY_VALID_DATASET',
        stateDescription:decisions.length?'Pesquisa TJRR concluída com PDF individual oficial e SHA-256.':'TJRR respondeu sem decisão verificável.',
        bytesTransferred:bytes.length,contentSha256:sha256(bytes),documentsReceived:records.length,documentsNormalized:decisions.length,
        documentsRejected:records.length-decisions.length,recordsRead:records.length,recordsAccepted:decisions.length,recordsRejected:records.length-decisions.length,
        parsingErrors:[],rejectionReasons:rejected,normalizedQueryNumber:safeQuery,connectorStatus:'HEALTHY'
      } as OfficialSourceDiagnostic};
    } catch(error:any) {
      return {decisions:[],totalRecords:0,diagnostic:{
        adapter:'tjrr-jurisprudencia',sourceName:'Tribunal de Justiça do Estado de Roraima - Jurisprudência',
        courtCode:'TJRR',officialUrl:TJRR_HOME,timestamp,httpStatus:error?.name==='AbortError'?408:503,latencyMs:Date.now()-startedAt,
        lifecycleState:'SOURCE_UNAVAILABLE',stateDescription:String(error?.message||error),bytesTransferred:0,documentsReceived:0,
        documentsNormalized:0,documentsRejected:0,recordsRead:0,recordsAccepted:0,recordsRejected:0,parsingErrors:[String(error?.message||error)],
        rejectionReasons:[String(error?.message||error)],normalizedQueryNumber:safeQuery,connectorStatus:'FAILED'
      } as OfficialSourceDiagnostic};
    } finally { clearTimeout(timeout); }
  }
}
