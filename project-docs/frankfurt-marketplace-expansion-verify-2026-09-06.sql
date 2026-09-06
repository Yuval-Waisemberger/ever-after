-- Read-only verification for the Frankfurt Marketplace expansion delta
-- Source checkpoint: 2049d20a7e676cf0936dc5a656ded47156ed3713
-- This file performs aggregate, non-personal checks only and makes no changes.

with
expected_original_vendor_ids (id) as (
  select (
    '30000000-0000-4000-8000-' ||
    lpad((1000 + series_number)::text, 12, '0')
  )::uuid
  from generate_series(1, 432) as series_number
),
expected_images (vendor_id, external_url) as (
  values
    ('30000000-0000-4000-8000-000000001433', '/demo-marketplace/wedding-cakes/moon-cakes-workshop-01-primary.webp'),
    ('30000000-0000-4000-8000-000000001434', '/demo-marketplace/wedding-cakes/sage-cakes-atelier-02-primary.webp'),
    ('30000000-0000-4000-8000-000000001435', '/demo-marketplace/wedding-cakes/fig-cakes-collective-03-primary.webp'),
    ('30000000-0000-4000-8000-000000001436', '/demo-marketplace/wedding-cakes/terra-cakes-house-04-primary.webp'),
    ('30000000-0000-4000-8000-000000001437', '/demo-marketplace/wedding-cakes/north-cakes-project-05-primary.webp'),
    ('30000000-0000-4000-8000-000000001438', '/demo-marketplace/wedding-cakes/south-cakes-studio-06-primary.webp'),
    ('30000000-0000-4000-8000-000000001439', '/demo-marketplace/wedding-cakes/harbor-cakes-works-07-primary.webp'),
    ('30000000-0000-4000-8000-000000001440', '/demo-marketplace/wedding-cakes/juniper-cakes-and-co-08-primary.webp'),
    ('30000000-0000-4000-8000-000000001441', '/demo-marketplace/dessert-tables/south-desserts-house-01-primary.webp'),
    ('30000000-0000-4000-8000-000000001442', '/demo-marketplace/dessert-tables/harbor-desserts-project-02-primary.webp'),
    ('30000000-0000-4000-8000-000000001443', '/demo-marketplace/dessert-tables/juniper-desserts-studio-03-primary.webp'),
    ('30000000-0000-4000-8000-000000001444', '/demo-marketplace/dessert-tables/linen-desserts-works-04-primary.webp'),
    ('30000000-0000-4000-8000-000000001445', '/demo-marketplace/dessert-tables/orchid-desserts-and-co-05-primary.webp'),
    ('30000000-0000-4000-8000-000000001446', '/demo-marketplace/dessert-tables/amber-desserts-workshop-06-primary.webp'),
    ('30000000-0000-4000-8000-000000001447', '/demo-marketplace/dessert-tables/silver-desserts-atelier-07-primary.webp'),
    ('30000000-0000-4000-8000-000000001448', '/demo-marketplace/dessert-tables/aster-desserts-collective-08-primary.webp'),
    ('30000000-0000-4000-8000-000000001449', '/demo-marketplace/pastry-patisserie/amber-patisserie-works-01-primary.webp'),
    ('30000000-0000-4000-8000-000000001450', '/demo-marketplace/pastry-patisserie/silver-patisserie-and-co-02-primary.webp'),
    ('30000000-0000-4000-8000-000000001451', '/demo-marketplace/pastry-patisserie/aster-patisserie-workshop-03-primary.webp'),
    ('30000000-0000-4000-8000-000000001452', '/demo-marketplace/pastry-patisserie/cypress-patisserie-atelier-04-primary.webp'),
    ('30000000-0000-4000-8000-000000001453', '/demo-marketplace/pastry-patisserie/honey-patisserie-collective-05-primary.webp'),
    ('30000000-0000-4000-8000-000000001454', '/demo-marketplace/pastry-patisserie/canvas-patisserie-house-06-primary.webp'),
    ('30000000-0000-4000-8000-000000001455', '/demo-marketplace/pastry-patisserie/rimon-patisserie-project-07-primary.webp'),
    ('30000000-0000-4000-8000-000000001456', '/demo-marketplace/pastry-patisserie/sol-patisserie-studio-08-primary.webp'),
    ('30000000-0000-4000-8000-000000001457', '/demo-marketplace/custom-sweets/canvas-confections-atelier-01-primary.webp'),
    ('30000000-0000-4000-8000-000000001458', '/demo-marketplace/custom-sweets/rimon-confections-collective-02-primary.webp'),
    ('30000000-0000-4000-8000-000000001459', '/demo-marketplace/custom-sweets/sol-confections-house-03-primary.webp'),
    ('30000000-0000-4000-8000-000000001460', '/demo-marketplace/custom-sweets/tamar-confections-project-04-primary.webp'),
    ('30000000-0000-4000-8000-000000001461', '/demo-marketplace/custom-sweets/indigo-confections-studio-05-primary.webp'),
    ('30000000-0000-4000-8000-000000001462', '/demo-marketplace/custom-sweets/willow-confections-works-06-primary.webp'),
    ('30000000-0000-4000-8000-000000001463', '/demo-marketplace/custom-sweets/kinneret-confections-and-co-07-primary.webp'),
    ('30000000-0000-4000-8000-000000001464', '/demo-marketplace/custom-sweets/jasmine-confections-workshop-08-primary.webp'),
    ('30000000-0000-4000-8000-000000001465', '/demo-marketplace/dance-floor-accessories/willow-party-goods-project-01-primary.webp'),
    ('30000000-0000-4000-8000-000000001466', '/demo-marketplace/dance-floor-accessories/kinneret-party-goods-studio-02-primary.webp'),
    ('30000000-0000-4000-8000-000000001467', '/demo-marketplace/dance-floor-accessories/jasmine-party-goods-works-03-primary.webp'),
    ('30000000-0000-4000-8000-000000001468', '/demo-marketplace/dance-floor-accessories/dune-party-goods-and-co-04-primary.webp'),
    ('30000000-0000-4000-8000-000000001469', '/demo-marketplace/dance-floor-accessories/grove-party-goods-workshop-05-primary.webp'),
    ('30000000-0000-4000-8000-000000001470', '/demo-marketplace/dance-floor-accessories/alma-party-goods-atelier-06-primary.webp'),
    ('30000000-0000-4000-8000-000000001471', '/demo-marketplace/dance-floor-accessories/cedar-party-goods-collective-07-primary.webp'),
    ('30000000-0000-4000-8000-000000001472', '/demo-marketplace/dance-floor-accessories/luna-party-goods-house-08-primary.webp'),
    ('30000000-0000-4000-8000-000000001473', '/demo-marketplace/glow-accessories/alma-glow-and-co-01-primary.webp'),
    ('30000000-0000-4000-8000-000000001474', '/demo-marketplace/glow-accessories/cedar-glow-workshop-02-primary.webp'),
    ('30000000-0000-4000-8000-000000001475', '/demo-marketplace/glow-accessories/luna-glow-atelier-03-primary.webp'),
    ('30000000-0000-4000-8000-000000001476', '/demo-marketplace/glow-accessories/noya-glow-collective-04-primary.webp'),
    ('30000000-0000-4000-8000-000000001477', '/demo-marketplace/glow-accessories/olive-glow-house-05-primary.webp'),
    ('30000000-0000-4000-8000-000000001478', '/demo-marketplace/glow-accessories/dawn-glow-project-06-primary.webp'),
    ('30000000-0000-4000-8000-000000001479', '/demo-marketplace/glow-accessories/carmel-glow-studio-07-primary.webp'),
    ('30000000-0000-4000-8000-000000001480', '/demo-marketplace/glow-accessories/arava-glow-works-08-primary.webp'),
    ('30000000-0000-4000-8000-000000001481', '/demo-marketplace/guest-comfort-accessories/dawn-guest-comfort-collective-01-primary.webp'),
    ('30000000-0000-4000-8000-000000001482', '/demo-marketplace/guest-comfort-accessories/carmel-guest-comfort-house-02-primary.webp'),
    ('30000000-0000-4000-8000-000000001483', '/demo-marketplace/guest-comfort-accessories/arava-guest-comfort-project-03-primary.webp'),
    ('30000000-0000-4000-8000-000000001484', '/demo-marketplace/guest-comfort-accessories/lark-guest-comfort-studio-04-primary.webp'),
    ('30000000-0000-4000-8000-000000001485', '/demo-marketplace/guest-comfort-accessories/pomegranate-guest-comfort-works-05-primary.webp'),
    ('30000000-0000-4000-8000-000000001486', '/demo-marketplace/guest-comfort-accessories/velvet-guest-comfort-and-co-06-primary.webp'),
    ('30000000-0000-4000-8000-000000001487', '/demo-marketplace/guest-comfort-accessories/mosaic-guest-comfort-workshop-07-primary.webp'),
    ('30000000-0000-4000-8000-000000001488', '/demo-marketplace/guest-comfort-accessories/golden-guest-comfort-atelier-08-primary.webp'),
    ('30000000-0000-4000-8000-000000001489', '/demo-marketplace/party-props-giveaways/velvet-extras-studio-01-primary.webp'),
    ('30000000-0000-4000-8000-000000001490', '/demo-marketplace/party-props-giveaways/mosaic-extras-works-02-primary.webp'),
    ('30000000-0000-4000-8000-000000001491', '/demo-marketplace/party-props-giveaways/golden-extras-and-co-03-primary.webp'),
    ('30000000-0000-4000-8000-000000001492', '/demo-marketplace/party-props-giveaways/quiet-extras-workshop-04-primary.webp'),
    ('30000000-0000-4000-8000-000000001493', '/demo-marketplace/party-props-giveaways/wild-extras-atelier-05-primary.webp'),
    ('30000000-0000-4000-8000-000000001494', '/demo-marketplace/party-props-giveaways/moon-extras-collective-06-primary.webp'),
    ('30000000-0000-4000-8000-000000001495', '/demo-marketplace/party-props-giveaways/sage-extras-house-07-primary.webp'),
    ('30000000-0000-4000-8000-000000001496', '/demo-marketplace/party-props-giveaways/fig-extras-project-08-primary.webp')
),
expected_identities (id, slug, business_name) as (
  values
    ('30000000-0000-4000-8000-000000001090', 'orchid-magnets-atelier-10', 'LumaPrint'),
    ('30000000-0000-4000-8000-000000001119', 'kinneret-social-house-17', 'Rega Social'),
    ('30000000-0000-4000-8000-000000001163', 'carmel-experiences-atelier-17', 'Tandem Live'),
    ('30000000-0000-4000-8000-000000001168', 'mosaic-experiences-works-22', 'Simcha Nova Wedding Entertainment'),
    ('30000000-0000-4000-8000-000000001361', 'mosaic-transit-project-17', 'Derech')
),
checks (check_name, actual_value, expected_value, passed) as (
  select 'top_level_category_count', count(*)::text, '8', count(*) = 8
  from public.vendor_categories

  union all
  select 'subcategory_count', count(*)::text, '27', count(*) = 27
  from public.vendor_subcategories

  union all
  select 'marketplace_vendor_count', count(*)::text, '496', count(*) = 496
  from public.vendor_profiles

  union all
  select 'vendor_image_count', count(*)::text, '496', count(*) = 496
  from public.vendor_images

  union all
  select 'review_count', count(*)::text, '2727', count(*) = 2727
  from public.reviews

  union all
  select 'cakes_and_desserts_vendor_count', count(*)::text, '32', count(*) = 32
  from public.vendor_profiles as vendor
  join public.vendor_categories as category on category.id = vendor.category_id
  where category.slug = 'cakes-desserts'

  union all
  select 'wedding_accessories_party_extras_vendor_count', count(*)::text, '32', count(*) = 32
  from public.vendor_profiles as vendor
  join public.vendor_categories as category on category.id = vendor.category_id
  where category.slug = 'wedding-accessories-party-extras'

  union all
  select 'wedding_cakes_vendor_count', count(*)::text, '8', count(*) = 8
  from public.vendor_profiles as vendor
  join public.vendor_subcategories as subcategory on subcategory.id = vendor.subcategory_id
  where subcategory.slug = 'wedding-cakes'

  union all
  select 'dessert_tables_vendor_count', count(*)::text, '8', count(*) = 8
  from public.vendor_profiles as vendor
  join public.vendor_subcategories as subcategory on subcategory.id = vendor.subcategory_id
  where subcategory.slug = 'dessert-tables'

  union all
  select 'pastry_patisserie_vendor_count', count(*)::text, '8', count(*) = 8
  from public.vendor_profiles as vendor
  join public.vendor_subcategories as subcategory on subcategory.id = vendor.subcategory_id
  where subcategory.slug = 'pastry-patisserie'

  union all
  select 'custom_sweets_confectionery_vendor_count', count(*)::text, '8', count(*) = 8
  from public.vendor_profiles as vendor
  join public.vendor_subcategories as subcategory on subcategory.id = vendor.subcategory_id
  where subcategory.slug = 'custom-sweets'

  union all
  select 'dance_floor_accessories_vendor_count', count(*)::text, '8', count(*) = 8
  from public.vendor_profiles as vendor
  join public.vendor_subcategories as subcategory on subcategory.id = vendor.subcategory_id
  where subcategory.slug = 'dance-floor-accessories'

  union all
  select 'glow_light_up_accessories_vendor_count', count(*)::text, '8', count(*) = 8
  from public.vendor_profiles as vendor
  join public.vendor_subcategories as subcategory on subcategory.id = vendor.subcategory_id
  where subcategory.slug = 'glow-accessories'

  union all
  select 'guest_comfort_accessories_vendor_count', count(*)::text, '8', count(*) = 8
  from public.vendor_profiles as vendor
  join public.vendor_subcategories as subcategory on subcategory.id = vendor.subcategory_id
  where subcategory.slug = 'guest-comfort-accessories'

  union all
  select 'party_props_giveaways_vendor_count', count(*)::text, '8', count(*) = 8
  from public.vendor_profiles as vendor
  join public.vendor_subcategories as subcategory on subcategory.id = vendor.subcategory_id
  where subcategory.slug = 'party-props-giveaways'

  union all
  select 'new_vendor_count', count(*)::text, '64', count(*) = 64
  from public.vendor_profiles as vendor
  where vendor.id in (select vendor_id::uuid from expected_images)

  union all
  select 'new_vendor_review_count', count(*)::text, '344', count(*) = 344
  from public.reviews as review
  where review.vendor_id in (select vendor_id::uuid from expected_images)

  union all
  select 'new_vendor_missing_count', count(*)::text, '0', count(*) = 0
  from expected_images as expected
  left join public.vendor_profiles as vendor on vendor.id = expected.vendor_id::uuid
  where vendor.id is null

  union all
  select 'new_primary_image_count', count(*)::text, '64', count(*) = 64
  from public.vendor_images as image
  where image.vendor_id in (select vendor_id::uuid from expected_images)
    and image.is_primary is true

  union all
  select 'new_image_mapping_mismatch_count', count(*)::text, '0', count(*) = 0
  from expected_images as expected
  left join public.vendor_images as image
    on image.vendor_id = expected.vendor_id::uuid
   and image.external_url = expected.external_url
   and image.is_primary is true
  where image.id is null

  union all
  select 'new_vendor_non_single_primary_count', count(*)::text, '0', count(*) = 0
  from (
    select image.vendor_id
    from public.vendor_images as image
    where image.vendor_id in (select vendor_id::uuid from expected_images)
      and image.is_primary is true
    group by image.vendor_id
    having count(*) <> 1
  ) as invalid_primary_count

  union all
  select 'approved_identity_match_count', count(*)::text, '5', count(*) = 5
  from expected_identities as expected
  join public.vendor_profiles as vendor
    on vendor.id = expected.id::uuid
   and vendor.slug = expected.slug
   and vendor.business_name = expected.business_name

  union all
  select 'original_vendor_id_count', count(*)::text, '432', count(*) = 432
  from public.vendor_profiles as vendor
  where vendor.id in (select id from expected_original_vendor_ids)

  union all
  select 'duplicate_business_name_group_count', count(*)::text, '0', count(*) = 0
  from (
    select lower(regexp_replace(trim(business_name), '[^[:alnum:]]+', '', 'g')) as normalized_name
    from public.vendor_profiles
    group by lower(regexp_replace(trim(business_name), '[^[:alnum:]]+', '', 'g'))
    having count(*) > 1
  ) as duplicate_names

  union all
  select 'profile_count', count(*)::text, '1', count(*) = 1
  from public.profiles

  union all
  select 'wedding_count', count(*)::text, '1', count(*) = 1
  from public.weddings

  union all
  select 'couple_vendor_count', count(*)::text, '3', count(*) = 3
  from public.couple_vendors

  union all
  select 'saved_relationship_count', count(*)::text, '2', count(*) = 2
  from public.couple_vendors
  where is_saved is true

  union all
  select 'booked_relationship_count', count(*)::text, '1', count(*) = 1
  from public.couple_vendors
  where status = 'booked'

  union all
  select 'budget_item_count', count(*)::text, '1', count(*) = 1
  from public.budget_items

  union all
  select 'payment_count', count(*)::text, '1', count(*) = 1
  from public.payments

  union all
  select 'task_count', count(*)::text, '4', count(*) = 4
  from public.tasks

  union all
  select 'orphaned_couple_vendor_source_count', count(*)::text, '0', count(*) = 0
  from public.couple_vendors as relationship
  left join public.vendor_profiles as marketplace_vendor
    on marketplace_vendor.id = relationship.vendor_id
  left join public.external_vendors as external_vendor
    on external_vendor.id = relationship.external_vendor_id
  where (relationship.vendor_id is not null and marketplace_vendor.id is null)
     or (relationship.external_vendor_id is not null and external_vendor.id is null)
)
select check_name, actual_value, expected_value, passed
from checks
order by check_name;
