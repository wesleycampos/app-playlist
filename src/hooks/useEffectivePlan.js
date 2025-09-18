import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const FALLBACK = { planCode: "BASIC", planName: "Basic", songLimit: 10 };

export const useEffectivePlan = (debug = false) => {
  const [state, setState] = useState({ plan: FALLBACK, loading: true });

  useEffect(() => {
    let mounted = true;
    
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user;
        if (!user) { 
          if (mounted) setState({ plan: FALLBACK, loading: false }); 
          return; 
        }

        // Busca primeiro em user_profiles (fallback temporário)
        const { data: profileData, error: profileError } = await supabase
          .from("user_profiles")
          .select("plan_name, song_limit")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        const plan = profileData && profileData.plan_name
          ? { 
              planCode: profileData.plan_name.toUpperCase().replace('PLANO ', ''),
              planName: profileData.plan_name,
              songLimit: Number(profileData.song_limit) || 10
            }
          : FALLBACK;

        if (mounted) setState({ plan, loading: false });
        if (debug) console.debug("[useEffectivePlan]", plan);
      } catch (e) {
        if (mounted) setState({ plan: FALLBACK, loading: false });
        if (debug) console.warn("[useEffectivePlan] fallback:", e);
      }
    })();
    
    return () => { mounted = false; };
  }, [debug]);

  return state;
};
