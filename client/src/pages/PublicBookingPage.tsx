import { CheckCircle2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useRoute } from "wouter";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

export default function PublicBookingPage() {
  const [, params] = useRoute("/book/:slug");
  const slug = params?.slug ?? "";
  const profile = trpc.publicContractor.profile.useQuery(
    { slug },
    { enabled: Boolean(slug) }
  );
  const [submitted, setSubmitted] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const request = trpc.publicContractor.requestBooking.useMutation({
    onSuccess: () => setSubmitted(true),
  });

  if (profile.isLoading)
    return (
      <main className="grid min-h-screen place-items-center bg-[#F5F7FB] text-sm text-[#667085]">
        Loading booking page…
      </main>
    );
  if (!profile.data)
    return (
      <main className="grid min-h-screen place-items-center bg-[#F5F7FB] p-6 text-center">
        <div>
          <p className="text-xs font-bold tracking-[0.15em] text-[#C7501A]">
            BOOKING PAGE UNAVAILABLE
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-[#14213D]">
            This public profile could not be found.
          </h1>
        </div>
      </main>
    );

  return (
    <main className="min-h-screen bg-[#F5F7FB] px-5 py-10 text-[#14213D] sm:px-8">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[2rem] bg-[#142B57] p-8 text-white">
          <p className="text-xs font-bold tracking-[0.18em] text-[#A9C9FF]">
            FIELD SERVICE BOOKING
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">
            {profile.data.displayName}
          </h1>
          <p className="mt-5 text-base leading-7 text-[#D7E6FF]">
            {profile.data.summary ||
              "Send a service request and the team will review it before confirming any work."}
          </p>
          <div className="mt-8 space-y-4 border-t border-white/15 pt-6">
            <div>
              <p className="text-xs font-bold tracking-[0.14em] text-[#A9C9FF]">
                SERVICES
              </p>
              <p className="mt-2 text-sm text-white">
                {profile.data.services.length
                  ? profile.data.services.join(" · ")
                  : "Services will be confirmed after review."}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold tracking-[0.14em] text-[#A9C9FF]">
                SERVICE AREAS
              </p>
              <p className="mt-2 text-sm text-white">
                {profile.data.serviceAreas.length
                  ? profile.data.serviceAreas.join(" · ")
                  : "Area coverage confirmed during request review."}
              </p>
            </div>
          </div>
        </section>
        <section className="rounded-[2rem] border border-[#E0E8F5] bg-white p-6 shadow-[0_18px_50px_rgba(24,54,108,0.08)] sm:p-8">
          {submitted ? (
            <div className="grid min-h-[460px] place-items-center text-center">
              <div>
                <CheckCircle2 className="mx-auto h-12 w-12 text-[#16794D]" />
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">
                  Request received
                </h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-[#667085]">
                  The team will review your request. This submission does not
                  create a booking or a charge automatically.
                </p>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs font-bold tracking-[0.16em] text-[#195FE6]">
                REQUEST A SERVICE VISIT
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Tell us what you need.
              </h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Input
                  value={customerName}
                  onChange={event => setCustomerName(event.target.value)}
                  placeholder="Your name"
                />
                <Input
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  placeholder="Email address"
                />
                <Input
                  value={phone}
                  onChange={event => setPhone(event.target.value)}
                  placeholder="Phone number"
                />
                <Input
                  value={serviceType}
                  onChange={event => setServiceType(event.target.value)}
                  placeholder="Service type"
                />
              </div>
              <Input
                className="mt-3"
                value={address}
                onChange={event => setAddress(event.target.value)}
                placeholder="Service address"
              />
              <Textarea
                className="mt-3 min-h-32"
                value={description}
                onChange={event => setDescription(event.target.value)}
                placeholder="Describe the work, access, and preferred timing"
              />
              <label className="mt-4 flex items-start gap-3 rounded-xl bg-[#F7F9FD] p-3 text-xs leading-5 text-[#667085]">
                <input type="checkbox" required className="mt-0.5" />I agree
                that this business may contact me about this service request.
              </label>
              <Button
                className="mt-4 w-full"
                disabled={
                  !profile.data.bookingEnabled ||
                  request.isPending ||
                  customerName.trim().length < 2 ||
                  serviceType.trim().length < 2 ||
                  address.trim().length < 5 ||
                  description.trim().length < 5
                }
                onClick={() =>
                  request.mutate({
                    slug,
                    customerName,
                    email: email || undefined,
                    phone: phone || undefined,
                    serviceType,
                    address,
                    description,
                    consentToContact: true,
                  })
                }
              >
                {request.isPending
                  ? "Sending request…"
                  : profile.data.bookingEnabled
                    ? "Submit service request"
                    : "Bookings currently unavailable"}
              </Button>
              <p className="mt-4 flex gap-2 text-xs leading-5 text-[#667085]">
                <ShieldCheck className="h-4 w-4 shrink-0 text-[#16794D]" />
                Your request is routed to the contractor workspace for review.
                It is not an automatic appointment, quote, or payment.
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
