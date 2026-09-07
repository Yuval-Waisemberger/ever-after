begin;

create extension if not exists pgtap with schema extensions;

select plan(45);

select has_table('public', 'profiles', 'profiles exists');
select has_table('public', 'weddings', 'weddings exists');
select has_table('public', 'vendor_categories', 'vendor categories exist');
select has_table('public', 'vendor_subcategories', 'vendor subcategories exist');
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
select is((select relrowsecurity from pg_class where oid = 'public.vendor_categories'::regclass), true, 'vendor categories have RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.vendor_subcategories'::regclass), true, 'vendor subcategories have RLS enabled');
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
select has_function('public', 'owns_budget_item', array['uuid'], 'budget item ownership helper exists');
select has_function('public', 'owns_assistant_thread', array['uuid'], 'assistant thread ownership helper exists');
select has_function('public', 'can_manage_vendor_media', array['text'], 'vendor media ownership helper exists');

select policies_are(
  'public',
  'profiles',
  array['profiles_select_own', 'profiles_update_own'],
  'profiles expose only own-row policies'
);

select policies_are(
  'public',
  'weddings',
  array['weddings_couple_role', 'weddings_delete_own', 'weddings_insert_own', 'weddings_select_own', 'weddings_update_own'],
  'weddings enforce owner access and Couple role'
);

select policies_are(
  'public',
  'vendor_categories',
  array['categories_public_read'],
  'vendor categories expose only public read'
);

select policies_are(
  'public',
  'vendor_subcategories',
  array['subcategories_public_read'],
  'vendor subcategories expose only public read'
);

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
  array['vendors_insert_role', 'vendors_update_role', 'vendors_delete_role', 'vendors_owner_delete', 'vendors_owner_insert', 'vendors_owner_read', 'vendors_owner_update', 'vendors_public_read'],
  'vendor public/owner policies and Vendor role restrictions are present'
);

select policies_are(
  'public',
  'vendor_images',
  array['vendor_images_owner_delete', 'vendor_images_owner_insert', 'vendor_images_owner_read', 'vendor_images_owner_update', 'vendor_images_public_read'],
  'vendor image owner/public policies are present'
);

select policies_are(
  'public',
  'couple_vendors',
  array['couple_vendors_owner_all', 'couple_vendors_visible_insert'],
  'couple-vendor relationships enforce wedding ownership and visible vendor insertion'
);

select policies_are(
  'public',
  'budget_items',
  array['budget_items_owner_all'],
  'budget items expose only the wedding owner policy'
);

select policies_are(
  'public',
  'payments',
  array['payments_owner_all'],
  'payments expose only the budget owner policy'
);

select policies_are(
  'public',
  'assistant_threads',
  array['assistant_threads_owner_all'],
  'assistant threads expose only the wedding owner policy'
);

select policies_are(
  'public',
  'assistant_messages',
  array['assistant_messages_owner_all'],
  'assistant messages expose only the thread owner policy'
);

select policies_are(
  'storage',
  'objects',
  array['couple_media_owner_delete', 'couple_media_owner_insert', 'couple_media_owner_update', 'couple_media_owner_read', 'vendor_media_owner_delete', 'vendor_media_owner_insert', 'vendor_media_owner_update', 'vendor_media_public_read'],
  'Storage exposes intended public Vendor media and private Couple owner policies'
);

select * from finish();
rollback;
