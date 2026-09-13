"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { saveVendorProfile } from "@/lib/actions/vendor-profile";
import { initialActionState } from "@/lib/actions/state";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { calculateVendorProfileCompletion } from "@/lib/domain/vendor-profile";
import { VendorNumber, VendorReveal } from "./vendor-motion";
import { VendorSaveFeedback } from "./vendor-save-feedback";
import type { ActionState } from "@/lib/actions/state";
import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { EVENT_TYPES, WEDDING_STYLES } from "@/lib/validation/wedding";
import { VENDOR_AREA_LABELS, VENDOR_AREA_VALUES, locationModeForSubcategory } from "@/lib/vendors/location";
import type { OwnedVendorProfile, VendorTaxonomy } from "@/lib/queries/vendor-dashboard";
import { VendorProfileImage, type VendorProfileImageHandle } from "./vendor-profile-image";

const profileFormId = "vendor-business-profile-form";

export function VendorProfileForm({ profile, taxonomy, identity, gallery }: { profile: OwnedVendorProfile | null; taxonomy: VendorTaxonomy; identity?: { vendorId: string; photoUrl: string | null; businessName: string }; gallery?: ReactNode }) {
  const [dirty, setDirty] = useState(false);
  const profileImage = useRef<VendorProfileImageHandle>(null);
  const [state, action, pending] = useActionState(async (previous: ActionState & { publishedNow?: boolean }, data: FormData) => {
    const publishing = !profile?.is_public && data.get("isPublic") === "on";
    const imageSelectionError = profileImage.current?.getSelectionError();
    if (imageSelectionError) return { ...imageSelectionError, publishedNow: false };
    const result = await saveVendorProfile(previous, data);
    if (result.status !== "success") return { ...result, publishedNow: false };
    const imageResult = await profileImage.current?.saveSelectedImage();
    if (imageResult?.status === "error") return { ...imageResult, publishedNow: false };
    setDirty(false);
    return { ...result, publishedNow: publishing };
  }, initialActionState as ActionState & { publishedNow?: boolean });
  useEffect(() => {
    const focusTarget = () => {
      const target = document.getElementById(window.location.hash.slice(1));
      if (!target) return;
      const control = target.matches("input,textarea,select") ? target : target.querySelector<HTMLElement>("input,textarea,select,button");
      if (control instanceof HTMLElement) control.focus({ preventScroll: true });
      target.scrollIntoView({ block: "center" });
    };
    focusTarget();
    window.addEventListener("hashchange", focusTarget);
    return () => window.removeEventListener("hashchange", focusTarget);
  }, []);
  const initialCategory = profile?.category_id && profile.subcategory_id ? `${profile.category_id}:${profile.subcategory_id}` : "";
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const subcategories = taxonomy.flatMap(category => category.vendor_subcategories);
  const selectedSubcategorySlug = subcategories.find(subcategory => selectedCategory.endsWith(`:${subcategory.id}`))?.slug ?? null;
  const selectedLocationMode = locationModeForSubcategory(selectedSubcategorySlug);
  const profileLocationMode = profile?.location_mode ?? locationModeForSubcategory(subcategories.find(subcategory => initialCategory.endsWith(`:${subcategory.id}`))?.slug);
  const retainingProfileLocation = selectedCategory === initialCategory && selectedLocationMode === profileLocationMode;
  const completion = calculateVendorProfileCompletion({businessName:profile?.business_name, description:profile?.description, categoryId:profile?.category_id, subcategoryId:profile?.subcategory_id, locationCity:profile?.location_city, locationMode:profileLocationMode, physicalArea:profile?.physical_area, serviceAreas:profile?.service_areas, minPriceMinor:profile?.min_price_minor == null ? null : Number(profile.min_price_minor), maxPriceMinor:profile?.max_price_minor == null ? null : Number(profile.max_price_minor), services:profile?.services, phone:profile?.phone, email:profile?.email, imageCount:profile?.vendor_images?.length ?? 0});
  const saveControl = <SubmitButton form={profileFormId} disabled={pending} className="business-profile-save-control px-7" pendingLabel="Saving…">{pending ? "Saving…" : state.status === "success" && !dirty ? "Saved ✓" : profile ? "Save changes" : "Create business profile"}</SubmitButton>;
  const previewControl = profile ? <Link href="/vendor/preview" className="ea-button ea-button--secondary">Preview profile</Link> : null;
  return (
    <div onChange={event => { if ((event.target as HTMLInputElement).form?.id === profileFormId) setDirty(true); }} className="vendor-business-form business-profile-content" aria-busy={pending}>
      <form id={profileFormId} action={action} />
      <PageHeader eyebrow="Vendor" title={profile ? "My Business Profile" : "Vendor Profile Setup"} description={profile ? "The details that help couples get to know your business." : "Add your business details to create your private Vendor Profile. You can publish it when you are ready."} action={<div className="business-profile-actions">{previewControl}{saveControl}</div>} />
      <VendorReveal><section className="business-profile-completion vendor-panel ea-surface" aria-label="Profile completion"><p className="eyebrow">Profile completion</p><p className="font-display"><span className="text-wine"><VendorNumber value={completion.percentage} />%</span> complete</p><div className="vendor-progress" role="progressbar" aria-label="Profile completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion.percentage}><span style={{width:`${completion.percentage}%`}} /></div><p className="text-sm text-ink-soft">Complete your details to help couples find the right match.</p></section></VendorReveal>
      <VendorSaveFeedback state={state} pending={pending} slug={profile?.slug} />
      {state.status === "error" ? <div className="rounded-xl bg-danger-tint p-4 text-sm text-danger" role="alert"><p>{state.message || "Please check the profile details below."}</p>{state.errors ? <ul className="mt-2 list-inside list-disc">{Object.entries(state.errors).flatMap(([field, errors]) => (errors ?? []).map(error => <li key={`${field}:${error}`}>{field.replace(/([A-Z])/g, " $1")}: {error}</li>))}</ul> : null}</div> : null}
      <VendorReveal><section className="vendor-panel ea-surface"><h2 className="font-display text-2xl">Business basics</h2>{identity ? <div className="business-profile-identity"><VendorProfileImage ref={profileImage} profilePending={pending} {...identity} /></div> : null}<div className="mt-5 grid gap-5"><div className="grid gap-5 sm:grid-cols-2"><FormField form={profileFormId} name="businessName" label="Business name" defaultValue={profile?.business_name ?? ""} /><FormField form={profileFormId} name="contactName" label="Contact person" defaultValue={profile?.contact_name ?? ""} /></div><FormField form={profileFormId} name="locationCity" label={selectedLocationMode === "fixed" ? "Physical city" : "Home/base city"} defaultValue={profile?.location_city ?? ""} /><label className="grid gap-2 text-sm font-semibold">Description<textarea form={profileFormId} id="description" name="description" rows={5} defaultValue={profile?.description ?? ""} className="rounded-xl border bg-paper px-3.5 py-3 text-base font-normal" /></label><label className="grid gap-2 text-sm font-semibold">Category & subcategory<select form={profileFormId} id="categoryChoice" name="categoryChoice" value={selectedCategory} onChange={event => setSelectedCategory(event.target.value)} className="min-h-11 rounded-xl border bg-paper px-3.5 text-base font-normal"><option value="">Not set</option>{taxonomy.map((category) => <optgroup key={category.id} label={category.name.toUpperCase()}>{category.vendor_subcategories.map((subcategory) => <option key={subcategory.id} value={`${category.id}:${subcategory.id}`}>{subcategory.name.toUpperCase()}</option>)}</optgroup>)}</select></label></div></section></VendorReveal>
      <VendorReveal><section className="vendor-panel ea-surface ea-surface--blush"><h2 className="font-display text-2xl">Areas & services</h2><div className="mt-5 space-y-5">{selectedLocationMode === "fixed" ? <label className="grid gap-2 text-sm font-semibold">Physical area<select key={`physical:${selectedCategory}`} form={profileFormId} id="physicalArea" name="physicalArea" defaultValue={retainingProfileLocation ? profile?.physical_area ?? "" : ""} className="min-h-11 rounded-xl border bg-paper px-3.5 text-base font-normal"><option value="">Not set</option>{VENDOR_AREA_VALUES.filter(value => value !== "flexible").map(value => <option key={value} value={value}>{VENDOR_AREA_LABELS[value]}</option>)}</select></label> : <fieldset key={`service:${selectedCategory}`} id="service-areas" className="business-profile-choice-group"><legend className="mb-3 text-sm font-semibold">Service areas</legend><VendorChoices name="serviceAreas" choices={VENDOR_AREA_VALUES} selected={retainingProfileLocation ? profile?.service_areas ?? [] : []} labels={VENDOR_AREA_LABELS} /></fieldset>}<label className="grid gap-2 text-sm font-semibold">Services <span className="text-xs font-normal text-ink-soft">Separate services with commas.</span><textarea form={profileFormId} id="services" name="services" rows={3} defaultValue={(profile?.services ?? []).join(", ")} className="rounded-xl border bg-paper px-3.5 py-3 text-base font-normal" /></label></div></section></VendorReveal>
      <VendorReveal><section id="pricing" className="vendor-panel ea-surface"><h2 className="font-display text-2xl">Pricing</h2><div className="mt-5"><div className="grid gap-5 sm:grid-cols-2"><FormField form={profileFormId} name="minPriceShekels" type="number" min={0} label="Minimum price (₪)" defaultValue={profile?.min_price_minor == null ? "" : Number(profile.min_price_minor) / 100} /><FormField form={profileFormId} name="maxPriceShekels" type="number" min={0} label="Maximum price (₪)" defaultValue={profile?.max_price_minor == null ? "" : Number(profile.max_price_minor) / 100} /></div></div></section></VendorReveal>
      <VendorReveal><section className="vendor-panel ea-surface ea-surface--tonal"><h2 className="font-display text-2xl">Matching details</h2><div className="mt-5 space-y-5"><fieldset className="business-profile-choice-group"><legend className="mb-3 text-sm font-semibold">Styles</legend><VendorChoices name="styles" choices={WEDDING_STYLES} selected={profile?.styles ?? []} /></fieldset><fieldset className="business-profile-choice-group"><legend className="mb-3 text-sm font-semibold">Suitable event types</legend><VendorChoices name="eventTypes" choices={EVENT_TYPES.map(([value]) => value)} selected={profile?.event_types ?? []} /></fieldset><div className="grid gap-5 sm:grid-cols-2"><FormField form={profileFormId} name="minGuestCapacity" type="number" min={1} label="Minimum guest capacity" defaultValue={profile?.min_guest_capacity ?? ""} /><FormField form={profileFormId} name="maxGuestCapacity" type="number" min={1} label="Maximum guest capacity" defaultValue={profile?.max_guest_capacity ?? ""} /></div><div className="flex flex-wrap gap-5 text-sm font-semibold"><label className="business-profile-option flex items-center gap-2"><input form={profileFormId} type="checkbox" name="fridayAvailable" defaultChecked={profile?.friday_available ?? false} className="accent-wine" />Friday events</label><label className="business-profile-option flex items-center gap-2"><input form={profileFormId} type="checkbox" name="indoorAvailable" defaultChecked={profile?.indoor_available ?? false} className="accent-wine" />Indoor</label><label className="business-profile-option flex items-center gap-2"><input form={profileFormId} type="checkbox" name="outdoorAvailable" defaultChecked={profile?.outdoor_available ?? false} className="accent-wine" />Outdoor</label></div></div></section></VendorReveal>
      <div className="business-profile-contact-row"><VendorReveal><section id="contact" className="vendor-panel ea-surface"><h2 className="font-display text-2xl">Contact</h2><div className="mt-5 grid gap-5 sm:grid-cols-2"><FormField form={profileFormId} name="phone" type="tel" label="Phone" defaultValue={profile?.phone ?? ""} /><FormField form={profileFormId} name="email" type="email" label="Public email" defaultValue={profile?.email ?? ""} /><FormField form={profileFormId} name="websiteUrl" type="url" label="Website" defaultValue={profile?.website_url ?? ""} placeholder="https://" /><FormField form={profileFormId} name="instagramUrl" type="url" label="Instagram" defaultValue={profile?.instagram_url ?? ""} placeholder="https://instagram.com/…" /></div></section></VendorReveal>
      <VendorReveal><section id="publication" className="vendor-panel ea-surface ea-surface--champagne"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-2xl">Profile visibility</h2><span className="vendor-publication-pill">{profile?.is_public ? "Public · Live" : "Private"}</span></div><label className="flex cursor-pointer items-start gap-4"><input form={profileFormId} type="checkbox" name="isPublic" defaultChecked={profile?.is_public ?? false} className="ea-toggle mt-1 shrink-0" role="switch" /><span><strong className="block">Publish my Vendor Profile</strong><span className="mt-1 block text-sm leading-6 text-ink-soft">Let couples discover your business. Save your profile to apply a visibility change.</span></span></label></section></VendorReveal></div>
      <fieldset disabled={pending} className="contents">{gallery}</fieldset>
      <div className="business-profile-savebar"><div className="business-profile-actions">{previewControl}{saveControl}</div></div>
    </div>
  );
}

function VendorChoices({ name, choices, selected, labels }: { name: string; choices: readonly string[]; selected: readonly string[]; labels?: Record<string, string> }) {
  return <div className="vendor-choices-grid grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{choices.map(value => <label key={value} className="ea-choice vendor-choice"><input form={profileFormId} type="checkbox" name={name} value={value} defaultChecked={selected.includes(value)} className="size-4 shrink-0 accent-wine" /><span>{(labels?.[value] ?? value.replaceAll("_", " ")).toUpperCase()}</span></label>)}</div>;
}
