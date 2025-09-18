import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export const useUserPlan = (debug = false) => {
  const [state, setState] = useState({
    plan: { planKey: "BASIC", planName: "Basic", songLimit: 10 },
    loading: true,
    source: "fallback"
  });

  const FALLBACK = { planKey: "BASIC", planName: "Basic", songLimit: 10 };

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const { data: auth, error: aerr } = await supabase.auth.getUser();
        if (aerr) throw aerr;
        const user = auth?.user;
        if (!user) {
          if (mounted) setState({ plan: FALLBACK, loading: false, source: "fallback" });
          return;
        }

        if (debug) console.log("[useUserPlan] Buscando plano para usuário:", user.id);

        // 1) BUSCA ASSINATURAS DO USUÁRIO
        const { data: subs, error: sErr } = await supabase
          .from("user_subscriptions")
          .select("id, plan_id, status, created_at")
          .eq("user_id", user.id);

        if (sErr) throw sErr;

        const now = Date.now();
        const candidates = (subs ?? []).filter((s) => {
          const status = String(s?.status ?? "").toLowerCase();
          const statusOk = ["active", "trialing"].includes(status);
          return statusOk && s?.plan_id;
        });

        candidates.sort((a, b) => {
          const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
          const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return cb - ca; // Mais recente primeiro
        });

        const chosen = candidates[0];

        if (chosen?.plan_id) {
          if (debug) console.log("[useUserPlan] Assinatura ativa encontrada:", chosen);

          // 2) BUSCA O PLANO NA TABELA subscription_plans
          const { data: planRow, error: pErr } = await supabase
            .from("subscription_plans")
            .select("*")
            .eq("id", chosen.plan_id)
            .maybeSingle();

          if (pErr) throw pErr;

          if (planRow) {
            // Tente vários nomes de coluna para o limite
            const limit = Number(planRow.song_limit ?? planRow.max_tracks ?? planRow.limit ?? 10);
            const name = String(planRow.name ?? "Basic");
            const key = String(planRow.code ?? name)
              .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove acento
              .toUpperCase().replace(/\s+/g, "_");

            const plan = { planKey: key, planName: name, songLimit: limit };
            if (mounted) setState({ plan, loading: false, source: "subscription" });
            if (debug) console.debug("[useUserPlan] via subscription_plans:", plan);
            return;
          }
        }

        // 3) FALLBACK: user_profiles (se você guarda plano/limite lá)
        const { data: profile, error: profErr } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (!profErr && profile) {
          const limit = Number(profile.song_limit ?? profile.max_tracks ?? profile.limit ?? 10);
          const name = String(profile.plan_name ?? profile.plan ?? "Basic");
          const key = String(profile.plan_code ?? name)
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .toUpperCase().replace(/\s+/g, "_");

          const plan = { planKey: key, planName: name, songLimit: limit };
          if (mounted) setState({ plan, loading: false, source: "profile" });
          if (debug) console.debug("[useUserPlan] via user_profiles:", plan);
          return;
        }

        // 4) Último recurso
        if (mounted) setState({ plan: FALLBACK, loading: false, source: "fallback" });
        if (debug) console.warn("[useUserPlan] FALLBACK");
      } catch (e) {
        if (debug) console.warn("[useUserPlan] erro:", e);
        if (mounted) setState({ plan: FALLBACK, loading: false, source: "fallback" });
      }
    }

    load();
    return () => { mounted = false; };
  }, [debug]);

  return state;
};