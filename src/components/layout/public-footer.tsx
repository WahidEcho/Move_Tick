import Link from 'next/link';

const footerLinks = [
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/terms', label: 'Terms' },
  { href: '/privacy', label: 'Privacy' },
];

export function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/30">
      <div className="container flex flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row">
        <Link href="/" className="font-display font-bold text-foreground hover:text-foreground/80">
          Move-Tick
        </Link>
        <nav className="flex flex-wrap items-center justify-center gap-6">
          {footerLinks.map((link) => (
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
      <div className="container border-t px-4 py-4">
        <p className="text-center text-xs text-muted-foreground">
          © {year} Move-Tick by Move Beyond. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
