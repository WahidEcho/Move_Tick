import Link from 'next/link';
import { requireAuth } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase-server';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { AutoRefresh } from './auto-refresh';

interface PageProps {
  searchParams: Promise<{ payment?: string }>;
}

export default async function PurchaseCompletePage({ searchParams }: PageProps) {
  const profile = await requireAuth();
  const { payment: paymentId } = await searchParams;

  type PayStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled' | 'unknown';
  let status: PayStatus = 'unknown';
  if (paymentId) {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from('payments')
      .select('status, user_id')
      .eq('id', paymentId)
      .maybeSingle();
    // Only reveal status to the buyer.
    if (data && data.user_id === profile.id) {
      status = data.status as PayStatus;
    }
  }

  const isPaid = status === 'paid';
  const isPending = status === 'pending' || status === 'unknown';
  const isFailed = status === 'failed' || status === 'cancelled';

  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center py-16">
      <AutoRefresh active={isPending} seconds={3} />
      <Card className="w-full">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          {isPaid && <CheckCircle2 className="size-14 text-green-500" />}
          {isPending && <Loader2 className="size-14 animate-spin text-primary" />}
          {isFailed && <XCircle className="size-14 text-destructive" />}

          {isPaid && (
            <>
              <h1 className="text-xl font-semibold">Payment confirmed!</h1>
              <p className="text-muted-foreground">
                Your ticket has been issued and emailed to you.
              </p>
              <Button asChild className="mt-2 w-full">
                <Link href="/tickets">View my tickets</Link>
              </Button>
            </>
          )}

          {isPending && (
            <>
              <h1 className="text-xl font-semibold">Confirming your payment…</h1>
              <p className="text-muted-foreground">
                This usually takes a few seconds. Your ticket will appear here and in
                your email once confirmed — you can safely keep this page open.
              </p>
              <Button asChild variant="outline" className="mt-2 w-full">
                <Link href="/tickets">Go to my tickets</Link>
              </Button>
            </>
          )}

          {isFailed && (
            <>
              <h1 className="text-xl font-semibold">Payment not completed</h1>
              <p className="text-muted-foreground">
                Your payment didn&apos;t go through and you were not charged. You can try again
                from the event page.
              </p>
              <Button asChild variant="outline" className="mt-2 w-full">
                <Link href="/events">Browse events</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
