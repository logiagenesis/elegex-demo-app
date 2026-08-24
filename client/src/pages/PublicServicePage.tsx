import { ArrowRight, ShieldCheck } from "lucide-react";
import { Link, useRoute } from "wouter";

import { matchesDiscoveryDeclaration } from "@/lib/publicDiscovery";
import { trpc } from "@/lib/trpc";

export default function PublicServicePage() {
  const [, params] = useRoute("/discover/:slug/:service/:area");
  const slug = params?.slug ?? "";
  const profile = trpc.publicContractor.profile.useQuery(
    { slug },
    { enabled: Boolean(slug) }
  );
  const service = decodeURIComponent(params?.service ?? "");
  const area = decodeURIComponent(params?.area ?? "");
  const listedService = profile.data?.services.find(item =>
    matchesDiscoveryDeclaration(service, [item])
  );
  const listedArea = profile.data?.serviceAreas.find(item =>
    matchesDiscoveryDeclaration(area, [item])
  );

  if (profile.isLoading)
    return (
      <main className="grid min-h-screen place-items-center bg-[#F5F7FB] text-sm text-[#667085]">
        Loading service information…
      </main>
    );

  if (!profile.data || !listedService || !listedArea)
    return (
      <main className="grid min-h-screen place-items-center bg-[#F5F7FB] p-6 text-center text-[#14213D]">
        <div className="max-w-lg">
          <p className="text-xs font-bold tracking-[0.16em] text-[#C7501A]">
            SERVICE PAGE UNAVAILABLE
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
            This service or area is not listed on the public profile.
          </h1>
          <Link
            href={`/book/${slug}`}
            className="mt-6 inline-flex rounded-lg bg-[#195FE6] px-4 py-2.5 text-sm font-semibold text-white"
          >
            View the booking page
          </Link>
        </div>
      </main>
    );

  return (
    <main className="min-h-screen bg-[#F5F7FB] px-5 py-10 text-[#14213D] sm:px-8">
      <article className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-[#E0E8F5] bg-white shadow-[0_18px_50px_rgba(24,54,108,0.08)]">
        <section className="bg-[#142B57] px-7 py-12 text-white sm:px-12">
          <p className="text-xs font-bold tracking-[0.18em] text-[#A9C9FF]">
            DECLARED SERVICE INFORMATION
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
            {listedService} in {listedArea}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#D7E6FF]">
            {profile.data.displayName} lists this service and area in its public
            business profile. Availability, scope, price, and timing are
            confirmed only after the team reviews a service request.
          </p>
        </section>
        <section className="grid gap-8 px-7 py-9 sm:px-12 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <h2 className="text-xl font-semibold">
              Request a review of your work
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#667085]">
              This template intentionally displays only administrator-declared
              service and area information. It does not make comparative,
              ranking, price, response-time, availability, licensing, or outcome
              claims.
            </p>
          </div>
          <Link
            href={`/book/${slug}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#195FE6] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(25,95,230,0.23)]"
          >
            Request service review <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
        <section className="border-t border-[#E9EEF7] bg-[#FBFCFF] px-7 py-5 sm:px-12">
          <p className="flex gap-2 text-xs leading-5 text-[#667085]">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#16794D]" />
            Publishing control remains with the workspace administrator. The
            addressable URL is derived from the selected public profile,
            service, and service area; any change in those declarations removes
            the page.
          </p>
        </section>
      </article>
    </main>
  );
}
