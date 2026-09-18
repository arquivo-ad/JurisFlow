/**
 * Utilitários de Padronização Forense e Identidade Visual (ABNT / OAB)
 *
 * Regra Obrigatória:
 * O nome da advogada ou advogado que está gerando o documento DEVE SEMPRE
 * constar em MAIÚSCULO, NEGRITO E SUBLINHADO no corpo dos textos de
 * petição, procuração ou contrato.
 */

export function formatLawyerNameInBody(
  content: string,
  rawLawyerName?: string,
  _category?: string
): string {
  if (!content) return '';

  const fallbackName = 'Dra. Gabriela M. Manni Capitani';
  const effectiveName = (rawLawyerName && rawLawyerName.trim().length > 0) ? rawLawyerName.trim() : fallbackName;
  const upperFull = effectiveName.toUpperCase();

  // Remove honoríficos comuns para capturar menções com ou sem Dra./Dr.
  const cleanName = effectiveName.replace(/^(Dra?\.|Dr\.|Doutor(a)?)\s+/i, '').trim();
  const upperClean = cleanName.toUpperCase();

  const formattedReplacement = `<u><strong>${upperFull}</strong></u>`;

  let result = content;

  // 1. Substitui tags de placeholders frequentes
  result = result.replace(
    /\{\{(NOME_ADVOGAD[OA]|ADVOGAD[OA]|OUTORGAD[OA]|PATRON[OA]|SUBSCRITOR[A]?)\}\}/gi,
    formattedReplacement
  );

  // 2. Protege tags já formatadas para não aninhar indevidamente
  const MARKER = '___LAWYER_NAME_FORMATTED_TOKEN___';
  result = result
    .replace(new RegExp(`<u><strong>${escapeRegExp(upperFull)}<\\/strong><\\/u>`, 'gi'), MARKER)
    .replace(new RegExp(`<strong><u>${escapeRegExp(upperFull)}<\\/u><\\/strong>`, 'gi'), MARKER)
    .replace(new RegExp(`<u><b>${escapeRegExp(upperFull)}<\\/b><\\/u>`, 'gi'), MARKER)
    .replace(new RegExp(`<b><u>${escapeRegExp(upperFull)}<\\/u><\\/b>`, 'gi'), MARKER)
    .replace(new RegExp(`<u>\\*\\*${escapeRegExp(upperFull)}\\*\\*<\\/u>`, 'gi'), MARKER)
    .replace(new RegExp(`\\*\\*<u>${escapeRegExp(upperFull)}<\\/u>\\*\\*`, 'gi'), MARKER);

  // 3. Substitui menções completas (ex: Dra. Gabriela M. Manni Capitani ou Gabriela M. Manni Capitani)
  if (effectiveName) {
    const fullRegex = new RegExp(`\\b(Dra?\\.?\\s+|Doutor(a)?\\s+)?${escapeRegExp(cleanName)}\\b`, 'gi');
    result = result.replace(fullRegex, formattedReplacement);
  }

  // Também verifica se o nome foi escrito com variações como "Gabriela Capitani"
  const lastNameMatch = cleanName.split(' ');
  if (lastNameMatch.length > 2) {
    const shortVariant = `${lastNameMatch[0]} ${lastNameMatch[lastNameMatch.length - 1]}`;
    const shortRegex = new RegExp(`\\b(Dra?\\.?\\s+)?${escapeRegExp(shortVariant)}\\b`, 'gi');
    result = result.replace(shortRegex, formattedReplacement);
  }

  // 4. Restaura os tokens protegidos
  result = result.replace(new RegExp(MARKER, 'g'), formattedReplacement);

  return result;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
