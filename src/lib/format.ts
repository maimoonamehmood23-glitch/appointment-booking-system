export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function toDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromDateKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

export function formatDateLong(key: string) {
  return fromDateKey(key).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const hour = h ?? 0;
  const suffix = hour >= 12 ? "pm" : "am";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${String(m ?? 0).padStart(2, "0")}${suffix}`;
}

export function formatPrice(cents: number) {
  return `PKR ${Math.round(cents / 100).toLocaleString("en-PK")}`;
}

export function statusLabel(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
