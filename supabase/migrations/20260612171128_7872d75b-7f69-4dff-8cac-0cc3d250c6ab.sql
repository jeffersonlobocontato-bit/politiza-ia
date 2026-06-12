update public.candidates set photo_url='https://sumdjlmjtqgfzkcfkceq.supabase.co/storage/v1/object/public/candidate-photos/sergio-moro.jpg' where id='994166eb-4e08-42e2-8e1f-d88184aad9ec';

create policy "Users read own avatar" on storage.objects for select to authenticated using (bucket_id = 'user-avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users upload own avatar" on storage.objects for insert to authenticated with check (bucket_id = 'user-avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users update own avatar" on storage.objects for update to authenticated using (bucket_id = 'user-avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users delete own avatar" on storage.objects for delete to authenticated using (bucket_id = 'user-avatars' and (storage.foldername(name))[1] = auth.uid()::text);