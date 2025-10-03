import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";

const FALLBACK = { planCode: "BASIC", planName: "Basic", songLimit: 10 };
const BLOCKED_FALLBACK = { planCode: "BLOCKED", planName: "Plano Bloqueado", songLimit: 0 };

export const useEffectivePlan = (debug = false) => {
  const [state, setState] = useState({ plan: FALLBACK, loading: true });

  const loadPlan = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) { 
        setState({ plan: FALLBACK, loading: false }); 
        return; 
      }

      console.log("[useEffectivePlan] 🔍 Buscando plano atualizado para usuário:", user.id);

      // 1) BUSCA ASSINATURAS ATIVAS DO USUÁRIO (método mais confiável)
      const { data: subs, error: sErr } = await supabase
        .from("user_subscriptions")
        .select("id, plan_id, status, created_at")
        .eq("user_id", user.id);

      console.log("[useEffectivePlan] user_subscriptions encontradas:", subs?.length || 0);

      if (!sErr && subs?.length > 0) {
        const now = Date.now();
        const activeSubs = subs.filter((s) => {
          const status = String(s?.status ?? "").toLowerCase();
          return ["active", "trialing"].includes(status) && s?.plan_id;
        });

        activeSubs.sort((a, b) => {
          const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
          const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return cb - ca; // Mais recente primeiro
        });

        const chosen = activeSubs[0];
        console.log("[useEffectivePlan] Assinatura ativa mais recente:", chosen);

        if (chosen?.plan_id) {
          // 2) BUSCA AS INFORMAÇÕES DO PLANO
          const { data: planRow, error: pErr } = await supabase
            .from("subscription_plans")
            .select("*")
            .eq("id", chosen.plan_id)
            .maybeSingle();

          console.log("[useEffectivePlan] subscription_plan:", planRow);

          if (!pErr && planRow) {
            const limit = Number(planRow.song_limit ?? planRow.max_tracks ?? planRow.limit ?? 10);
            const name = String(planRow.name ?? "Basic");
            const code = String(planRow.code ?? name);
            const key = code
              .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove acento
              .toUpperCase().replace(/\s+/g, "_");

            // Detectar se é plano bloqueado
            const isBlocked = code.toUpperCase().includes('BLOCKED') || 
                             code.toUpperCase().includes('BLOQUEADO') ||
                             name.toUpperCase().includes('BLOCKED') ||
                             name.toUpperCase().includes('BLOQUEADO');

            const plan = { 
              planCode: key, 
              planName: name, 
              songLimit: isBlocked ? 0 : limit 
            };
            setState({ plan, loading: false });
            console.log("[useEffectivePlan] ✅ Plano atualizado via subscription_plans:", {
              ...plan,
              isBlocked,
              detectedFrom: 'subscription_plans'
            });
            return;
          }
        }
      }

      // 3) FALLBACK: user_profiles
      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select("plan_name, song_limit")
        .eq("user_id", user.id)
        .maybeSingle();

      console.log("[useEffectivePlan] user_profiles fallback:", profileData);

      const plan = profileData && profileData.plan_name
        ? { 
            planCode: profileData.plan_name.toUpperCase().replace('PLANO ', ''),
            planName: profileData.plan_name,
            songLimit: Number(profileData.song_limit) || 10
          }
        : FALLBACK;

      setState({ plan, loading: false });
      console.log("[useEffectivePlan] ✅ Plano final (with fallback):", plan);

    } catch (e) {
      console.warn("[useEffectivePlan] ❌ Erro ao carregar plano:", e);
      setState({ plan: FALLBACK, loading: false });
    }
  }, [debug]);

  // Função para forçar refresh do plano
  const refreshPlan = useCallback(() => {
    console.log("[useEffectivePlan] 🔄 Refresh manual solicitado");
    loadPlan();
  }, [loadPlan]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  return { ...state, refreshPlan };
};
