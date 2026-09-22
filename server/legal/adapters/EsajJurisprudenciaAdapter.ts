import crypto from 'node:crypto';
import { DataJudAdapter } from './DataJudAdapter.ts';
import { PrecedentVerifier } from '../verifier.ts';
import { isExactEsajDocumentUrl, isExactEsajSearchUrl } from '../officialSources.ts';
import type { CanonicalLegalDecision, OfficialSourceDiagnostic } from '../types.ts';

type SupportedEsajCourt = 'TJAC' | 'TJAL' | 'TJAM' | 'TJMS';
type FetchLike = typeof fetch;

const CONFIG: Record<SupportedEsajCourt, { host: string; courtName: string; jurisdiction: string; verifiedDocument: boolean }> = {
  TJAC: { host: 'esaj.tjac.jus.br', courtName: 'Tribunal de Justiça do Estado do Acre', jurisdiction: 'AC', verifiedDocument: false },
  TJAL: { host: 'www2.tjal.jus.br', courtName: 'Tribunal de Justiça do Estado de Alagoas', jurisdiction: 'AL', verifiedDocument: false },
  TJAM: { host: 'consultasaj.tjam.jus.br', courtName: 'Tribunal de Justiça do Estado do Amazonas', jurisdiction: 'AM', verifiedDocument: false },
  TJMS: { host: 'esaj.tjms.jus.br', courtName: 'Tribunal de Justiça do Estado de Mato Grosso do Sul', jurisdiction: 'MS', verifiedDocument: true },
};

function sha256(v: string | Buffer): string {
  return crypto.createHash('sha256').update(v).digest('hex');
}

function decodeHtml(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&ordf;/gi, 'ª')
    .replace(/&ordm;/gi, 'º')
    .replace(/&ccedil;/gi, 'ç')
    .replace(/&atilde;/gi, 'ã')
    .replace(/&otilde;/gi, 'õ')
    .replace(/&aacute;/gi, 'á')
    .replace(/&eacute;/gi, 'é')
    .replace(/&iacute;/gi, 'í')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&uacute;/gi, 'ú');
}
function textOnly(value: string): string {
  return decodeHtml(value)
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function brDate(value?: string): string | undefined {
  const m = String(value || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : undefined;
}

function firstMatch(html: string, re: RegExp): string {
  const m = re.exec(html);
  return m ? textOnly(m[1] || '') : '';
}

function extractResults(html: string): Array<{
  agreementId: string;
  forumId: string;
  caseNumber: string;
  headnote: string;
  processClass: string;
  rapporteur: string;
  organ: string;
  judgmentDate?: string;
  registrationDate?: string;
}> {
  const anchors=[...html.matchAll(/<a\b[^>]*class=["'][^"']*downloadEmenta[^"']*["'][^>]*cdAcordao=["'](\d+)["'][^>]*cdForo=["'](\d+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const out=[] as any[];
  const seen=new Set<string>();
  for (let i=0;i<anchors.length;i++) {
    const m=anchors[i]; const id=m[1]; if(seen.has(id)) continue; seen.add(id);
    const start=m.index || 0;
    const next=anchors.slice(i+1).find(x=>x[1]!==id);
    const end=next?.index || Math.min(html.length,start+30000);
    const segment=html.slice(start,end);
    const caseNumber=textOnly(m[3]);
    const headnote=firstMatch(segment,new RegExp('<div id=["\\\']textAreaDados_'+id+'["\\\'][^>]*class=["\\\'][^"\\\']*mensagemSemFormatacao[^"\\\']*["\\\'][^>]*>([\\s\\S]*?)<\\/div>','i'));
    if(!caseNumber || !headnote) continue;
    out.push({
      agreementId:id, forumId:m[2], caseNumber, headnote,
      processClass:firstMatch(segment,/Classe\/Assunto:\s*<\/strong>\s*([^<]+)/i),
      rapporteur:firstMatch(segment,/Relator\(a\):\s*<\/strong>\s*([^<]+)/i),
      organ:firstMatch(segment,/[ÓO]rg[aã]o julgador:\s*<\/strong>\s*([^<]+)/i),
      judgmentDate:brDate(firstMatch(segment,/Data do julgamento:\s*<\/strong>\s*([^<]+)/i)),
      registrationDate:brDate(firstMatch(segment,/Data de registro:\s*<\/strong>\s*([^<]+)/i)),
    });
  }
  return out;
}
function parseInputs(html: string): Array<[string,string]> {
  const form=/<form\b[^>]*>([\s\S]*?)<\/form>/i.exec(html)?.[1] || '';
  const data:Array<[string,string]>= [];
  for(const raw of form.match(/<(?:input|select|textarea)\b[^>]*>/gi) || []) {
    const name=/name=["']([^"']+)/i.exec(raw)?.[1]; if(!name) continue;
    const type=(/type=["']([^"']+)/i.exec(raw)?.[1] || '').toLowerCase();
    if(['button','image','file','reset','submit'].includes(type)) continue;
    if(['checkbox','radio'].includes(type) && !/checked/i.test(raw)) continue;
    const value=decodeHtml(/value=["']([^"']*)/i.exec(raw)?.[1] || '');
    data.push([name,value]);
  }
  return data;
}

function encodeForm(entries:Array<[string,string]>): string {
  const p=new URLSearchParams();
  for(const [k,v] of entries) p.append(k,v);
  return p.toString();
}

function collectCookies(headers: Headers): string {
  const h:any=headers as any;
  const values:string[] = typeof h.getSetCookie==='function' ? h.getSetCookie() : [];
  if(!values.length) {
    const one=headers.get('set-cookie'); if(one) values.push(one);
  }
  return values.map(x=>x.split(';',1)[0]).join('; ');
}
export class EsajJurisprudenciaAdapter {
  constructor(
    private readonly courtCode: SupportedEsajCourt,
    private readonly fetchImpl: FetchLike = fetch,
    private readonly timeoutMs = 35_000
  ) {}

  async searchOfficialJurisprudence(query: string, limit=10): Promise<{decisions:CanonicalLegalDecision[]; diagnostic:OfficialSourceDiagnostic; totalRecords:number}> {
    const cfg=CONFIG[this.courtCode];
    const startedAt=Date.now(); const timestamp=new Date().toISOString();
    const safeQuery=String(query||'').trim().slice(0,500);
    const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),this.timeoutMs);
    const portal=`https://${cfg.host}/cjsg/consultaCompleta.do`;
    try {
      if(!safeQuery) throw new Error('Consulta e-SAJ vazia.');
      const first=await this.fetchImpl(portal,{headers:{'User-Agent':'Mozilla/5.0 JurisFlow/1.4 LegalResearchConnector'},signal:controller.signal});
      const firstHtml=await first.text(); if(!first.ok) throw new Error('HTTP '+first.status+' ao abrir e-SAJ.');
      const cookie=collectCookies(first.headers);
      const actionMatch=/<form\b[^>]*action=["']([^"']+)/i.exec(firstHtml);
      const action=new URL(decodeHtml(actionMatch?.[1] || 'resultadoCompleta.do'),portal).toString();
      if(!isExactEsajSearchUrl(action,this.courtCode)) throw new Error('URL de pesquisa e-SAJ fora da allowlist.');

      let fields=parseInputs(firstHtml);
      const remove=new Set(['dados.buscaEmenta','dados.buscaInteiroTeor','dados.origensSelecionadas','tipoDecisaoSelecionados','pbSubmit']);
      fields=fields.filter(([k])=>!remove.has(k));
      fields.push(['dados.buscaEmenta',safeQuery],['dados.origensSelecionadas','T'],['tipoDecisaoSelecionados','A'],['pbSubmit','Pesquisar']);
      const body=encodeForm(fields);
      const resp=await this.fetchImpl(action,{method:'POST',headers:{
        'Content-Type':'application/x-www-form-urlencoded','User-Agent':'Mozilla/5.0 JurisFlow/1.4 LegalResearchConnector',
        Referer:portal,...(cookie?{Cookie:cookie}:{})
      },body,signal:controller.signal});
      const bytes=Buffer.from(await resp.arrayBuffer()); const html=bytes.toString('utf8');
      if(!resp.ok) throw new Error('HTTP '+resp.status+' na pesquisa e-SAJ.');
      if(/Selecione pelo menos uma origem/i.test(html)) throw new Error('e-SAJ rejeitou origem da pesquisa.');
      const records=extractResults(html).slice(0,Math.max(1,Math.min(limit,10)));
      const decisions:CanonicalLegalDecision[]=[];
      const rejected:string[]=[];
      for(const r of records) {
        const cnj=DataJudAdapter.normalizeCnjNumber(r.caseNumber);
        if(!cnj){rejected.push('CNJ inválido em '+r.caseNumber);continue;}
        const docUrl=`https://${cfg.host}/cjsg/getArquivo.do?cdAcordao=${encodeURIComponent(r.agreementId)}&cdForo=${encodeURIComponent(r.forumId)}`;
        const base:CanonicalLegalDecision={
          id:`${this.courtCode.toLowerCase()}-esaj-${sha256(this.courtCode+r.agreementId+cnj).slice(0,20)}`,
          sourceId:`${this.courtCode.toLowerCase()}-esaj-jurisprudencia`,
          officialUrl:portal,
          court:cfg.courtName,courtCode:this.courtCode,judicialBranch:'ESTADUAL',jurisdiction:cfg.jurisdiction,
          courtOrgan:r.organ,processClass:r.processClass,rawCaseNumber:r.caseNumber,normalizedCnjNumber:cnj,
          alternativeNumber:r.agreementId,rapporteur:r.rapporteur,judgmentDate:r.judgmentDate,publicationDate:r.registrationDate,
          officialHeadnote:r.headnote,fullText:r.headnote,documentType:'ACORDAO',precedentSituation:'JULGADO',
          precedentStrength:'PERSUASIVO_REGIONAL',language:'pt-BR',
          contentSha256:sha256(r.headnote),collectedAt:timestamp,lastVerifiedAt:timestamp,
          verificationStatus:'FOUND_UNVERIFIED',parserVersion:'esaj-cjsg-html-2026.1',documentVersion:1,
          rawPayloadPreserved:{
            agreementId:r.agreementId,forumId:r.forumId,candidateDocumentUrl:docUrl,
            verificationEvidence:{originatingQuery:{
              id:`${this.courtCode.toLowerCase()}-query-${sha256(body).slice(0,24)}`,endpoint:action,
              querySha256:sha256(body),responseRecordSha256:sha256(JSON.stringify(r)),executedAt:timestamp
            }}
          }
        };

        if(cfg.verifiedDocument) {
          if(!isExactEsajDocumentUrl(docUrl,this.courtCode)) { rejected.push('Documento e-SAJ fora da allowlist.'); continue; }
          const pdfResp=await this.fetchImpl(docUrl,{headers:{'User-Agent':'Mozilla/5.0 JurisFlow/1.4 LegalResearchConnector',Referer:action,...(cookie?{Cookie:cookie}:{})},signal:controller.signal});
          const pdf=Buffer.from(await pdfResp.arrayBuffer());
          if(!pdfResp.ok || !/^application\/pdf/i.test(pdfResp.headers.get('content-type')||'') || !pdf.subarray(0,5).equals(Buffer.from('%PDF-'))) {
            rejected.push('Inteiro teor individual e-SAJ inválido para '+cnj); continue;
          }
          base.officialUrl=docUrl; base.fullTextUrl=docUrl; base.contentSha256=sha256(pdf);
          (base.rawPayloadPreserved as any).verificationEvidence.individualDocument={
            confirmed:true,url:docUrl,httpStatus:pdfResp.status,contentSha256:base.contentSha256,bytes:pdf.length,fetchedAt:timestamp
          };
          const vr=PrecedentVerifier.verifyDecision(base);
          base.verificationStatus=vr.status;base.lastVerifiedAt=vr.verificationTimestamp;
          base.verificationBadge=vr.isPassed?`[OFICIAL ${this.courtCode} - VERIFICADO]`:undefined;
          base.rejectionReasons=vr.isPassed?undefined:vr.issues;
          if(vr.isPassed) decisions.push(base); else rejected.push(...vr.issues);
        } else {
          base.rejectionReasons=['ESAJ_INTEIRO_TEOR_INTERATIVO: documento individual exige reCAPTCHA; resultado permanece não verificado.'];
          decisions.push(base);
        }
      }
      const total=Number(/Acórdãos\((\d+)\)/i.exec(html)?.[1] || records.length);
      return {decisions,totalRecords:total,diagnostic:{
        adapter:`${this.courtCode.toLowerCase()}-esaj-jurisprudencia`,sourceName:`${cfg.courtName} - e-SAJ/CJSG`,courtCode:this.courtCode,
        officialUrl:portal,timestamp,httpStatus:resp.status,latencyMs:Date.now()-startedAt,
        lifecycleState:decisions.length?'SEARCH_SUCCESS':'EMPTY_VALID_DATASET',
        stateDescription:cfg.verifiedDocument
          ? 'Pesquisa e-SAJ concluída com inteiro teor PDF individual verificado.'
          : 'Pesquisa e-SAJ concluída; inteiro teor exige reCAPTCHA e resultados permanecem FOUND_UNVERIFIED.',
        bytesTransferred:bytes.length,contentSha256:sha256(bytes),documentsReceived:records.length,documentsNormalized:decisions.length,
        documentsRejected:records.length-decisions.length,recordsRead:records.length,recordsAccepted:decisions.length,recordsRejected:records.length-decisions.length,
        parsingErrors:[],rejectionReasons:rejected,normalizedQueryNumber:safeQuery,
        connectorStatus:cfg.verifiedDocument?'HEALTHY':'DEGRADED'
      }};
    } catch(error:any) {
      return {decisions:[],totalRecords:0,diagnostic:{
        adapter:`${this.courtCode.toLowerCase()}-esaj-jurisprudencia`,sourceName:`${cfg.courtName} - e-SAJ/CJSG`,courtCode:this.courtCode,
        officialUrl:portal,timestamp,httpStatus:error?.name==='AbortError'?408:503,latencyMs:Date.now()-startedAt,
        lifecycleState:'SOURCE_UNAVAILABLE',stateDescription:String(error?.message||error),bytesTransferred:0,documentsReceived:0,
        documentsNormalized:0,documentsRejected:0,recordsRead:0,recordsAccepted:0,recordsRejected:0,parsingErrors:[String(error?.message||error)],
        rejectionReasons:[String(error?.message||error)],normalizedQueryNumber:safeQuery,connectorStatus:'FAILED'
      }};
    } finally { clearTimeout(timeout); }
  }
}
