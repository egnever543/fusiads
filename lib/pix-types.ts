// Tipos compartilhados entre a camada de PIX e os adaptadores de provedor.

// Status normalizado (único para todos os provedores).
export type PixStatus = "paid" | "pending" | "failed" | "expired" | "unknown";

export type PixTransaction = {
  id: string; // id usado para consultar o status depois (por provedor)
  amount: number; // em REAIS (normalizado)
  status: PixStatus;
  qrCode: string | null; // imagem do QR (URL ou data URL)
  qrCodeText: string | null; // copia-e-cola (EMV)
  expiresAt: string | null;
};

export type CreateParams = {
  amount: number; // em REAIS
  phone?: string;
  name?: string;
  notificationUrl?: string;
  referenceId?: string; // id próprio, refletido no webhook (quando o provedor suporta)
};
