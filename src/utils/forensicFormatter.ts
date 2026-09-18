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

export interface LawyerSalutation {
  honorific: 'Dr.' | 'Dra.';
  shortName: string;
  displayName: string;
  fullNameWithTitle: string;
  greeting: string;
}

export function getLawyerSalutation(
  rawName?: string,
  roleOrGenderHint?: string
): LawyerSalutation {
  const fallback = 'Dra. Gabriela M. Manni Capitani';
  const effective = (rawName && rawName.trim().length > 0) ? rawName.trim() : fallback;

  // Clean name of Dr./Dra./Doutor(a) prefixes FIRST to extract the true legal name
  const cleanName = effective.replace(/^(?:Dra?\.|Dr\.|Doutor(?:a)?)\s+/i, '').trim();
  const nameParts = cleanName.split(/\s+/).filter(Boolean);
  const shortName = nameParts[0] || 'Gabriela';

  // 1. Detect if explicitly "Dra." or "Dr." in rawName
  let honorific: 'Dr.' | 'Dra.' = 'Dra.';
  if (/^dra\.?\b/i.test(effective)) {
    honorific = 'Dra.';
  } else if (/advogada|sócia|diretora|doutora/i.test(roleOrGenderHint || '')) {
    honorific = 'Dra.';
  } else if (/advogado|sócio|diretor|doutor/i.test(roleOrGenderHint || '')) {
    honorific = 'Dr.';
  } else if (/^dr\.?\b/i.test(effective) && !/gabriela/i.test(shortName)) {
    honorific = 'Dr.';
  } else {
    // Check first name heuristics in Portuguese
    const firstName = shortName.toLowerCase();
    const maleExceptions = ['luca', 'lucas', 'alexandre', 'andré', 'felipe', 'guilherme', 'jorge', 'josé', 'tomé', 'carlos', 'roberto', 'joão', 'marcelo', 'paulo', 'ricardo', 'gabriel'];
    if (maleExceptions.includes(firstName)) {
      honorific = 'Dr.';
    } else if (firstName.endsWith('a') || /^(alice|beatriz|mariane|cleide|simone|inês|raquel|carmen|ruth|ester)/i.test(firstName) || /^(maria|ana|gabriela|marina|helena|juliana|fernanda|patricia|carolina|larissa|camila|paula|vanessa|luiza|isabela|claudia)/i.test(firstName)) {
      honorific = 'Dra.';
    } else {
      honorific = 'Dr.';
    }
  }

  // Proteção absoluta contra erro de tratamento: Gabriela é estritamente feminina (Dra.)
  if (/gabriela/i.test(shortName) || /gabriela/i.test(cleanName)) {
    honorific = 'Dra.';
  }

  // Ex: "Dra. Gabriela"
  const displayName = `${honorific} ${shortName}`;
  const fullNameWithTitle = `${honorific} ${cleanName}`;
  const greeting = `Olá, ${displayName}!`;

  return {
    honorific,
    shortName,
    displayName,
    fullNameWithTitle,
    greeting,
  };
}
