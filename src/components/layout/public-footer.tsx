import Link from 'next/link';
import { getPlatformSettings } from '@/services/platform-settings.service';
import { MoveBeyondMark, MoveTickBrand } from '@/components/brand/brand-marks';

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
    <footer className="border-t border-border bg-card dark:border-white/10 dark:bg-[#05070b]">
      <div className="container grid gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-3 sm:col-span-2 lg:col-span-1">
          <Link href="/" className="block w-fit transition-opacity hover:opacity-85"><MoveTickBrand className="-mb-6 -mt-14 scale-75 origin-left" /></Link>
          <p className="max-w-xs text-sm text-muted-foreground">
            Discover, host, and check in to events — ticketing built for organizers who want it to
            just work.
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
        <div className="space-y-2 sm:col-span-2 lg:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">A Move Beyond company</p>
          <MoveBeyondMark className="-ml-4" />
          <p className="text-xs leading-relaxed text-muted-foreground/80">Legal name: M. V. Beyond<br />Tax Number: 769-465-315</p>
        </div>
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
