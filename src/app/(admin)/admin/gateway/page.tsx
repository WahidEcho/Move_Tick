import { requireAdmin } from '@/lib/auth';
import { getGatewayReconciliation } from '@/services/settlements.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

function money(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface GatewayPageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

/**
 * XPay reconciliation — the bank-reference view. Shows, per event and in
 * total, what buyers were charged, what XPay deducts (fee model from platform
 * settings), and what should actually arrive in the Move Beyond bank account.
 */
export default async function GatewayPage({ searchParams }: GatewayPageProps) {
  await requireAdmin();
  const params = await searchParams;
  const from = params.from || undefined;
  const to = params.to ? `${params.to}T23:59:59` : undefined;

  const recon = await getGatewayReconciliation({ from, to });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Gateway — XPay</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            What XPay collects, deducts ({recon.feePercentage}% + {money(recon.feeFixedEgp)} EGP per transaction),
            and settles to the bank. Your reference for the number that actually lands in the account.
          </p>
        </div>
        <form className="flex items-end gap-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">From</label>
            <Input type="date" name="from" defaultValue={params.from ?? ''} className="h-9" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">To</label>
            <Input type="date" name="to" defaultValue={params.to ?? ''} className="h-9" />
          </div>
          <Button type="submit" variant="outline" size="sm" className="h-9">
            Apply
          </Button>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gross collected by XPay</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{money(recon.totals.grossCollected)} EGP</p>
            <p className="mt-1 text-xs text-muted-foreground">{recon.totals.transactions} successful transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">XPay deduction (est.)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-destructive">−{money(recon.totals.estimatedXpayFee)} EGP</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {recon.feePercentage}% + {money(recon.feeFixedEgp)} EGP × {recon.totals.transactions}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expected in bank</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{money(recon.totals.expectedBankNet)} EGP</p>
            <p className="mt-1 text-xs text-muted-foreground">gross − XPay deduction</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Move Beyond margin</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{money(recon.totals.platformMargin)} EGP</p>
            <p className="mt-1 text-xs text-muted-foreground">
              after paying organizers {money(recon.totals.owedToOrganizers)} EGP
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per event</CardTitle>
        </CardHeader>
        <CardContent>
          {recon.rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No XPay transactions in this period yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-4">Event</th>
                    <th className="py-2 pr-4">Organization</th>
                    <th className="py-2 pr-4 text-right">Txns</th>
                    <th className="py-2 pr-4 text-right">Gross (EGP)</th>
                    <th className="py-2 pr-4 text-right">XPay fee (EGP)</th>
                    <th className="py-2 pr-4 text-right">Bank net (EGP)</th>
                    <th className="py-2 text-right">Refunded (EGP)</th>
                  </tr>
                </thead>
                <tbody>
                  {recon.rows.map((r) => (
                    <tr key={r.eventId} className="border-b border-border/50">
                      <td className="py-2.5 pr-4 font-medium">{r.eventTitle}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{r.organizationName}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{r.transactions}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{money(r.grossCollected)}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-destructive">
                        −{money(r.estimatedXpayFee)}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-medium tabular-nums">{money(r.expectedBankNet)}</td>
                      <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                        {r.refundedAmount > 0 ? `${money(r.refundedAmount)} (${r.refundedTransactions})` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Fees are estimated from the configured XPay pricing — refunded amounts are excluded from the bank-net
            estimate because XPay&rsquo;s fee treatment on refunds isn&rsquo;t exposed. Reconcile against the XPay
            dashboard statement monthly.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
