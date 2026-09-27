import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarX2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/SiteHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { cancelOwnBooking, lookupBookings, type Booking } from "@/lib/booking.functions";
import { formatDateLong, formatTime } from "@/lib/format";

export const Route = createFileRoute("/check")({
  head: () => ({
    meta: [
      { title: "Check my booking — Aster & Co. studio" },
      {
        name: "description",
        content:
          "Look up your Aster & Co. appointment with your phone number to see whether it is pending, confirmed or cancelled — or cancel it yourself.",
      },
      { property: "og:title", content: "Check my booking — Aster & Co. studio" },
      {
        property: "og:description",
        content: "Find your appointment by phone number and cancel it if your plans change.",
      },
    ],
  }),
  component: CheckPage,
});

function CheckPage() {
  const [phone, setPhone] = useState("");
  const [results, setResults] = useState<Booking[] | null>(null);
  const lookup = useServerFn(lookupBookings);
  const cancelFn = useServerFn(cancelOwnBooking);

  const search = useMutation({
    mutationFn: () => lookup({ data: { phone: phone.trim() } }),
    onSuccess: (rows) => setResults(rows),
    onError: (e: Error) => toast.error(e.message),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => cancelFn({ data: { id, phone: phone.trim() } }),
    onSuccess: () => {
      toast.success("Appointment cancelled — the slot is free again.");
      search.mutate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <h1 className="font-display text-3xl leading-tight font-semibold sm:text-4xl">Check my booking</h1>
        <p className="mt-2 max-w-[48ch] text-pretty text-sm text-inksoft">
          Enter the phone number you booked with to see your appointment status.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (phone.trim().length < 4) {
              toast.error("Enter the phone number you booked with.");
              return;
            }
            search.mutate();
          }}
          className="mt-6 flex flex-col gap-2 sm:flex-row"
        >
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 018-2245"
            className="flex-1 rounded-lg bg-card px-4 py-3 text-sm ring-1 ring-line outline-none focus:ring-accent"
          />
          <button
            type="submit"
            disabled={search.isPending}
            className="flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-card ring-1 ring-accent transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            {search.isPending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            Find booking
          </button>
        </form>

        {results !== null &&
          (results.length === 0 ? (
            <EmptyState
              title="No bookings found"
              body="We couldn't find an appointment with that number. Double-check the digits, or book a new visit."
            />
          ) : (
            <div className="mt-6 space-y-3">
              {results.map((b) => (
                <div key={b.id} className="rounded-2xl bg-card p-5 ring-1 ring-line">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-lg font-semibold">{b.service_name}</p>
                      <p className="mt-1 text-sm text-inksoft">
                        {formatDateLong(b.booking_date)} · {formatTime(b.booking_time)}
                      </p>
                      <p className="mt-1 text-xs text-inksoft">Booked for {b.customer_name}</p>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                  {b.status !== "cancelled" && b.status !== "completed" && (
                    <button
                      onClick={() => cancel.mutate(b.id)}
                      disabled={cancel.isPending}
                      className="mt-4 inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-inksoft ring-1 ring-line transition-colors hover:text-ink disabled:opacity-50"
                    >
                      <CalendarX2 className="size-3.5" />
                      Cancel this appointment
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))}
      </main>
    </div>
  );
}
