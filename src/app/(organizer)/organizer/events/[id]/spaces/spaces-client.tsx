'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import type { Space } from '@/types/database.types';
import type { SpaceOccupancy } from '@/services/spaces.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Plus, Edit, Archive, MapPin, Users, Clock } from 'lucide-react';
import { ConfirmDialog } from '@/components/layout/confirm-dialog';
import { SpaceForm } from './space-form';
import { archiveSpaceAction } from './actions';

interface SpacesClientProps {
  eventId: string;
  spaces: Space[];
  occupancyMap?: Record<string, SpaceOccupancy>;
  mode: 'button' | 'cards';
}

export function SpacesClient({
  eventId,
  spaces,
  occupancyMap = {},
  mode,
}: SpacesClientProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editSpace, setEditSpace] = useState<Space | null>(null);
  const [archiveSpace, setArchiveSpace] = useState<Space | null>(null);

  const handleSuccess = () => router.refresh();

  const handleArchive = async () => {
    if (!archiveSpace) return;
    const result = await archiveSpaceAction(archiveSpace.id, eventId);
    if (result.success) {
      setArchiveSpace(null);
      handleSuccess();
    }
  };

  if (mode === 'button') {
    return (
      <>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Add Space
        </Button>
        <SpaceForm
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
      {spaces.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {spaces.map((space) => {
            const occ = occupancyMap[space.id];
            const currentInside = occ?.current_inside ?? 0;
            const capacity = space.capacity;
            const progress =
              capacity != null && capacity > 0 ? (currentInside / capacity) * 100 : 0;
            const available = capacity != null ? Math.max(0, capacity - currentInside) : null;

            return (
              <Card key={space.id} size="sm">
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                  <CardTitle className="text-base">{space.name}</CardTitle>
                  <div className="flex items-center gap-1">
                    {space.type && (
                      <Badge variant="secondary" className="text-xs">
                        {space.type}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setEditSpace(space)}
                      aria-label="Edit"
                    >
                      <Edit className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setArchiveSpace(space)}
                      aria-label="Archive"
                    >
                      <Archive className="size-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="size-3.5" />
                    <span>
                      {currentInside} / {capacity ?? '∞'} occupied
                    </span>
                  </div>
                  {capacity != null && (
                    <div className="space-y-1">
                      <Progress value={progress} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {available} spots available
                      </p>
                    </div>
                  )}
                  {(space.start_time || space.end_time) && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      {space.start_time && (
                        <span>
                          {format(new Date(space.start_time), 'MMM d, HH:mm')}
                        </span>
                      )}
                      {space.start_time && space.end_time && ' — '}
                      {space.end_time && (
                        <span>
                          {format(new Date(space.end_time), 'MMM d, HH:mm')}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex gap-1 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {space.registration_mode.replace(/_/g, ' ')}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {space.visibility.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MapPin className="size-12 text-muted-foreground/50" />
            <p className="mt-2 text-sm font-medium">No spaces yet</p>
            <p className="text-sm text-muted-foreground">
              Add spaces to manage capacity and occupancy
            </p>
            <SpacesClient eventId={eventId} spaces={[]} mode="button" />
          </CardContent>
        </Card>
      )}

      {editSpace && (
        <SpaceForm
          eventId={eventId}
          space={editSpace}
          open={!!editSpace}
          onOpenChange={(open) => !open && setEditSpace(null)}
          onSuccess={() => {
            setEditSpace(null);
            handleSuccess();
          }}
        />
      )}
      <ConfirmDialog
        open={!!archiveSpace}
        onOpenChange={(open) => !open && setArchiveSpace(null)}
        title="Archive Space"
        description={`Are you sure you want to archive "${archiveSpace?.name}"?`}
        confirmLabel="Archive"
        variant="destructive"
        onConfirm={handleArchive}
      />
    </>
  );
}
