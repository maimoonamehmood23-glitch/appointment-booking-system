import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarCheck, CheckCircle2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/SiteHeader";
import { EmptyState } from "@/components/EmptyState";
import { createBooking, getAvailability, getServices, type Service } from "@/lib/booking.functions";
import { formatDateLong, formatPrice, formatTime, toDateKey } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Book an appointment — Aster & Co. studio" },
      {
        name: "description",
        content:
          "Reserve a haircut, colour or facial at Aster & Co. Pick a service, choose an open time slot and book in under a minute. No account needed.",
      },
      { property: "og:title", content: "Book an appointment — Aster & Co. studio" },
      {
        property: "og:description",
        content: "Pick a service, choose an open time slot and book your visit to Aster & Co.",
      },
    ],
  }),
  component: BookingPage,
});

function Stepper({ step }: { step: number }) {
  const items = ["Service", "Time", "Details", "Confirm"];
  return (
    <div className="mx-auto max-w-6xl px-5 pt-10 sm:px-8">
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
        {items.map((label, i) => (
          <span key={label} className="flex items-center gap-2">
            {i > 0 && <span className="mr-2 h-px w-8 bg-line" />}
            <span
              className={
                "grid size-5 place-items-center rounded-full " +
                (step > i
                  ? "bg-accent text-card"
                  : step === i
                    ? "bg-card text-accent ring-1 ring-accent"
                    : "bg-card ring-1 ring-line")
              }
            >
              {i + 1}
            </span>
            <span className={step >= i ? "" : "text-inksoft"}>{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function BookingPage() {
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [date, setDate] = useState(() => toDateKey(new Date()));
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [confirmed, setConfirmed] = useState<null | {
    service: Service;
    date: string;
    time: string;
    name: string;
    phone: string;
  }>(null);

  const fetchServices = useServerFn(getServices);
  const fetchAvailability = useServerFn(getAvailability);
  const submitBooking = useServerFn(createBooking);

  const servicesQuery = useQuery({ queryKey: ["services"], queryFn: () => fetchServices() });
  const availabilityQuery = useQuery({
    queryKey: ["availability", date],
    queryFn: () => fetchAvailability({ data: { date } }),
    refetchInterval: 15000,
  });

  const service = useMemo(
    () => servicesQuery.data?.find((s) => s.id === serviceId) ?? null,
    [servicesQuery.data, serviceId],
  );

  // If the studio is closed today, roll forward to the next open day automatically.
  const autoSkips = useRef(0);
  useEffect(() => {
    if (availabilityQuery.data && availabilityQuery.data.length === 0 && autoSkips.current < 7) {
      autoSkips.current += 1;
      const d = new Date(`${date}T12:00:00`);
      d.setDate(d.getDate() + 1);
      setDate(toDateKey(d));
      setTime(null);
    }
  }, [availabilityQuery.data, date]);

  const step = !serviceId ? 0 : !time ? 1 : !(name && phone) ? 2 : 3;

  const booking = useMutation({
    mutationFn: async () => {
      if (!service || !time) throw new Error("Pick a service and time first");
      return submitBooking({
        data: { serviceId: service.id, name, phone, email, date, time },
      });
    },
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error("That slot was just taken. Please pick another time.");
        setTime(null);
        availabilityQuery.refetch();
        return;
      }
      setConfirmed({ service: service!, date, time: time!, name, phone });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function shiftDate(days: number) {
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate() + days);
    const key = toDateKey(d);
    if (key < toDateKey(new Date())) return;
    setDate(key);
    setTime(null);
  }

  if (confirmed) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-2xl px-5 py-16 sm:px-8">
          <div className="rise rounded-2xl bg-card p-8 ring-1 ring-accent/40 shadow-[0_18px_40px_-24px_rgba(43,38,32,0.5)]">
            <CheckCircle2 className="size-9 text-accent" />
            <h1 className="mt-4 font-display text-3xl leading-tight font-semibold">You're booked in</h1>
            <p className="mt-2 text-sm text-inksoft">
              We've saved your appointment. Show this screen or look it up any time with your phone number.
            </p>
            <div className="mt-6 divide-y divide-line/70">
              <Row label="Service" value={confirmed.service.name} />
              <Row
                label="When"
                value={`${formatDateLong(confirmed.date)} · ${formatTime(confirmed.time)}`}
              />
              <Row label="Duration" value={`${confirmed.service.duration_minutes} min`} />
              <Row label="Name" value={confirmed.name} />
              <Row label="Phone" value={confirmed.phone} />
              <Row label="Status" value="Pending confirmation" />
              <div className="flex items-center justify-between pt-3">
                <span className="text-sm text-inksoft">Pay in person</span>
                <span className="font-display text-xl font-semibold">
                  {formatPrice(confirmed.service.price_cents)}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                setConfirmed(null);
                setServiceId(null);
                setTime(null);
                setName("");
                setPhone("");
                setEmail("");
                availabilityQuery.refetch();
              }}
              className="mt-6 w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-card ring-1 ring-accent transition-colors hover:bg-accent/90"
            >
              Book another visit
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Stepper step={step} />

      <main className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_360px]">
        <section className="space-y-8">
          <div>
            <h1 className="max-w-[35ch] text-balance font-display text-3xl leading-tight font-semibold sm:text-4xl">
              Book your visit
            </h1>
            <p className="mt-2 max-w-[48ch] text-pretty text-sm text-inksoft">
              Choose a service, then pick a time that suits you. No account needed.
            </p>

            {servicesQuery.isLoading ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-[74px] animate-pulse rounded-xl bg-card ring-1 ring-line" />
                ))}
              </div>
            ) : servicesQuery.data?.length ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {servicesQuery.data.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setServiceId(s.id)}
                    className={
                      "flex items-center justify-between rounded-xl bg-card p-4 text-left transition-shadow " +
                      (serviceId === s.id ? "ring-1 ring-accent" : "ring-1 ring-line hover:ring-accent/40")
                    }
                  >
                    <div>
                      <p className="font-semibold">{s.name}</p>
                      <p className="mt-1 text-xs text-inksoft">{s.duration_minutes} min</p>
                    </div>
                    <p className="font-display text-lg font-semibold">{formatPrice(s.price_cents)}</p>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No services listed yet"
                body="The studio hasn't published its service menu. Please check back soon."
              />
            )}
          </div>

          <div className="rounded-2xl bg-card p-5 ring-1 ring-line sm:p-6">
            <div className="flex items-center justify-between">
              <p className="font-display text-xl font-semibold">Pick a time</p>
              <div className="flex items-center gap-1">
                <button
                  aria-label="Previous day"
                  onClick={() => shiftDate(-1)}
                  className="rounded-md p-1.5 text-inksoft hover:bg-paper hover:text-ink"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="min-w-28 text-center text-sm text-inksoft">{formatDateLong(date)}</span>
                <button
                  aria-label="Next day"
                  onClick={() => shiftDate(1)}
                  className="rounded-md p-1.5 text-inksoft hover:bg-paper hover:text-ink"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>

            {availabilityQuery.isLoading ? (
              <p className="mt-4 text-sm text-inksoft">Checking availability…</p>
            ) : availabilityQuery.data?.some((s) => s.available) ? (
              <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6">
                {availabilityQuery.data.map((slot) => (
                  <button
                    key={slot.time}
                    disabled={!slot.available}
                    onClick={() => setTime(slot.time)}
                    className={
                      "rounded-lg py-2.5 text-sm font-medium transition-transform " +
                      (time === slot.time
                        ? "bg-accent text-card shadow-sm"
                        : slot.available
                          ? "bg-card ring-1 ring-line hover:-translate-y-0.5"
                          : "cursor-not-allowed bg-paper text-inksoft/40 line-through")
                    }
                  >
                    {formatTime(slot.time)}
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No open slots on this day"
                body="Everything is booked or the studio is closed. Try the next day."
              />
            )}
            <p className="mt-4 text-xs text-inksoft">
              Booked slots are shown crossed out. Times are studio local time.
            </p>
          </div>
        </section>

        <aside className="lg:pt-2">
          <div className="space-y-4">
            <div className="rounded-2xl bg-card p-5 ring-1 ring-line">
              <p className="text-xs tracking-[0.15em] text-inksoft uppercase">Your details</p>
              <div className="mt-3 space-y-3">
                <Field label="Full name" value={name} onChange={setName} placeholder="Maya Okafor" />
                <Field label="Phone" value={phone} onChange={setPhone} placeholder="(555) 018-2245" />
                <Field
                  label="Email (optional)"
                  value={email}
                  onChange={setEmail}
                  placeholder="maya@example.com"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-card p-5 ring-1 ring-accent/40 shadow-[0_18px_40px_-24px_rgba(43,38,32,0.5)]">
              <p className="text-xs tracking-[0.15em] text-accent uppercase">Booking summary</p>
              <div className="mt-3 divide-y divide-line/70">
                <Row label="Service" value={service?.name ?? "—"} />
                <Row label="When" value={time ? `${formatDateLong(date)} · ${formatTime(time)}` : "—"} />
                <Row label="Duration" value={service ? `${service.duration_minutes} min` : "—"} />
                <div className="flex items-center justify-between pt-3">
                  <span className="text-sm text-inksoft">Total</span>
                  <span className="font-display text-xl font-semibold">
                    {service ? formatPrice(service.price_cents) : "—"}
                  </span>
                </div>
              </div>
              <button
                disabled={step < 3 || booking.isPending}
                onClick={() => booking.mutate()}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-sm font-semibold text-card ring-1 ring-accent transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {booking.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CalendarCheck className="size-4" />
                )}
                Confirm booking
              </button>
              <p className="mt-2 text-center text-xs text-inksoft">
                Free to book · pay in person at the studio.
              </p>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-sm text-inksoft">{label}</span>
      <span className="text-right text-sm font-semibold">{value}</span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="text-xs text-inksoft">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg bg-paper px-3 py-2 text-sm ring-1 ring-line outline-none focus:ring-accent"
      />
    </div>
  );
}
