import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
        404
      </p>
      <h1 className="text-3xl font-bold">This page doesn&apos;t exist</h1>
      <p className="max-w-md text-muted-foreground">
        The link may be outdated, or the event or ticket you&apos;re looking for is
        no longer available.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/">Go home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/events">Browse events</Link>
        </Button>
      </div>
    </div>
  );
}
