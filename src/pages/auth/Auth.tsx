import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Lock, User } from "lucide-react";
import { toast } from "sonner";

export default function Auth() {
  const { session, loading } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#f3f3f3] text-neutral-500">Loading…</div>;
  if (session) return <Navigate to="/app" replace />;

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    nav("/app");
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name }, emailRedirectTo: window.location.origin + "/app" },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created. An admin must assign your role before you can use the app.");
  };

  return (
    <div className="min-h-screen bg-[#f3f3f3] p-4 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1400px] gap-6 lg:grid-cols-2 lg:gap-8">
        {/* LEFT — form */}
        <div className="flex items-center justify-center px-4 py-8 lg:px-12">
          <div className="w-full max-w-sm">
            {/* Brand */}
            <div className="mb-12 flex items-center gap-2">
              <svg viewBox="0 0 40 40" className="h-9 w-9 text-neutral-900" fill="currentColor" aria-hidden>
                <path d="M20 4 L36 34 L28 34 L20 18 L12 34 L4 34 Z" />
                <path d="M20 22 L24 30 L16 30 Z" fill="hsl(20 60% 45%)" />
              </svg>
              <span className="text-lg font-semibold tracking-tight text-neutral-900">Sidharth</span>
            </div>

            <h1 className="mb-8 text-4xl font-bold tracking-tight text-neutral-900">
              {mode === "signin" ? "Sign in" : "Sign up"}
            </h1>

            {mode === "signin" ? (
              <form className="space-y-5" onSubmit={signIn}>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-neutral-700">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    <Input
                      type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="Johndoe@gmail.com"
                      className="h-12 rounded-xl border-neutral-200 bg-white pl-10 text-sm shadow-sm placeholder:text-neutral-400 focus-visible:ring-neutral-900"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-neutral-700">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    <Input
                      type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••"
                      className="h-12 rounded-xl border-neutral-200 bg-white pl-10 text-sm shadow-sm placeholder:text-neutral-400 focus-visible:ring-neutral-900"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Checkbox id="remember" className="rounded-[4px] border-neutral-300 data-[state=checked]:bg-neutral-900 data-[state=checked]:border-neutral-900" />
                  <label htmlFor="remember" className="text-sm text-neutral-700">Remember me</label>
                </div>

                <Button
                  type="submit" disabled={busy}
                  className="h-12 w-full rounded-xl bg-neutral-900 text-sm font-medium text-white shadow-sm hover:bg-neutral-800"
                >
                  {busy ? "Signing in…" : "Sign in"}
                </Button>

                <div className="space-y-1 pt-1 text-sm">
                  <p className="text-neutral-500">
                    Don't have an account?{" "}
                    <button type="button" onClick={() => setMode("signup")} className="font-medium text-neutral-900 hover:underline">
                      Sign up
                    </button>
                  </p>
                  <p>
                    <button type="button" className="text-neutral-500 hover:text-neutral-900">Forgot Password</button>
                  </p>
                </div>
              </form>
            ) : (
              <form className="space-y-5" onSubmit={signUp}>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-neutral-700">Full name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    <Input
                      required value={name} onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className="h-12 rounded-xl border-neutral-200 bg-white pl-10 text-sm shadow-sm placeholder:text-neutral-400 focus-visible:ring-neutral-900"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-neutral-700">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    <Input
                      type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="Johndoe@gmail.com"
                      className="h-12 rounded-xl border-neutral-200 bg-white pl-10 text-sm shadow-sm placeholder:text-neutral-400 focus-visible:ring-neutral-900"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-neutral-700">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    <Input
                      type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••"
                      className="h-12 rounded-xl border-neutral-200 bg-white pl-10 text-sm shadow-sm placeholder:text-neutral-400 focus-visible:ring-neutral-900"
                    />
                  </div>
                </div>

                <Button
                  type="submit" disabled={busy}
                  className="h-12 w-full rounded-xl bg-neutral-900 text-sm font-medium text-white shadow-sm hover:bg-neutral-800"
                >
                  {busy ? "Creating…" : "Create account"}
                </Button>

                <p className="text-sm text-neutral-500">
                  Already have an account?{" "}
                  <button type="button" onClick={() => setMode("signin")} className="font-medium text-neutral-900 hover:underline">
                    Sign in
                  </button>
                </p>
                <p className="text-xs text-neutral-400">First account becomes admin. Subsequent accounts need role assignment.</p>
              </form>
            )}
          </div>
        </div>

        {/* RIGHT — dark hero card */}
        <div className="relative hidden overflow-hidden rounded-[28px] bg-[#0a0a0a] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          {/* Decorative diagonal beams */}
          <div className="pointer-events-none absolute -right-20 top-0 h-[120%] w-[60%] rotate-[18deg] bg-gradient-to-b from-white/5 via-emerald-500/10 to-transparent blur-2xl" />
          <div className="pointer-events-none absolute -right-10 top-10 h-[110%] w-px rotate-[18deg] bg-gradient-to-b from-emerald-300/60 via-emerald-300/10 to-transparent" />
          <div className="pointer-events-none absolute right-24 top-20 h-[110%] w-px rotate-[18deg] bg-gradient-to-b from-white/40 via-white/5 to-transparent" />

          {/* Big A monogram */}
          <div className="relative flex flex-1 items-center justify-center">
            <svg viewBox="0 0 200 200" className="h-72 w-72" aria-hidden>
              <defs>
                <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3a3a3a" />
                  <stop offset="100%" stopColor="#1a1a1a" />
                </linearGradient>
              </defs>
              <path d="M100 20 L180 170 L140 170 L100 90 L60 170 L20 170 Z" fill="url(#aGrad)" />
              <path d="M100 110 L120 150 L80 150 Z" fill="hsl(20 55% 40%)" />
            </svg>
          </div>

          <div className="relative space-y-6">
            <div>
              <p className="mb-2 text-sm text-white/60">Sidharth Creation</p>
              <h2 className="mb-3 text-3xl font-bold tracking-tight">Welcome to Sidharth</h2>
              <p className="max-w-md text-sm leading-relaxed text-white/70">
                Sidharth helps textile teams run organized, well-tracked operations — from quality and colour mastery to dispatch and billing. Join us and start running your fabric business today.
              </p>
              <p className="mt-4 text-sm text-white/70">More than 17k people joined us, it's your turn</p>
            </div>

            <div className="rounded-2xl bg-white/5 p-6 backdrop-blur-sm ring-1 ring-white/10">
              <h3 className="mb-3 text-lg font-semibold leading-snug">Get the right stock to the right customer — instantly</h3>
              <div className="flex items-end justify-between gap-4">
                <p className="max-w-xs text-sm text-white/60">
                  Be among the first teams to experience the easiest way to run a textile operation.
                </p>
                <div className="flex -space-x-2">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-rose-300 to-rose-500 ring-2 ring-[#0a0a0a]" />
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 ring-2 ring-[#0a0a0a]" />
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-neutral-700 text-[10px] font-semibold text-white ring-2 ring-[#0a0a0a]">+2</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}