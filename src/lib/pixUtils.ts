// Utilitário de Geração de PIX Padrão Banco Central do Brasil (BCB / EMVCo)
// Suporta chaves: E-mail, CPF, CNPJ, Telefone (+55...) e Chave Aleatória EVP

function formatEMV(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

// CRC-16/CCITT-FALSE (polinômio 0x1021, valor inicial 0xFFFF)
export function calculateCrc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export interface PixPayloadParams {
  pixKey: string;
  recipientName: string;
  city?: string;
  amount?: number;
  txId?: string;
  description?: string;
}

/**
 * Gera a string do PIX Copia e Cola conforme especificação do Banco Central do Brasil
 */
export function generatePixCopiaECola({
  pixKey,
  recipientName,
  city = 'SAO PAULO',
  amount,
  txId = '***',
  description,
}: PixPayloadParams): string {
  if (!pixKey) return '';

  const cleanKey = pixKey.trim();
  // Nome do recebedor (máx 25 chars, sem acentos, maiúsculo)
  const cleanName = (recipientName || 'ESCRITORIO ADVOCACIA')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .slice(0, 25);

  // Cidade (máx 15 chars, sem acentos, maiúsculo)
  const cleanCity = (city || 'SAO PAULO')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .slice(0, 15);

  // TxID alfanumérico simples (máx 25 caracteres)
  const cleanTxId = (txId || '***').replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || '***';

  // ID 26: Merchant Account Information
  let merchantAccount = formatEMV('00', 'br.gov.bcb.pix') + formatEMV('01', cleanKey);
  if (description) {
    merchantAccount += formatEMV('02', description.slice(0, 40));
  }

  // Montagem do payload EMV
  let payload =
    formatEMV('00', '01') + // Payload Format Indicator
    formatEMV('26', merchantAccount) + // Merchant Account Information
    formatEMV('52', '0000') + // Merchant Category Code (0000 = Geral)
    formatEMV('53', '986'); // Transaction Currency (986 = BRL Real Brasileiro)

  // Valor (opcional para PIX estático, obrigatório para cobrança com valor definido)
  if (amount && amount > 0) {
    payload += formatEMV('54', amount.toFixed(2));
  }

  payload +=
    formatEMV('58', 'BR') + // Country Code
    formatEMV('59', cleanName) + // Merchant Name
    formatEMV('60', cleanCity) + // Merchant City
    formatEMV('62', formatEMV('05', cleanTxId)) + // Reference Label / txId
    '6304'; // CRC16 Indicator (ID 63 + tamanho 04)

  const crc = calculateCrc16(payload);
  return payload + crc;
}

/**
 * Gera URL de imagem do QR Code para o payload PIX
 */
export function getPixQrCodeUrl(payload: string, size = 200): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(payload)}`;
}
