UPDATE public.political_assets
SET type = 'lideranca_comunitaria',
    observations = COALESCE(observations,'') || ' [Reclassificado: prefeito real do município já cadastrado]'
WHERE id IN (
  'eaddb461-935a-425b-8bb0-1df7a985af08',
  '10f04476-bdd7-4830-b796-b555f5c888bb',
  '09ad3a61-931f-4b61-9fd2-96425c0552b4',
  '7348b0c0-5be3-4054-b195-a9b1369dffdd',
  '31cd5316-5cfe-43eb-8d49-f6a6b5b9ead7',
  '5639bc79-1482-4bcb-a136-523460266e95',
  'd4875226-4f75-42ae-9214-a503af4e9c34',
  '5716a276-4ad4-4682-941f-deb5f3d61d0c'
);