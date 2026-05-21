import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-savings shadow-glow">
            <span className="text-sm font-bold text-primary-foreground">C</span>
          </div>
          <span className="text-base font-semibold tracking-tight">
            Credex<span className="text-muted-foreground"> · AI Spend Auditor</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
          <a href="/#how" className="hover:text-foreground transition-colors">How it works</a>
          <a href="/#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="/#faq" className="hover:text-foreground transition-colors">FAQ</a>
          <Link
            to="/audit"
            className="inline-flex h-9 items-center rounded-lg bg-savings px-4 text-sm font-medium text-primary-foreground shadow-glow hover:opacity-95"
          >
            Start audit
          </Link>
        </nav>
        <Link
          to="/audit"
          className="inline-flex h-9 items-center rounded-lg bg-savings px-3 text-xs font-medium text-primary-foreground shadow-glow sm:hidden"
        >
          Start audit
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-savings">
            <span className="text-[10px] font-bold text-primary-foreground">C</span>
          </div>
          <span>© {new Date().getFullYear()} Credex. Audit logic is rule-based and verifiable.</span>
        </div>
        <div className="flex gap-5">
          <a href="/#faq" className="hover:text-foreground">FAQ</a>
          <a href="/audit" className="hover:text-foreground">Start audit</a>
        </div>
      </div>
    </footer>
  );
}
