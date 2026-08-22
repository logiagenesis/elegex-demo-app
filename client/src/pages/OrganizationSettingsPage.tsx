import { Loader2, Settings2, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatOrganizationMoney } from "@/lib/organizationFormat";
import { trpc } from "@/lib/trpc";

const defaultVocabulary = [
  "DB board",
  "COC",
  "SANS 10142",
  "load shedding",
  "Eskom",
  "fault finding",
  "geyser",
  "earth leakage",
];

export default function OrganizationSettingsPage() {
  const workspace = trpc.elegex.workspace.current.useQuery();
  const operational = trpc.elegex.workspace.operationalSettings.useQuery();
  const utils = trpc.useUtils();
  const save = trpc.elegex.admin.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Organization operating settings saved");
      void utils.elegex.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const [name, setName] = useState("");
  const [locale, setLocale] = useState("");
  const [currency, setCurrency] = useState("");
  const [timezone, setTimezone] = useState("");
  const [vocabulary, setVocabulary] = useState("");
  const settings = operational.data?.settings as any;
  const tradeVocabulary = useMemo(() => {
    const configured = (settings?.metadata as any)?.tradeVocabulary;
    return Array.isArray(configured) ? configured : defaultVocabulary;
  }, [settings?.metadata]);
  const currentName = name || workspace.data?.organizationName || "";
  const currentLocale = locale || settings?.locale || "en-ZA";
  const currentCurrency = currency || settings?.currency || "ZAR";
  const currentTimezone =
    timezone || settings?.timezone || "Africa/Johannesburg";
  const currentVocabulary = vocabulary || tradeVocabulary.join(", ");

  if (workspace.isLoading || operational.isLoading)
    return (
      <div className="grid min-h-[50vh] place-items-center text-sm font-medium text-[#667085]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#195FE6]" />
        Loading organization settings…
      </div>
    );

  const saveSettings = () => {
    const nextVocabulary = currentVocabulary
      .split(",")
      .map(item => item.trim())
      .filter(Boolean);
    if (!currentName.trim())
      return toast.error("Organization name is required");
    if (!/^[A-Z]{3}$/.test(currentCurrency))
      return toast.error("Use a three-letter ISO currency code, such as ZAR");
    if (!nextVocabulary.length)
      return toast.error("Add at least one trade term");
    save.mutate({
      name: currentName.trim(),
      locale: currentLocale.trim(),
      currency: currentCurrency.trim(),
      timezone: currentTimezone.trim(),
      tradeVocabulary: nextVocabulary,
    });
  };

  return (
    <div className="max-w-5xl">
      <header className="mb-7">
        <p className="elegex-eyebrow">ORGANIZATION OPERATING PROFILE</p>
        <h1 className="elegex-page-title mt-2">
          Locale and field-service settings
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#667085]">
          These tenant-scoped settings control presentation rather than
          persistence: source amounts remain numeric and timestamps remain UTC
          while each workspace chooses its operating context.
        </p>
      </header>
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="elegex-card p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#EAF1FF] text-[#195FE6]">
              <Settings2 className="h-5 w-5" />
            </span>
            <div>
              <p className="elegex-eyebrow">PRESENTATION CONTRACT</p>
              <h2 className="mt-1 text-lg font-semibold text-[#14213D]">
                Organization defaults
              </h2>
            </div>
          </div>
          <div className="mt-6 grid gap-4">
            <div className="grid gap-2">
              <Label>Organization name</Label>
              <Input
                value={currentName}
                onChange={event => setName(event.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>Locale</Label>
                <Input
                  value={currentLocale}
                  onChange={event => setLocale(event.target.value)}
                  placeholder="en-ZA"
                />
              </div>
              <div className="grid gap-2">
                <Label>Currency</Label>
                <Input
                  value={currentCurrency}
                  onChange={event =>
                    setCurrency(event.target.value.toUpperCase())
                  }
                  placeholder="ZAR"
                  maxLength={3}
                />
              </div>
              <div className="grid gap-2">
                <Label>Timezone</Label>
                <Input
                  value={currentTimezone}
                  onChange={event => setTimezone(event.target.value)}
                  placeholder="Africa/Johannesburg"
                />
              </div>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-[#CFE0FF] bg-[#F6F9FF] p-4">
            <p className="text-xs font-bold tracking-[0.12em] text-[#195FE6]">
              LIVE FORMAT PREVIEW
            </p>
            <p className="mt-2 text-lg font-semibold text-[#14213D]">
              {formatOrganizationMoney(1234.56, {
                locale: currentLocale,
                currency: currentCurrency,
                timezone: currentTimezone,
              })}
            </p>
            <p className="mt-1 text-xs leading-5 text-[#667085]">
              Amounts and timestamps are displayed using these organization
              settings; the database continues to store normalized numeric
              amounts and UTC timestamps.
            </p>
          </div>
          <Button
            onClick={saveSettings}
            disabled={save.isPending}
            className="mt-6 rounded-xl bg-[#195FE6] hover:bg-[#124FC3]"
          >
            {save.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Save organization settings
          </Button>
        </section>
        <section className="elegex-card p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#E8F8EF] text-[#167244]">
              <Wrench className="h-5 w-5" />
            </span>
            <div>
              <p className="elegex-eyebrow">TRADE VOCABULARY</p>
              <h2 className="mt-1 text-lg font-semibold text-[#14213D]">
                Electrical operations language
              </h2>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-[#667085]">
            Comma-separated terms establish the tenant’s preferred electrical
            field-service vocabulary for operational handover and reports.
          </p>
          <div className="mt-5 grid gap-2">
            <Label>Configured terms</Label>
            <textarea
              value={currentVocabulary}
              onChange={event => setVocabulary(event.target.value)}
              className="min-h-36 rounded-xl border border-[#DFE7F3] p-3 text-sm text-[#34435F]"
            />
          </div>
          <div className="mt-5 border-t border-[#EEF2F7] pt-5">
            <p className="elegex-eyebrow">ACTIVE CALL-OUT TAXONOMY</p>
            <div className="mt-3 space-y-2">
              {(operational.data?.callOutTypes || []).map((callOut: any) => (
                <div key={callOut.id} className="rounded-xl bg-[#F8FAFD] p-3">
                  <p className="text-sm font-semibold text-[#34435F]">
                    {callOut.name}
                  </p>
                  <p className="mt-1 text-xs text-[#7A879E]">
                    {callOut.appliesFrom}–{callOut.appliesTo} · base{" "}
                    {formatOrganizationMoney(callOut.baseRate, {
                      locale: currentLocale,
                      currency: currentCurrency,
                      timezone: currentTimezone,
                    })}{" "}
                    · {callOut.travelIncludedKm} km included
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
