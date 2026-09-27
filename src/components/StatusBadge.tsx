import { statusLabel } from "@/lib/format";

const styles: Record<string, string> = {
  pending: "bg-paper text-inksoft ring-1 ring-line",
  confirmed: "bg-accentsoft text-accent",
  completed: "bg-paper text-ink ring-1 ring-line",
  cancelled: "bg-paper text-inksoft/70 ring-1 ring-line line-through",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status] ?? styles["pending"]}`}
    >
      {statusLabel(status)}
    </span>
  );
}
