import { ShieldCheck, UsersRound } from "lucide-react";
import { useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

export default function DemoLoginPage() {
  const [, setLocation] = useLocation();
  const personas = trpc.auth.demoPersonas.useQuery();
  const login = trpc.auth.demoLogin.useMutation({
    onSuccess: () => setLocation("/"),
  });

  return (
    <main className="min-h-screen bg-[#F5F7FB] px-4 py-10 text-[#14213D] sm:px-8">
      <section className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_1fr]">
        <div className="rounded-[2rem] bg-[#10274D] p-8 text-white shadow-[0_30px_80px_rgba(16,39,77,0.25)] sm:p-12">
          <div className="flex items-center gap-3 text-sm font-semibold tracking-[0.18em] text-[#9FC2FF]">
            <ShieldCheck className="h-5 w-5" />
            ELEGEX DEMO ENVIRONMENT
          </div>
          <h1 className="mt-10 max-w-lg text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
            Explore field service without sharing a password.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-[#D5E4FF]">
            Each persona receives a signed session and a real role in an
            isolated synthetic workspace. Demo data is clearly labelled and is
            never a production account.
          </p>
          <div className="mt-10 flex items-center gap-3 text-sm text-[#BFD7FF]">
            <UsersRound className="h-5 w-5" />
            Select a persona to see the role-scoped experience.
          </div>
        </div>
        <div className="rounded-[2rem] border border-[#E1E8F3] bg-white p-6 shadow-[0_20px_60px_rgba(24,54,108,0.10)] sm:p-8">
          <p className="text-xs font-bold tracking-[0.16em] text-[#195FE6]">
            CHOOSE A DEMO ROLE
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em]">
            Sign in to Elegex
          </h2>
          <div className="mt-7 space-y-3">
            {personas.data?.map(persona => (
              <button
                key={persona.id}
                type="button"
                disabled={login.isPending}
                onClick={() => login.mutate({ personaId: persona.id })}
                className="w-full rounded-2xl border border-[#E1E8F3] p-4 text-left transition hover:border-[#195FE6] hover:bg-[#F5F8FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#195FE6] disabled:opacity-60"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-[#14213D]">
                    {persona.name}
                  </span>
                  <span className="rounded-full bg-[#EAF1FF] px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-[#195FE6]">
                    {persona.role}
                  </span>
                </span>
                <span className="mt-1 block text-sm text-[#667085]">
                  {persona.title}
                </span>
                <span className="mt-2 block text-sm leading-5 text-[#4B5C7A]">
                  {persona.description}
                </span>
              </button>
            ))}
          </div>
          {personas.isError ? (
            <p className="mt-5 rounded-xl bg-[#FFF2F2] p-3 text-sm text-[#B42318]">
              Demo sign-in is unavailable for this deployment.
            </p>
          ) : null}
          {login.error ? (
            <p className="mt-5 rounded-xl bg-[#FFF2F2] p-3 text-sm text-[#B42318]">
              {login.error.message}
            </p>
          ) : null}
          <Button
            variant="outline"
            className="mt-6 w-full"
            onClick={() => setLocation("/")}
          >
            Return to public entry
          </Button>
        </div>
      </section>
    </main>
  );
}
