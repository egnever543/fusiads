import { getTransaction } from "./pix";
import { normalizeProvider } from "./pix";
import { renewCustomer, removeCredits } from "./sigma";
import { getPackage, packageCredits } from "./packages";
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

  // Reconfirma o pagamento NA FONTE (não confia só no cliente), usando o
  // provedor com que a cobrança foi criada.
  let tx;
  try {
    tx = await getTransaction(normalizeProvider(renewal.provider), transactionId);
  } catch (e) {
    return { ok: false, status: 502, error: (e as Error).message };
  }
  if (tx.status !== "paid") {
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

  // Debita os créditos do revendedor dono do cliente (não da conta-mãe).
  // Best-effort: a renovação já aconteceu e foi paga, então uma falha aqui NÃO
  // desfaz nem repete a renovação — apenas registra o erro para conciliação.
  try {
    const pkg = getPackage(renewal.package_id);
    const credits = pkg ? packageCredits(pkg) : 0;
    if (renewal.reseller_id && credits > 0) {
      const deb = await removeCredits(renewal.reseller_id, credits, {
        reference: transactionId,
        note: `Renovação ${renewal.username} (${renewal.package_label ?? renewal.package_id})`,
      });
      if (!deb.ok) console.error("removeCredits:", deb.error);
    }
  } catch (e) {
    console.error("removeCredits exception:", (e as Error).message);
  }

  return { ok: true, status: 200, amount: renewal.amount };
}
