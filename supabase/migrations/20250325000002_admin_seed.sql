-- Create profile for Jefferson
INSERT INTO public.profiles (id, full_name, email)
VALUES ('1f80b89a-4a40-4e2a-941e-d79f7914fdfb', 'Jefferson Lobo', 'jeffersonlobocontato@gmail.com')
ON CONFLICT (id) DO UPDATE SET full_name = 'Jefferson Lobo', email = 'jeffersonlobocontato@gmail.com';

-- Grant admin_master role
INSERT INTO public.user_roles (user_id, role)
VALUES ('1f80b89a-4a40-4e2a-941e-d79f7914fdfb', 'admin_master')
ON CONFLICT (user_id, role) DO NOTHING;

SELECT 'Admin setup complete' as status;
