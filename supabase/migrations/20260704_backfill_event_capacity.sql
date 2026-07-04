-- Applied to production 2026-07-04 as backfill_event_capacity_from_ticket_types.
-- events.capacity is now DERIVED from active ticket types (sum of their
-- capacities; NULL/unlimited when any active type is uncapped or none exist).
-- App-side: recomputeEventCapacity() in tickets.service.ts keeps it in sync on
-- every ticket-type create/update/delete. One-time backfill below.

UPDATE events e
SET capacity = sub.total, updated_at = NOW()
FROM (
  SELECT event_id,
         CASE WHEN bool_or(capacity IS NULL) THEN NULL ELSE SUM(capacity)::int END AS total
  FROM ticket_types
  WHERE is_active
  GROUP BY event_id
) sub
WHERE e.id = sub.event_id
  AND e.capacity IS DISTINCT FROM sub.total;

UPDATE events e
SET capacity = NULL, updated_at = NOW()
WHERE e.capacity IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM ticket_types t WHERE t.event_id = e.id AND t.is_active
  );
