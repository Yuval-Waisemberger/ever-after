-- Future isolated test database only. NOT executed during the local readiness pass.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(8);

-- Auth insert invokes the unchanged handle_new_user() role/profile initialization.
insert into auth.users (id, email, raw_user_meta_data) values
  ('99000000-0000-4000-8000-000000000001', 'role-couple@example.invalid', '{"role":"couple","display_name":"Role test couple"}'),
  ('99000000-0000-4000-8000-000000000002', 'role-vendor@example.invalid', '{"role":"vendor","display_name":"Role test vendor","business_name":"Role test vendor"}');

set local role authenticated;
select set_config('request.jwt.claim.sub', '99000000-0000-4000-8000-000000000001', true);
select is((select role::text from public.profiles where id = auth.uid()), 'couple', 'Couple initial role is retained');
select throws_ok($$update public.profiles set role = 'vendor' where id = auth.uid()$$, '42501', null, 'Couple cannot self-promote to Vendor');
select lives_ok($$update public.profiles set display_name = 'Edited couple', phone = '+972501234567' where id = auth.uid()$$, 'Couple may edit legitimate fields');
select is((select display_name from public.profiles where id = auth.uid()), 'Edited couple', 'Couple update persisted');

select set_config('request.jwt.claim.sub', '99000000-0000-4000-8000-000000000002', true);
select is((select role::text from public.profiles where id = auth.uid()), 'vendor', 'Vendor initial role is retained');
select throws_ok($$update public.profiles set role = 'couple' where id = auth.uid()$$, '42501', null, 'Vendor cannot change role to Couple');
select lives_ok($$update public.profiles set display_name = 'Edited vendor', phone = '+972501234568' where id = auth.uid()$$, 'Vendor may edit legitimate fields');
select is((select display_name from public.profiles where id = auth.uid()), 'Edited vendor', 'Vendor update persisted');
reset role;
select * from finish();
rollback;
