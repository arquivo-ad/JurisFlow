import { execFileSync } from 'node:child_process';

const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  commit,
  policy: 'ZERO_HALLUCINATION_GROUNDING',
  requiredEvidence: ['exactOfficialHostname', 'individualDocumentHttp200', 'sha256ReceivedContent', 'verificationTimestamp', 'originatingQuery'],
  nonImplementedSources: ['BNP_PANGEA', 'DJEN_AUTHENTICATED_WEBHOOK', 'LOCAL_ICP_BRASIL_BRIDGE'],
}, null, 2));
