-- Clientes do painel CEO (cada projeto / marca = 1 linha)
CREATE TABLE IF NOT EXISTS public.ceo_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  api_key_hash text NOT NULL UNIQUE,
  ceo_password_hash text,
  active boolean NOT NULL DEFAULT true
);

COMMENT ON TABLE public.ceo_clients IS 'Projetos ligados ao painel CEO; pedidos/leads filtrados por client_id.';

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.ceo_clients(id) ON DELETE SET NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.ceo_clients(id) ON DELETE SET NULL;
ALTER TABLE public.whatsapp_clicks ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.ceo_clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_client_id ON public.orders(client_id);
CREATE INDEX IF NOT EXISTS idx_leads_client_id ON public.leads(client_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_clicks_client_id ON public.whatsapp_clicks(client_id);
