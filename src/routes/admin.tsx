import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, CheckCheck, Loader2, LockKeyhole, LogOut, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/SiteHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import {
  adminBookings,
  adminDeleteService,
  adminLogin,
  adminLogout,
  adminSaveService,
  adminServices,
  adminSetStatus,
  adminSlots,
  adminStatus,
  adminToggleSlot,
  type Booking,
  type Service,
} from "@/lib/booking.functions";
import { DAYS, formatDateLong, formatPrice, formatTime, toDateKey } from "@/lib/format";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Studio admin — Aster & Co." },
      {
        name: "description",
        content:
          "Private dashboard for Aster & Co. staff: review today's appointments, confirm or cancel bookings, and manage services and opening slots.",
      },
      { property: "og:title", content: "Studio admin — Aster & Co." },
      { property: "og:description", content: "Manage appointments, services and opening slots." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const ALL_TIMES = [
  "09:00:00",
  "09:30:00",
  "10:00:00",
  "10:30:00",
  "11:00:00",
  "11:30:00",
  "12:00:00",
  "12:30:00",
  "13:00:00",
  "13:30:00",
  "14:00:00",
  "14:30:00",
  "15:00:00",
  "15:30:00",
  "16:00:00",
  "16:30:00",
  "17:00:00",
  "17:30:00",
];

function AdminPage() {
  const statusFn = useServerFn(adminStatus);
  const { data, isLoading } = useQuery({ queryKey: ["admin-status"], queryFn: () => statusFn() });

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="mx-auto max-w-6xl px-5 py-16 text-sm text-inksoft sm:px-8">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      {data?.unlocked ? <Dashboard /> : <LoginCard />}
    </div>
  );
}

function LoginCard() {
  const [password, setPassword] = useState("");
  const qc = useQueryClient();
  const login = useServerFn(adminLogin);

  const submit = useMutation({
    mutationFn: () => login({ data: { password } }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error("That password isn't right.");
        return;
      }
      qc.invalidateQueries({ queryKey: ["admin-status"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <main className="mx-auto max-w-md px-5 py-20 sm:px-8">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate();
        }}
        className="rounded-2xl bg-card p-6 ring-1 ring-line"
      >
        <LockKeyhole className="size-7 text-accent" />
        <h1 className="mt-3 font-display text-2xl font-semibold">Studio admin</h1>
        <p className="mt-1 text-sm text-inksoft">Enter the studio password to manage bookings.</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="mt-5 w-full rounded-lg bg-paper px-3 py-2.5 text-sm ring-1 ring-line outline-none focus:ring-accent"
        />
        <button
          type="submit"
          disabled={submit.isPending}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-sm font-semibold text-card ring-1 ring-accent transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          {submit.isPending && <Loader2 className="size-4 animate-spin" />}
          Unlock dashboard
        </button>
      </form>
    </main>
  );
}

function Dashboard() {
  const qc = useQueryClient();
  const today = toDateKey(new Date());

  const listBookings = useServerFn(adminBookings);
  const setStatus = useServerFn(adminSetStatus);
  const logout = useServerFn(adminLogout);

  const bookingsQuery = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: () => listBookings(),
    refetchInterval: 10000,
  });

  const update = useMutation({
    mutationFn: (v: { id: string; status: Booking["status"] }) => setStatus({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      toast.success("Booking updated.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const doLogout = useMutation({
    mutationFn: () => logout(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-status"] }),
  });

  const all = bookingsQuery.data ?? [];
  const todays = all.filter((b) => b.booking_date === today);

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.15em] text-inksoft uppercase">Admin</p>
          <h1 className="font-display text-2xl leading-tight font-semibold sm:text-3xl">
            Today at the studio
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-inksoft">{formatDateLong(today)}</span>
          <button
            onClick={() => doLogout.mutate()}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-inksoft ring-1 ring-line hover:text-ink"
          >
            <LogOut className="size-3.5" /> Sign out
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Appointments" value={String(todays.length)} />
        <Tile
          label="Confirmed"
          value={String(todays.filter((b) => b.status === "confirmed").length)}
          accent
        />
        <Tile label="Completed" value={String(todays.filter((b) => b.status === "completed").length)} />
        <Tile label="Cancelled" value={String(todays.filter((b) => b.status === "cancelled").length)} />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl ring-1 ring-line">
        {all.length === 0 ? (
          <div className="bg-card">
            <EmptyState
              title="No bookings yet"
              body="When customers book through the site, their appointments appear here straight away."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-paper text-left text-xs tracking-wide text-inksoft uppercase">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Service</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {all.map((b) => (
                  <tr key={b.id} className="bg-card">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDateLong(b.booking_date)}</td>
                    <td className="px-4 py-3 font-semibold whitespace-nowrap">
                      {formatTime(b.booking_time)}
                    </td>
                    <td className="px-4 py-3">{b.customer_name}</td>
                    <td className="px-4 py-3 text-inksoft">{b.phone}</td>
                    <td className="px-4 py-3 text-inksoft">{b.service_name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex gap-1.5">
                        {b.status === "pending" && (
                          <ActionButton
                            primary
                            label="Confirm"
                            icon={<Check className="size-3.5" />}
                            onClick={() => update.mutate({ id: b.id, status: "confirmed" })}
                          />
                        )}
                        {b.status === "confirmed" && (
                          <ActionButton
                            primary
                            label="Complete"
                            icon={<CheckCheck className="size-3.5" />}
                            onClick={() => update.mutate({ id: b.id, status: "completed" })}
                          />
                        )}
                        {b.status !== "cancelled" && (
                          <ActionButton
                            label="Cancel"
                            icon={<X className="size-3.5" />}
                            onClick={() => update.mutate({ id: b.id, status: "cancelled" })}
                          />
                        )}
                        {b.status === "cancelled" && (
                          <ActionButton
                            label="Restore"
                            icon={<Check className="size-3.5" />}
                            onClick={() => update.mutate({ id: b.id, status: "pending" })}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ServicesEditor />
        <SlotsEditor />
      </div>
    </main>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-line">
      <p className="text-xs text-inksoft">{label}</p>
      <p className={`mt-1 font-display text-3xl font-semibold ${accent ? "text-accent" : ""}`}>{value}</p>
    </div>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
  primary,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs transition-colors " +
        (primary
          ? "bg-accent font-semibold text-card ring-1 ring-accent hover:bg-accent/90"
          : "font-medium text-inksoft ring-1 ring-line hover:text-ink")
      }
    >
      {icon}
      {label}
    </button>
  );
}

function ServicesEditor() {
  const qc = useQueryClient();
  const list = useServerFn(adminServices);
  const save = useServerFn(adminSaveService);
  const remove = useServerFn(adminDeleteService);

  const [draft, setDraft] = useState<{ id?: string; name: string; duration: string; price: string } | null>(
    null,
  );

  const servicesQuery = useQuery({ queryKey: ["admin-services"], queryFn: () => list() });

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          id: draft?.id,
          name: draft!.name.trim(),
          duration_minutes: Number(draft!.duration),
          price_cents: Math.round(Number(draft!.price) * 100),
        },
      }),
    onSuccess: () => {
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["admin-services"] });
      qc.invalidateQueries({ queryKey: ["services"] });
      toast.success("Service saved.");
    },
    onError: () => toast.error("Check the name, duration and price."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["admin-services"] });
      qc.invalidateQueries({ queryKey: ["services"] });
      toast.success(res.archived ? "Service hidden (it has past bookings)." : "Service deleted.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const services = servicesQuery.data ?? [];

  return (
    <div className="rounded-2xl bg-card p-5 ring-1 ring-line">
      <div className="flex items-center justify-between">
        <p className="font-display text-lg font-semibold">Services</p>
        <button
          onClick={() => setDraft({ name: "", duration: "45", price: "3000" })}
          className="inline-flex items-center gap-1 text-xs font-semibold text-accent"
        >
          <Plus className="size-3.5" /> Add service
        </button>
      </div>

      {services.length === 0 && !draft ? (
        <EmptyState title="No services yet" body="Add your first service so customers can book it." />
      ) : (
        <div className="mt-3 divide-y divide-line/70">
          {services.map((s: Service) => (
            <div key={s.id} className="flex items-center justify-between gap-3 py-2.5">
              <div>
                <span className="text-sm">{s.name}</span>
                {!s.active && <span className="ml-2 text-xs text-inksoft">(hidden)</span>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-inksoft">
                  {s.duration_minutes} min · {formatPrice(s.price_cents)}
                </span>
                <button
                  aria-label={`Edit ${s.name}`}
                  onClick={() =>
                    setDraft({
                      id: s.id,
                      name: s.name,
                      duration: String(s.duration_minutes),
                      price: String(s.price_cents / 100),
                    })
                  }
                  className="text-inksoft hover:text-ink"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  aria-label={`Delete ${s.name}`}
                  onClick={() => deleteMutation.mutate(s.id)}
                  className="text-inksoft hover:text-accent"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {draft && (
        <div className="mt-4 rounded-xl bg-paper p-4 ring-1 ring-line">
          <div className="grid gap-2 sm:grid-cols-[1fr_90px_90px]">
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Service name"
              className="rounded-lg bg-card px-3 py-2 text-sm ring-1 ring-line outline-none focus:ring-accent"
            />
            <input
              value={draft.duration}
              onChange={(e) => setDraft({ ...draft, duration: e.target.value })}
              placeholder="Minutes"
              className="rounded-lg bg-card px-3 py-2 text-sm ring-1 ring-line outline-none focus:ring-accent"
            />
            <input
              value={draft.price}
              onChange={(e) => setDraft({ ...draft, price: e.target.value })}
              placeholder="Price"
              className="rounded-lg bg-card px-3 py-2 text-sm ring-1 ring-line outline-none focus:ring-accent"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-card ring-1 ring-accent disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => setDraft(null)}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-inksoft ring-1 ring-line hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SlotsEditor() {
  const qc = useQueryClient();
  const list = useServerFn(adminSlots);
  const toggle = useServerFn(adminToggleSlot);
  const [day, setDay] = useState(new Date().getDay());

  const slotsQuery = useQuery({ queryKey: ["admin-slots"], queryFn: () => list() });

  const toggleMutation = useMutation({
    mutationFn: (v: { day: number; time: string; enabled: boolean }) => toggle({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-slots"] });
      qc.invalidateQueries({ queryKey: ["availability"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const enabled = new Set(
    (slotsQuery.data ?? []).filter((s) => s.day_of_week === day).map((s) => s.slot_time),
  );

  return (
    <div className="rounded-2xl bg-card p-5 ring-1 ring-line">
      <p className="font-display text-lg font-semibold">Opening slots</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {DAYS.map((d, i) => (
          <button
            key={d}
            onClick={() => setDay(i)}
            className={
              "rounded-lg px-3 py-1.5 text-xs font-medium " +
              (day === i ? "bg-accent text-card" : "bg-paper text-inksoft ring-1 ring-line hover:text-ink")
            }
          >
            {d.slice(0, 3)}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {ALL_TIMES.map((t) => {
          const on = enabled.has(t);
          return (
            <button
              key={t}
              onClick={() => toggleMutation.mutate({ day, time: t, enabled: !on })}
              className={
                "rounded-lg px-3 py-1.5 text-xs font-semibold " +
                (on ? "bg-accentsoft text-accent" : "bg-paper font-medium text-inksoft ring-1 ring-line")
              }
            >
              {formatTime(t)}
            </button>
          );
        })}
      </div>
      {enabled.size === 0 && (
        <EmptyState
          title={`${DAYS[day]} is closed`}
          body="Tap any time above to open bookable slots for this day."
        />
      )}
      <p className="mt-4 text-xs text-inksoft">
        Highlighted slots are open on {DAYS[day]}. Tap to toggle them on or off.
      </p>
    </div>
  );
}
