import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  ShieldCheck,
  WifiOff,
} from "lucide-react";
import { useEffect } from "react";

import { startLogin } from "@/const";

function setRobots(content: string) {
  let tag = document.querySelector('meta[name="robots"]');
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", "robots");
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

export default function PublicLandingPage() {
  useEffect(() => {
    document.title = "Elegex — Reliable field service operations";
    setRobots("index,follow");
  }, []);

  return (
    <main className="min-h-screen overflow-hidden bg-[#F6F8FC] text-[#12264F]">
      <section className="relative isolate overflow-hidden bg-[#102447] pb-24 pt-6 text-white sm:pb-32">
        <div className="absolute inset-0 -z-10 opacity-70 [background-image:radial-gradient(circle_at_84%_14%,rgba(68,131,255,0.4),transparent_28%),radial-gradient(circle_at_12%_82%,rgba(36,96,219,0.35),transparent_31%)]" />
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <img
              src="/manus-storage/elegex-brand-mark_bd91b904.png"
              alt=""
              className="h-10 w-10 rounded-xl"
            />
            <span className="font-[Manrope] text-lg font-extrabold tracking-tight">
              Elegex
            </span>
          </div>
          <button
            onClick={startLogin}
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/20 active:scale-[0.97]"
          >
            Sign in
          </button>
        </nav>
        <div className="mx-auto grid max-w-6xl gap-14 px-5 pt-20 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full border border-[#80B2FF]/30 bg-[#1E54B9]/35 px-3 py-1 text-xs font-bold tracking-[0.13em] text-[#BCD4FF]">
              FIELD SERVICE, MADE DEPENDABLE
            </p>
            <h1 className="mt-6 max-w-3xl font-[Manrope] text-4xl font-extrabold leading-[1.05] tracking-[-0.04em] sm:text-6xl">
              Run every field visit with calm, accountable control.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#D5E3FF] sm:text-lg">
              Elegex joins dispatch, evidence, commercial review, and
              operational readiness in one tenant-scoped workspace designed for
              office teams and crews in the field.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={startLogin}
                className="inline-flex items-center justify-center rounded-xl bg-[#61A0FF] px-5 py-3 text-sm font-bold text-[#102447] transition hover:bg-[#8BBCFF] active:scale-[0.97]"
              >
                Open secure workspace <ArrowRight className="ml-2 h-4 w-4" />
              </button>
              <a
                href="#operations"
                className="inline-flex items-center justify-center rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                See the operating model
              </a>
            </div>
          </div>
          <div className="rounded-[2rem] border border-white/15 bg-white/[0.07] p-4 shadow-[0_32px_90px_rgba(0,0,0,0.27)] backdrop-blur sm:p-6">
            <div className="rounded-2xl bg-[#F8FAFF] p-5 text-[#12264F] sm:p-6">
              <div className="flex items-center justify-between border-b border-[#E4EAF4] pb-4">
                <div>
                  <p className="text-xs font-bold tracking-[0.12em] text-[#53709F]">
                    TODAY’S CONTROL ROOM
                  </p>
                  <p className="mt-1 font-[Manrope] text-xl font-bold">
                    Jobs in motion
                  </p>
                </div>
                <span className="rounded-full bg-[#E5F6EB] px-3 py-1 text-xs font-bold text-[#187644]">
                  Synced
                </span>
              </div>
              <div className="mt-5 grid gap-3">
                {[
                  ["09:30", "Electrical inspection", "Crew on site"],
                  ["11:00", "Pump service", "Evidence pending"],
                  ["14:15", "Safety handover", "Dispatch confirmed"],
                ].map(([time, job, status]) => (
                  <div
                    key={job}
                    className="flex items-center gap-4 rounded-xl border border-[#E4EAF4] p-3"
                  >
                    <span className="w-10 text-sm font-bold text-[#195FE6]">
                      {time}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{job}</p>
                      <p className="mt-0.5 text-xs text-[#667085]">{status}</p>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-[#48A778]" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      <section id="operations" className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-extrabold tracking-[0.14em] text-[#195FE6]">
            ONE OPERATING RHYTHM
          </p>
          <h2 className="mt-3 font-[Manrope] text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">
            From dispatched work to office-reviewed decisions.
          </h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            [
              ClipboardCheck,
              "Guide field work",
              "Structured job cards, evidence capture, and clear completion gates keep crews focused on the work in front of them.",
            ],
            [
              WifiOff,
              "Recover with confidence",
              "Local queue recovery keeps field actions safe through temporary connectivity loss, then replays them with idempotent identifiers.",
            ],
            [
              ShieldCheck,
              "Protect commercial control",
              "Foreman workflows stay free of prices and invoice references, while office users retain their appropriate review controls.",
            ],
          ].map(([Icon, title, body]) => (
            <article
              key={title as string}
              className="rounded-3xl border border-[#E0E8F4] bg-white p-6 shadow-[0_12px_30px_rgba(27,55,103,0.05)]"
            >
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#E9F1FF] text-[#195FE6]">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-[Manrope] text-lg font-bold">
                {title as string}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#60708D]">
                {body as string}
              </p>
            </article>
          ))}
        </div>
      </section>
      <section className="border-t border-[#E0E8F4] bg-white py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-5 px-5 sm:flex-row sm:items-center sm:px-8">
          <div>
            <p className="font-[Manrope] text-xl font-bold">
              Built for the pace of field operations.
            </p>
            <p className="mt-1 text-sm text-[#667085]">
              Secure access, accountable workflows, and clear human review.
            </p>
          </div>
          <button
            onClick={startLogin}
            className="rounded-xl bg-[#195FE6] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#174FC1] active:scale-[0.97]"
          >
            Enter Elegex
          </button>
        </div>
      </section>
    </main>
  );
}
