import { getTransaction } from "./fastdepix";
import { renewCustomer } from "./sigma";
import {
  getRenewal,
  claimRenewal,
  releaseRenewal,
  markRenewed,
} from "./renewals";

// Renova o cliente de forma IDEMPOTENTE. Pode ser chamado pelo polling do
// navegador E pelo webhook do provedor ao mesmo tempo — o claim atômico
// garante que a renovação aconteça uma única vez.
export async function provisionRenewal(
  transactionId: string
): Promise<{ ok: boolean; status: number; error?: string; amount?: number }> {
  const renewal = await getRenewal(transactionId);
  if (!renewal) return { ok: false, status: 404, error: "Renovação não encontrada." };

  // Já renovado: devolve sucesso (idempotência).
  if (renewal.provisioned) return { ok: true, status: 200, amount: renewal.amount };

  // Reconfirma o pagamento NA FONTE (não confia só no cliente).
  let tx;
  try {
    tx = await getTransaction(transactionId);
  } catch (e) {
    return { ok: false, status: 502, error: (e as Error).message };
  }
  if (tx.status !== "paid" && tx.status !== "approved") {
    return { ok: false, status: 402, error: "Pagamento ainda não confirmado." };
  }
  if (Math.abs(Number(tx.amount) - Number(renewal.amount)) > 0.01) {
    return { ok: false, status: 400, error: "Valor pago diverge do pedido." };
  }

  // Claim atômico: só um chamador renova.
  const claimed = await claimRenewal(transactionId);
  if (!claimed) {
    const again = await getRenewal(transactionId);
    if (again?.provisioned) return { ok: true, status: 200, amount: again.amount };
    return { ok: false, status: 409, error: "Renovação em andamento." };
  }

  const res = await renewCustomer(renewal.customer_id, renewal.package_id);
  if (!res.ok) {
    await releaseRenewal(transactionId); // libera para nova tentativa
    return { ok: false, status: 502, error: res.error };
  }

  await markRenewed(transactionId);
  return { ok: true, status: 200, amount: renewal.amount };
}
