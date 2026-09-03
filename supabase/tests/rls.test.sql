begin;

create extension if not exists pgtap with schema extensions;

select plan(29);

select has_table('public', 'profiles', 'profiles exists');
select has_table('public', 'weddings', 'weddings exists');
select has_table('public', 'vendor_profiles', 'vendor profiles exist');
select has_table('public', 'vendor_images', 'vendor images exist');
select has_table('public', 'couple_vendors', 'couple-vendor relations exist');
select has_table('public', 'tasks', 'tasks exist');
select has_table('public', 'budget_items', 'budget items exist');
select has_table('public', 'payments', 'payments exist');
select has_table('public', 'reviews', 'reviews exist');
select has_table('public', 'assistant_threads', 'assistant threads exist');
select has_table('public', 'assistant_messages', 'assistant messages exist');

select is(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  true,
  'profiles has RLS enabled'
);
select is((select relrowsecurity from pg_class where oid = 'public.weddings'::regclass), true, 'weddings has RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.vendor_profiles'::regclass), true, 'vendor profiles have RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.vendor_images'::regclass), true, 'vendor images have RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.couple_vendors'::regclass), true, 'couple-vendor relations have RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.tasks'::regclass), true, 'tasks have RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.budget_items'::regclass), true, 'budget items have RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.payments'::regclass), true, 'payments have RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.reviews'::regclass), true, 'reviews have RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.assistant_threads'::regclass), true, 'assistant threads have RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.assistant_messages'::regclass), true, 'assistant messages have RLS enabled');

select has_function('public', 'owns_wedding', array['uuid'], 'wedding ownership helper exists');
select has_function('public', 'owns_vendor', array['uuid'], 'vendor ownership helper exists');
select has_function('public', 'is_couple', array[]::text[], 'couple role helper exists');
select has_function('public', 'is_vendor', array[]::text[], 'vendor role helper exists');

select policies_are(
  'public',
  'tasks',
  array['tasks_owner_all'],
  'tasks expose only the intended ownership policy'
);

select policies_are(
  'public',
  'reviews',
  array['reviews_author_delete', 'reviews_author_insert', 'reviews_author_read', 'reviews_author_update', 'reviews_public_read'],
  'review public/author policies are present'
);

select policies_are(
  'public',
  'vendor_profiles',
  array['vendors_owner_delete', 'vendors_owner_insert', 'vendors_owner_read', 'vendors_owner_update', 'vendors_public_read'],
  'vendor owner/public policies are present'
);

select * from finish();
rollback;
