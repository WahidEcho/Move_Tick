import Image from 'next/image';

/** One-line footer for dashboard shells (organizer/admin, always light) — the rich footer lives on public/attendee pages. */
export function SlimFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="flex items-center justify-center gap-2 border-t border-border/60 px-4 py-3 text-xs text-muted-foreground">
      <span>© {year} Move-Tick</span>
      <span aria-hidden>·</span>
      <Image src="/brand/mb-logo-black.png" alt="Move Beyond" width={14} height={20} className="h-3.5 w-auto opacity-60" />
      <span>by Move Beyond</span>
    </footer>
  );
}
