-- Permite que utilizadores autenticados (painel admin) apaguem leads
CREATE POLICY "Authenticated users can delete leads" ON public.leads
  FOR DELETE TO authenticated USING (true);
