
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category_id uuid NULL REFERENCES public.asset_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS type_id     uuid NULL REFERENCES public.asset_types(id)      ON DELETE SET NULL;

ALTER TABLE public.ci_items
  ADD COLUMN IF NOT EXISTS category_id uuid NULL REFERENCES public.asset_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS type_id     uuid NULL REFERENCES public.asset_types(id)      ON DELETE SET NULL;

ALTER TABLE public.operational_demands
  ADD COLUMN IF NOT EXISTS category_id uuid NULL REFERENCES public.asset_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS type_id     uuid NULL REFERENCES public.asset_types(id)      ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_category_id           ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_ci_items_category_id           ON public.ci_items(category_id);
CREATE INDEX IF NOT EXISTS idx_operational_demands_category_id ON public.operational_demands(category_id);
