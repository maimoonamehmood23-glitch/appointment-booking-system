import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  active: boolean;
  sort_order: number;
};

export type Booking = {
  id: string;
  service_id: string;
  service_name: string;
  customer_name: string;
  phone: string;
  email: string | null;
  booking_date: string;
  booking_time: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  created_at: string;
};

export type SlotRow = { id: string; day_of_week: number; slot_time: string };

const db = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;

/* ---------------------------------- admin session --------------------------------- */

const sessionConfig = () => ({
  password: process.env["SESSION_SECRET"]!,
  name: "aster-admin",
  maxAge: 60 * 60 * 12,
  cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
});

type AdminSession = { unlocked?: boolean };

function matches(input: string, expected: string) {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

async function requireAdmin() {
  const session = await useSession<AdminSession>(sessionConfig());
  if (!session.data.unlocked) throw new Error("Unauthorized");
}

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string }) => z.object({ password: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const expected = process.env["ADMIN_PASSWORD"];
    if (!expected) throw new Error("Admin password is not configured");
    if (!matches(data.password, expected)) return { ok: false as const };
    const session = await useSession<AdminSession>(sessionConfig());
    await session.update({ unlocked: true });
    return { ok: true as const };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<AdminSession>(sessionConfig());
  await session.clear();
  return { ok: true as const };
});

export const adminStatus = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<AdminSession>(sessionConfig());
  return { unlocked: Boolean(session.data.unlocked) };
});

/* --------------------------------- public reads ---------------------------------- */

export const getServices = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = await db();
  const { data, error } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price_cents, active, sort_order")
    .eq("active", true)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as Service[];
});

export const getAvailability = createServerFn({ method: "GET" })
  .inputValidator((d: { date: string }) => z.object({ date: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const supabase = await db();
    const dow = new Date(`${data.date}T12:00:00Z`).getUTCDay();

    const [{ data: slots, error: slotErr }, { data: booked, error: bookErr }] = await Promise.all([
      supabase.from("time_slots").select("slot_time").eq("day_of_week", dow).order("slot_time"),
      supabase
        .from("bookings")
        .select("booking_time")
        .eq("booking_date", data.date)
        .neq("status", "cancelled"),
    ]);
    if (slotErr) throw new Error(slotErr.message);
    if (bookErr) throw new Error(bookErr.message);

    const taken = new Set((booked ?? []).map((b) => b.booking_time as string));
    return (slots ?? []).map((s) => ({
      time: s.slot_time as string,
      available: !taken.has(s.slot_time as string),
    }));
  });

/* --------------------------------- public writes --------------------------------- */

const bookingInput = z.object({
  serviceId: z.string().uuid(),
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(6).max(30),
  email: z.string().trim().email().optional().or(z.literal("")),
  date: z.string(),
  time: z.string(),
});

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof bookingInput>) => bookingInput.parse(d))
  .handler(async ({ data }) => {
    const supabase = await db();
    const { data: row, error } = await supabase
      .from("bookings")
      .insert({
        service_id: data.serviceId,
        customer_name: data.name,
        phone: data.phone,
        email: data.email ? data.email : null,
        booking_date: data.date,
        booking_time: data.time,
        status: "pending",
      })
      .select("id, booking_date, booking_time, customer_name, phone, email, service_id, status")
      .single();

    if (error) {
      if (error.code === "23505") return { ok: false as const, reason: "taken" as const };
      throw new Error(error.message);
    }
    return { ok: true as const, booking: row };
  });

export const lookupBookings = createServerFn({ method: "POST" })
  .inputValidator((d: { phone: string }) => z.object({ phone: z.string().trim().min(4) }).parse(d))
  .handler(async ({ data }) => {
    const supabase = await db();
    const { data: rows, error } = await supabase
      .from("bookings")
      .select("id, customer_name, phone, email, booking_date, booking_time, status, service_id, created_at, services(name)")
      .eq("phone", data.phone)
      .order("booking_date", { ascending: false })
      .order("booking_time", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      ...r,
      service_name: (r.services as { name: string } | null)?.name ?? "Service",
    })) as unknown as Booking[];
  });

export const cancelOwnBooking = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; phone: string }) =>
    z.object({ id: z.string().uuid(), phone: z.string().trim().min(4) }).parse(d),
  )
  .handler(async ({ data }) => {
    const supabase = await db();
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", data.id)
      .eq("phone", data.phone);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/* ------------------------------------ admin -------------------------------------- */

export const adminBookings = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const supabase = await db();
  const { data, error } = await supabase
    .from("bookings")
    .select("id, customer_name, phone, email, booking_date, booking_time, status, service_id, created_at, services(name)")
    .order("booking_date", { ascending: false })
    .order("booking_time", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    ...r,
    service_name: (r.services as { name: string } | null)?.name ?? "Service",
  })) as unknown as Booking[];
});

export const adminSetStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: string }) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pending", "confirmed", "completed", "cancelled"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = await db();
    const { error } = await supabase.from("bookings").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminServices = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const supabase = await db();
  const { data, error } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price_cents, active, sort_order")
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as Service[];
});

const serviceInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(80),
  duration_minutes: z.number().int().min(5).max(480),
  price_cents: z.number().int().min(0).max(1_000_000),
});

export const adminSaveService = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof serviceInput>) => serviceInput.parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = await db();
    if (data.id) {
      const { error } = await supabase
        .from("services")
        .update({
          name: data.name,
          duration_minutes: data.duration_minutes,
          price_cents: data.price_cents,
        })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("services").insert({
        name: data.name,
        duration_minutes: data.duration_minutes,
        price_cents: data.price_cents,
        sort_order: 99,
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true as const };
  });

export const adminDeleteService = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = await db();
    const { error } = await supabase.from("services").delete().eq("id", data.id);
    if (error) {
      // referenced by bookings -> soft-disable instead
      const { error: err2 } = await supabase.from("services").update({ active: false }).eq("id", data.id);
      if (err2) throw new Error(err2.message);
      return { ok: true as const, archived: true };
    }
    return { ok: true as const, archived: false };
  });

export const adminSlots = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const supabase = await db();
  const { data, error } = await supabase
    .from("time_slots")
    .select("id, day_of_week, slot_time")
    .order("day_of_week")
    .order("slot_time");
  if (error) throw new Error(error.message);
  return (data ?? []) as SlotRow[];
});

export const adminToggleSlot = createServerFn({ method: "POST" })
  .inputValidator((d: { day: number; time: string; enabled: boolean }) =>
    z.object({ day: z.number().int().min(0).max(6), time: z.string(), enabled: z.boolean() }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = await db();
    if (data.enabled) {
      const { error } = await supabase
        .from("time_slots")
        .upsert({ day_of_week: data.day, slot_time: data.time }, { onConflict: "day_of_week,slot_time" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("time_slots")
        .delete()
        .eq("day_of_week", data.day)
        .eq("slot_time", data.time);
      if (error) throw new Error(error.message);
    }
    return { ok: true as const };
  });
