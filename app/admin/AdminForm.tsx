"use client";

import { useFormState, useFormStatus } from "react-dom";
import { saveConfigAction, type SaveState } from "./actions";
import type { SiteConfig } from "@/lib/config";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-green-600 px-6 py-2.5 font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
    >
      {pending ? "Salvando..." : "Salvar configuração"}
    </button>
  );
}

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500";

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export default function AdminForm({ initial }: { initial: SiteConfig }) {
  const [state, formAction] = useFormState<SaveState, FormData>(saveConfigAction, {});

  return (
    <form action={formAction} className="space-y-6">
      {/* --- Numeros de WhatsApp --- */}
      <Card
        title="Números de WhatsApp (divisão de tráfego)"
        hint="Até 4 números. O peso define a proporção de cliques que cada um recebe (ex: pesos 2 e 1 = 66% e 33%). Use o formato internacional só com dígitos: 55 + DDD + número."
      >
        {initial.phones.map((phone, i) => (
          <div key={i} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Número {i + 1}</span>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  name={`phone_${i}_enabled`}
                  defaultChecked={phone.enabled}
                  className="h-4 w-4"
                />
                Ativo
              </label>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-6">
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-500">Apelido</label>
                <input name={`phone_${i}_label`} defaultValue={phone.label} className={inputClass} />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs text-slate-500">Número (ex: 5511999998888)</label>
                <input
                  name={`phone_${i}_number`}
                  defaultValue={phone.number}
                  inputMode="numeric"
                  placeholder="5511999998888"
                  className={inputClass}
                  onInput={(e) => {
                    // Marca "Ativo" automaticamente ao digitar um número.
                    const form = e.currentTarget.form;
                    const cb = form?.elements.namedItem(
                      `phone_${i}_enabled`
                    ) as HTMLInputElement | null;
                    if (cb && e.currentTarget.value.replace(/\D/g, "")) {
                      cb.checked = true;
                    }
                  }}
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-xs text-slate-500">Peso</label>
                <input
                  name={`phone_${i}_weight`}
                  type="number"
                  min={1}
                  defaultValue={phone.weight}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        ))}
        <div>
          <label className="block text-sm font-medium text-slate-700">Mensagem pré-preenchida</label>
          <input name="whatsappMessage" defaultValue={initial.whatsappMessage} className={inputClass} />
        </div>
      </Card>

      {/* --- Google Ads --- */}
      <Card
        title="Google Ads"
        hint="A conversão é disparada quando o visitante conclui o fluxo de chat (WhatsApp)."
      >
        <div>
          <label className="block text-sm font-medium text-slate-700">ID do Google Ads (ex: AW-123456789)</label>
          <input name="googleAdsId" defaultValue={initial.googleAdsId} placeholder="AW-123456789" className={inputClass} />
          <p className="mt-1 text-xs text-slate-500">
            Pode colar só o ID ou o snippet inteiro do Google — o sistema extrai o AW- sozinho.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Rótulo da conversão (opcional)</label>
          <input name="conversionLabel" defaultValue={initial.conversionLabel} placeholder="AbCdEfGhIjKl" className={inputClass} />
          <p className="mt-1 text-xs text-slate-500">
            Só necessário para registrar a conversão no clique. Fica em Google Ads → Conversões → sua ação (o código depois da barra em “AW-123/AbCd…”).
          </p>
        </div>
      </Card>

      <div className="flex items-center gap-4">
        <SubmitButton />
        {state.ok && <span className="text-sm text-green-700">Salvo com sucesso!</span>}
        {state.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}
