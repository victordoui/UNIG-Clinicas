-- Política de DELETE para movements
CREATE POLICY "Only admins and managers can delete movements"
  ON movements FOR DELETE
  USING (get_current_user_role() = ANY (ARRAY['admin'::text, 'gerente'::text]));

-- Política de DELETE para alert_suppressions
CREATE POLICY "Only admins and managers can delete alert suppressions"
  ON alert_suppressions FOR DELETE
  USING (get_current_user_role() = ANY (ARRAY['admin'::text, 'gerente'::text]));