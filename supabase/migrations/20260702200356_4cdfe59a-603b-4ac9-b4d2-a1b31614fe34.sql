
-- Adicionar Estabilizador em Tecnologia / TI (se ainda não existe)
INSERT INTO public.asset_types (category_id, name)
SELECT c.id, 'Estabilizador'
FROM public.asset_categories c
WHERE c.name = 'Tecnologia / TI'
  AND NOT EXISTS (
    SELECT 1 FROM public.asset_types t
    WHERE t.category_id = c.id AND t.name = 'Estabilizador'
  );

-- Remover categorias duplicadas vazias (somente se não tiverem tipos nem assets vinculados)
DELETE FROM public.asset_categories c
WHERE c.name IN ('Hidráulico', 'Segurança')
  AND NOT EXISTS (SELECT 1 FROM public.asset_types t WHERE t.category_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM public.assets a WHERE a.category_id = c.id);
