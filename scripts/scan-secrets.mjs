import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
const patterns = [
  /SUPABASE_SERVICE_ROLE_KEY\s*=\s*["']?eyJ[A-Za-z0-9_-]{20,}/,
  /GEMINI_API_KEY\s*=\s*["']?AIza[A-Za-z0-9_-]{20,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];
const findings = [];
for (const file of files) {
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) continue;
  const content = fs.readFileSync(file, 'utf8');
  if (patterns.some((pattern) => pattern.test(content))) findings.push(file);
}
if (findings.length) {
  console.error(`Possíveis segredos em arquivos versionados: ${findings.join(', ')}`);
  process.exit(1);
}
console.log(`Varredura concluída: ${files.length} arquivos versionados sem padrão de segredo conhecido.`);
