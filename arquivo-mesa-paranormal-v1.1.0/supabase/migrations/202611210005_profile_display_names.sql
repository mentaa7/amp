-- v1.3.1: permitir que membros da mesma campanha vejam os nomes públicos uns dos outros.
-- Não expõe e-mails nem dados privados; apenas id e display_name.
GRANT SELECT ON TABLE public.profiles TO authenticated;

DROP POLICY IF EXISTS "campaign members can read participant profiles" ON public.profiles;
CREATE POLICY "campaign members can read participant profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.campaign_members cm
    WHERE cm.user_id = profiles.id
      AND public.is_campaign_member(cm.campaign_id)
  )
);
