import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "inventory" | "salesman" | "dispatch" | "billing";

interface AuthCtx {
  session: Session | null;
  user: User | null;
  profile: { id: string; name: string; email?: string | null } | null;
  roles: AppRole[];
  activeRole: AppRole | null;
  setActiveRole: (r: AppRole) => void;
  loading: boolean;
  signOut: () => Promise<void>;
  hasRole: (r: AppRole | AppRole[]) => boolean;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthCtx["profile"]>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [activeRole, setActiveRoleState] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = async (uid: string) => {
    const [{ data: prof }, { data: rs }] = await Promise.all([
      supabase.from("profiles").select("id,name,email").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile(prof ?? null);
    const list = (rs ?? []).map((r: any) => r.role as AppRole);
    setRoles(list);
    const stored = localStorage.getItem("ll_active_role") as AppRole | null;
    setActiveRoleState(stored && list.includes(stored) ? stored : list[0] ?? null);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => loadUserData(sess.user.id), 0);
      } else {
        setProfile(null); setRoles([]); setActiveRoleState(null);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) loadUserData(data.session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const setActiveRole = (r: AppRole) => {
    localStorage.setItem("ll_active_role", r);
    setActiveRoleState(r);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("ll_active_role");
  };

  const hasRole = (r: AppRole | AppRole[]) => {
    const arr = Array.isArray(r) ? r : [r];
    if (roles.includes("admin")) return true;
    return arr.some((x) => roles.includes(x));
  };

  return (
    <Ctx.Provider value={{ session, user, profile, roles, activeRole, setActiveRole, loading, signOut, hasRole }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside provider");
  return v;
};