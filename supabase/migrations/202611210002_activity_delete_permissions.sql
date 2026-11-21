-- Allow active workspace members to remove manually logged work notes from a client timeline.
-- Keep the existing admin-only policy in place for payment/system activity records.
drop policy if exists "activities: writers delete work notes" on public.lead_activities;
create policy "activities: writers delete work notes"
  on public.lead_activities
  for delete
  to authenticated
  using (private.can_write(workspace_id) and type in ('work', 'note'));
