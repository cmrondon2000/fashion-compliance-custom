
CREATE TYPE public.compliance_status AS ENUM ('compliant', 'pending', 'non-compliant', 'review');

CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT '',
  contact TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  certifications TEXT[] NOT NULL DEFAULT '{}',
  status public.compliance_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Tops',
  supplier TEXT NOT NULL DEFAULT '',
  material TEXT NOT NULL DEFAULT '',
  status public.compliance_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Open access policies (no auth in this demo dashboard)
CREATE POLICY "Public read suppliers" ON public.suppliers FOR SELECT USING (true);
CREATE POLICY "Public insert suppliers" ON public.suppliers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update suppliers" ON public.suppliers FOR UPDATE USING (true);
CREATE POLICY "Public delete suppliers" ON public.suppliers FOR DELETE USING (true);

CREATE POLICY "Public read products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public insert products" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update products" ON public.products FOR UPDATE USING (true);
CREATE POLICY "Public delete products" ON public.products FOR DELETE USING (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER suppliers_touch BEFORE UPDATE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER products_touch BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
