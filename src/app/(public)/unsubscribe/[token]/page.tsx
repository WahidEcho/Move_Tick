import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { unsubscribeByToken } from '@/services/announcements.service';
import { CheckCircle2, XCircle } from 'lucide-react';

export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await unsubscribeByToken(token);

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2">
            {result.ok ? (
              <CheckCircle2 className="size-10 text-primary" />
            ) : (
              <XCircle className="size-10 text-destructive" />
            )}
          </div>
          <CardTitle>{result.ok ? "You're unsubscribed" : 'Link not valid'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {result.ok
              ? "You won't receive Move-Tick announcement emails anymore. You'll still get transactional emails for tickets and orders you make."
              : "This unsubscribe link isn't valid or has already been used."}
          </p>
          <Link href="/" className="text-sm font-medium text-primary underline">
            Back to Move-Tick
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
