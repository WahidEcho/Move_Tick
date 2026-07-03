'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import type { TicketType } from '@/types/database.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Ticket } from 'lucide-react';
import { ConfirmDialog } from '@/components/layout/confirm-dialog';
import { TicketTypeForm } from './ticket-type-form';
import { deleteTicketTypeAction } from './actions';
import { formatEgp } from '@/lib/helpers';

interface TicketsClientProps {
  eventId: string;
  ticketTypes: TicketType[];
  mode: 'button' | 'cards';
}

export function TicketsClient({
  eventId,
  ticketTypes,
  mode,
}: TicketsClientProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editTicketType, setEditTicketType] = useState<TicketType | null>(null);
  const [deleteTicketType, setDeleteTicketType] = useState<TicketType | null>(null);

  const handleSuccess = () => router.refresh();

  const handleDelete = async () => {
    if (!deleteTicketType) return;
    const result = await deleteTicketTypeAction(deleteTicketType.id, eventId);
    if (result.success) {
      setDeleteTicketType(null);
      handleSuccess();
    }
  };

  if (mode === 'button') {
    return (
      <>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Add Ticket Type
        </Button>
        <TicketTypeForm
          eventId={eventId}
          open={addOpen}
          onOpenChange={setAddOpen}
          onSuccess={handleSuccess}
        />
      </>
    );
  }

  return (
    <>
      {ticketTypes.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ticketTypes.map((tt) => (
            <Card key={tt.id} size="sm">
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <CardTitle className="text-base">{tt.name}</CardTitle>
                <div className="flex items-center gap-1">
                  <Badge variant={tt.visibility === 'public' ? 'default' : 'secondary'}>
                    {tt.visibility}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setEditTicketType(tt)}
                    aria-label="Edit"
                  >
                    <Edit className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeleteTicketType(tt)}
                    aria-label="Delete"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Price</span>
                  <span>{formatEgp(tt.price, { freeLabel: null })}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Sold</span>
                  <span>
                    {tt.sold_count ?? 0}
                    {tt.capacity != null ? ` / ${tt.capacity}` : ''}
                  </span>
                </div>
                {tt.capacity != null && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Availability</span>
                    <span>
                      {Math.round(((tt.capacity - (tt.sold_count ?? 0)) / tt.capacity) * 100)}%
                    </span>
                  </div>
                )}
                {(tt.sales_start || tt.sales_end) && (
                  <div className="text-xs text-muted-foreground">
                    {tt.sales_start && (
                      <span>From {format(new Date(tt.sales_start), 'MMM d, yyyy')}</span>
                    )}
                    {tt.sales_start && tt.sales_end && ' — '}
                    {tt.sales_end && (
                      <span>To {format(new Date(tt.sales_end), 'MMM d, yyyy')}</span>
                    )}
                  </div>
                )}
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Max per user</span>
                  <span>{tt.max_per_user ?? 1}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Ticket className="size-12 text-muted-foreground/50" />
            <p className="mt-2 text-sm font-medium">No ticket types yet</p>
            <p className="text-sm text-muted-foreground">
              Add your first ticket type to start selling
            </p>
          </CardContent>
        </Card>
      )}

      {editTicketType && (
        <TicketTypeForm
          eventId={eventId}
          ticketType={editTicketType}
          open={!!editTicketType}
          onOpenChange={(open) => !open && setEditTicketType(null)}
          onSuccess={() => {
            setEditTicketType(null);
            handleSuccess();
          }}
        />
      )}
      <ConfirmDialog
        open={!!deleteTicketType}
        onOpenChange={(open) => !open && setDeleteTicketType(null)}
        title="Delete Ticket Type"
        description={`Are you sure you want to delete "${deleteTicketType?.name}"? This will soft-delete the ticket type.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </>
  );
}
