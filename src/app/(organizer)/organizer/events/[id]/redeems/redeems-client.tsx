'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { RedeemItem } from '@/types/database.types';
import type { TicketType } from '@/types/database.types';
import type { EventRedeemMapping } from '@/services/redeems.service';
import type { RedeemSummaryItem } from '@/services/redeems.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/tables/data-table';
import { Gift, Plus, Link2, Trash2 } from 'lucide-react';
import { RedeemForm } from './redeem-form';
import { MappingForm } from './mapping-form';
import { ConfirmDialog } from '@/components/layout/confirm-dialog';
import {
  deleteRedeemItemAction,
  removeRedeemMappingAction,
} from './actions';

interface RedeemsClientProps {
  eventId: string;
  redeemItems: RedeemItem[];
  ticketTypes: TicketType[];
  mappings: EventRedeemMapping[];
  redeemSummary: RedeemSummaryItem[];
}

export function RedeemsClient({
  eventId,
  redeemItems,
  ticketTypes,
  mappings,
  redeemSummary,
}: RedeemsClientProps) {
  const router = useRouter();
  const [addRedeemOpen, setAddRedeemOpen] = useState(false);
  const [mappingOpen, setMappingOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<RedeemItem | null>(null);
  const [removeMapping, setRemoveMapping] = useState<EventRedeemMapping | null>(null);

  const handleSuccess = () => router.refresh();

  const handleDeleteRedeem = async () => {
    if (!deleteItem) return;
    const result = await deleteRedeemItemAction(deleteItem.id, eventId);
    if (result.success) {
      setDeleteItem(null);
      handleSuccess();
    }
  };

  const handleRemoveMapping = async () => {
    if (!removeMapping) return;
    const result = await removeRedeemMappingAction(eventId, removeMapping.id);
    if (result.success) {
      setRemoveMapping(null);
      handleSuccess();
    }
  };

  const mappingColumns = [
    { key: 'ticket_type_name', label: 'Ticket Type', render: (r: EventRedeemMapping) => r.ticket_type_name },
    { key: 'redeem_item_name', label: 'Redeem Item', render: (r: EventRedeemMapping) => r.redeem_item_name },
    { key: 'quantity_allowed', label: 'Quantity', render: (r: EventRedeemMapping) => r.quantity_allowed },
    {
      key: 'actions',
      label: 'Actions',
      render: (r: EventRedeemMapping) => (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setRemoveMapping(r)}
          aria-label="Remove mapping"
        >
          <Trash2 className="size-3.5" />
        </Button>
      ),
    },
  ];

  const summaryColumns = [
    { key: 'item_name', label: 'Item', render: (r: RedeemSummaryItem) => r.item_name },
    { key: 'total_allowed', label: 'Allowed', render: (r: RedeemSummaryItem) => r.total_allowed },
    { key: 'total_redeemed', label: 'Redeemed', render: (r: RedeemSummaryItem) => r.total_redeemed },
    { key: 'total_remaining', label: 'Remaining', render: (r: RedeemSummaryItem) => r.total_remaining },
  ];

  return (
    <div className="space-y-6">
      {/* Redeem Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Redeem Items</CardTitle>
            <p className="text-sm text-muted-foreground">
              Manage redeemable items for your event
            </p>
          </div>
          <Button size="sm" onClick={() => setAddRedeemOpen(true)}>
            <Plus className="size-4" />
            Add Redeem Item
          </Button>
        </CardHeader>
        <CardContent>
          {redeemItems.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {redeemItems.map((item) => (
                <Card key={item.id} size="sm" className="relative">
                  <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{item.name}</CardTitle>
                      {item.category && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {item.category}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleteItem(item)}
                      aria-label="Delete"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {item.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    {item.station && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Station: {item.station}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Gift className="size-12 text-muted-foreground/50" />
              <p className="mt-2 text-sm font-medium">No redeem items yet</p>
              <p className="text-sm text-muted-foreground">
                Add redeem items to offer perks to ticket holders
              </p>
              <Button
                size="sm"
                className="mt-4"
                onClick={() => setAddRedeemOpen(true)}
              >
                <Plus className="size-4" />
                Add Redeem Item
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ticket Type Mappings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Ticket Type Mappings</CardTitle>
            <p className="text-sm text-muted-foreground">
              Map redeem items to ticket types with quantities
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setMappingOpen(true)}
            disabled={ticketTypes.length === 0 || redeemItems.length === 0}
          >
            <Link2 className="size-4" />
            Map to Ticket Type
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={mappingColumns}
            data={mappings}
            emptyMessage="No mappings yet. Add redeem items and ticket types first."
          />
        </CardContent>
      </Card>

      {/* Redeem Summary */}
      {redeemSummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Redeem Summary</CardTitle>
            <p className="text-sm text-muted-foreground">
              Allowed, redeemed, and remaining by item
            </p>
          </CardHeader>
          <CardContent>
            <DataTable columns={summaryColumns} data={redeemSummary} />
          </CardContent>
        </Card>
      )}

      <RedeemForm
        eventId={eventId}
        open={addRedeemOpen}
        onOpenChange={setAddRedeemOpen}
        onSuccess={handleSuccess}
      />
      <MappingForm
        eventId={eventId}
        ticketTypes={ticketTypes}
        redeemItems={redeemItems}
        open={mappingOpen}
        onOpenChange={setMappingOpen}
        onSuccess={handleSuccess}
      />
      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={(open) => !open && setDeleteItem(null)}
        title="Delete Redeem Item"
        description={`Are you sure you want to delete "${deleteItem?.name}"?`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteRedeem}
      />
      <ConfirmDialog
        open={!!removeMapping}
        onOpenChange={(open) => !open && setRemoveMapping(null)}
        title="Remove Mapping"
        description={`Remove ${removeMapping?.redeem_item_name} from ${removeMapping?.ticket_type_name}?`}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={handleRemoveMapping}
      />
    </div>
  );
}
