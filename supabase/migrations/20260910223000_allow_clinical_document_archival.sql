-- Archival is the only lifecycle action needed for documents; physical deletion
-- remains intentionally unavailable.
create policy documents_update on public.documents
for update to authenticated
using (private.has_permission(organization_id, 'clinical.write'))
with check (private.has_permission(organization_id, 'clinical.write'));
