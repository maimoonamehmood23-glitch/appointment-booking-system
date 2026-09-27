export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-line bg-paper px-5 py-8 text-center">
      <p className="font-display text-base font-semibold">{title}</p>
      <p className="mt-1 text-sm text-inksoft">{body}</p>
    </div>
  );
}
