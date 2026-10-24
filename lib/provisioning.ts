import { getTransaction } from "./pix";
import { normalizeProvider } from "./pix";
import { renewCustomer, removeCredits, addCredits, getUserCredits } from "./sigma";
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

  // Custo em créditos do revendedor dono do cliente.
  const pkg = getPackage(renewal.package_id);
  const credits = pkg ? packageCredits(pkg) : 0;
  const resellerId = renewal.reseller_id;
  const chargeReseller = Boolean(resellerId) && credits > 0;

  // Movimentação de créditos registrada na transação (saldo antes/depois).
  let creditsCharged: number | null = null;
  let balBefore: number | null = null;
  let balAfter: number | null = null;

  // REGRA DE NEGÓCIO: revendedor sem saldo NÃO renova. Checamos o saldo e
  // debitamos ANTES de renovar — a renovação só acontece se o crédito saiu.
  if (chargeReseller) {
    // Bloqueio explícito por saldo. credits === null = não foi possível
    // determinar (ex.: conta ilimitada) → não bloqueia por isso.
    const bal = await getUserCredits(resellerId!);
    balBefore = bal.credits;
    if (bal.ok && bal.credits !== null && bal.credits < credits) {
      await releaseRenewal(transactionId);
      console.error(
        `Renovação bloqueada: revendedor ${resellerId} tem ${bal.credits} crédito(s), precisa de ${credits} (tx ${transactionId}).`
      );
      return { ok: false, status: 402, error: "Revendedor sem créditos suficientes." };
    }
    // Debita primeiro. Se falhar (inclui saldo insuficiente no lado do Sigma),
    // NÃO renova.
    const deb = await removeCredits(resellerId!, credits, {
      reference: transactionId,
      note: `Renovação ${renewal.username} (${renewal.package_label ?? renewal.package_id})`,
    });
    if (!deb.ok) {
      await releaseRenewal(transactionId);
      console.error("removeCredits:", deb.error, `(tx ${transactionId})`);
      return {
        ok: false,
        status: 402,
        error: deb.error ?? "Não foi possível debitar os créditos do revendedor.",
      };
    }
    creditsCharged = credits;
    // Saldo DEPOIS do débito (para registrar a movimentação na transação).
    balAfter = (await getUserCredits(resellerId!)).credits;
  }

  const res = await renewCustomer(renewal.customer_id, renewal.package_id);
  if (!res.ok) {
    // A renovação falhou DEPOIS do débito → estorna para não cobrar à toa.
    if (chargeReseller) {
      const ref = await addCredits(resellerId!, credits, {
        reference: transactionId,
        note: `Estorno (renovação falhou) ${renewal.username}`,
      });
      if (!ref.ok) console.error("addCredits (estorno):", ref.error, `(tx ${transactionId})`);
    }
    await releaseRenewal(transactionId); // libera para nova tentativa
    return { ok: false, status: 502, error: res.error };
  }

  await markRenewed(transactionId, {
    creditsCharged,
    resellerCreditsBefore: balBefore,
    resellerCreditsAfter: balAfter,
  });

  return { ok: true, status: 200, amount: renewal.amount };
}
