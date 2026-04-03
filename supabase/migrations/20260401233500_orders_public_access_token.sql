-- Close public reads on orders and replace them with token-based lookup via Edge Function
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS public_access_token uuid NOT NULL DEFAULT gen_random_uuid();

DROP POLICY IF EXISTS "Anyone can read orders" ON public.orders;
