import Link from 'next/link';
import Image from 'next/image';
import { getPlatformSettings } from '@/services/platform-settings.service';

const FOOTER_COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: 'Explore',
    links: [
      { href: '/events', label: 'Browse events' },
      { href: '/about', label: 'About' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    title: 'Organizers',
    links: [
      { href: '/apply-organizer', label: 'Host your event' },
      { href: '/login', label: 'Organizer login' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/terms', label: 'Terms' },
      { href: '/privacy', label: 'Privacy' },
    ],
  },
];

export async function PublicFooter() {
  const year = new Date().getFullYear();
  let contactEmail: string | null = null;
  try {
    const settings = await getPlatformSettings();
    contactEmail = settings.public_contact || settings.support_email || null;
  } catch {
    // Footer renders fine without a contact line if settings can't load.
  }

  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="container grid gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3 sm:col-span-2 lg:col-span-1">
          <Link href="/" className="font-display text-xl font-bold text-foreground hover:text-foreground/80">
            Move-Tick
          </Link>
          <p className="max-w-xs text-sm text-muted-foreground">
            Discover, host, and check in to events — ticketing built for organizers who want it to
            just work.
          </p>
          <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
            <Image src="/brand/mb-logo-black.png" alt="" width={16} height={22} className="h-4 w-auto opacity-70 dark:hidden" />
            <Image src="/brand/mb-logo-white.png" alt="" width={16} height={22} className="hidden h-4 w-auto opacity-70 dark:block" />
            Move-Tick is a subsidiary of M. V. Beyond
          </div>
          <p className="max-w-xs text-xs text-muted-foreground/80">
            Legal name: M. V. Beyond.
            <br />
            Tax Number: 769-465-315
          </p>
        </div>

        {FOOTER_COLUMNS.map((col) => (
          <div key={col.title} className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{col.title}</p>
            <nav className="flex flex-col gap-2">
              {col.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        ))}
      </div>
      <div className="container flex flex-col items-center justify-between gap-2 border-t border-border/60 px-4 py-4 sm:flex-row">
        <p className="text-xs text-muted-foreground">© {year} Move-Tick by Move Beyond. All rights reserved.</p>
        {contactEmail && (
          <a href={`mailto:${contactEmail}`} className="text-xs text-muted-foreground hover:text-foreground">
            {contactEmail}
          </a>
        )}
      </div>
    </footer>
  );
}
