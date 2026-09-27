import { Link } from "@tanstack/react-router";

const linkBase = "text-inksoft hover:text-ink transition-colors";

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link to="/" className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-xl bg-accent font-display text-lg font-semibold text-card">
            A
          </div>
          <div>
            <p className="font-display text-lg leading-none font-semibold">Aster &amp; Co.</p>
            <p className="mt-0.5 text-xs text-inksoft">Hair &amp; skin studio</p>
          </div>
        </Link>
        <nav className="hidden items-center gap-7 text-sm sm:flex">
          <Link to="/" className={linkBase} activeProps={{ className: "text-accent font-semibold" }}>
            Book
          </Link>
          <Link to="/check" className={linkBase} activeProps={{ className: "text-accent font-semibold" }}>
            Check a booking
          </Link>
          <Link to="/admin" className={linkBase} activeProps={{ className: "text-accent font-semibold" }}>
            Admin
          </Link>
        </nav>
        <span className="hidden text-xs text-inksoft md:inline">Mon–Sat · 9–6</span>
      </div>
      <nav className="flex items-center gap-5 border-t border-line px-5 py-2 text-sm sm:hidden">
        <Link to="/" className={linkBase} activeProps={{ className: "text-accent font-semibold" }}>
          Book
        </Link>
        <Link to="/check" className={linkBase} activeProps={{ className: "text-accent font-semibold" }}>
          Check a booking
        </Link>
        <Link to="/admin" className={linkBase} activeProps={{ className: "text-accent font-semibold" }}>
          Admin
        </Link>
      </nav>
    </header>
  );
}
