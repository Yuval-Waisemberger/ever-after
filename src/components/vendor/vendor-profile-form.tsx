"use client";

import { useActionState, useEffect, useState } from "react";
import { saveVendorProfile } from "@/lib/actions/vendor-profile";
import { initialActionState } from "@/lib/actions/state";
import { VendorReveal } from "./vendor-motion";
import { VendorSaveFeedback } from "./vendor-save-feedback";
import type { ActionState } from "@/lib/actions/state";
import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { AREAS, EVENT_TYPES, WEDDING_STYLES } from "@/lib/validation/wedding";
import type { OwnedVendorProfile, VendorTaxonomy } from "@/lib/queries/vendor-dashboard";

export function VendorProfileForm({ profile, taxonomy }: { profile: OwnedVendorProfile | null; taxonomy: VendorTaxonomy }) {
  const [dirty, setDirty] = useState(false);
  const [state, action, pending] = useActionState(async (previous: ActionState & { publishedNow?: boolean }, data: FormData) => {
    const publishing = !profile?.is_public && data.get("isPublic") === "on";
    const result = await saveVendorProfile(previous, data);
    if (result.status === "success") setDirty(false);
    return { ...result, publishedNow: result.status === "success" && publishing };
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
  const selectedCategory = profile?.category_id && profile.subcategory_id ? `${profile.category_id}:${profile.subcategory_id}` : "";
  return (
    <form onChange={() => setDirty(true)} action={action} className="vendor-business-form space-y-5" aria-busy={pending}>
      <VendorSaveFeedback state={state} pending={pending} slug={profile?.slug} />
      {state.status === "error" ? <div className="rounded-xl bg-danger-tint p-4 text-sm text-danger" role="alert"><p>{state.message || "Please check the profile details below."}</p>{state.errors ? <ul className="mt-2 list-inside list-disc">{Object.entries(state.errors).flatMap(([field, errors]) => (errors ?? []).map(error => <li key={`${field}:${error}`}>{field.replace(/([A-Z])/g, " $1")}: {error}</li>))}</ul> : null}</div> : null}
      <VendorReveal><section className="vendor-panel ea-surface"><h2 className="font-display text-2xl">Business basics</h2><div className="mt-5 grid gap-5"><div className="grid gap-5 sm:grid-cols-2"><FormField name="businessName" label="Business name" defaultValue={profile?.business_name ?? ""} required /><FormField name="contactName" label="Contact person" defaultValue={profile?.contact_name ?? ""} /></div><FormField name="locationCity" label="Home city or venue city" defaultValue={profile?.location_city ?? ""} /><label className="grid gap-2 text-sm font-semibold">Description<textarea id="description" name="description" rows={5} defaultValue={profile?.description ?? ""} className="rounded-xl border bg-paper px-3.5 py-3 text-base font-normal" /></label><label className="grid gap-2 text-sm font-semibold">Category & subcategory<select id="categoryChoice" name="categoryChoice" defaultValue={selectedCategory} className="min-h-11 rounded-xl border bg-paper px-3.5 text-base font-normal"><option value="">Not set</option>{taxonomy.map((category) => <optgroup key={category.id} label={category.name.toUpperCase()}>{category.vendor_subcategories.map((subcategory) => <option key={subcategory.id} value={`${category.id}:${subcategory.id}`}>{subcategory.name.toUpperCase()}</option>)}</optgroup>)}</select></label></div></section></VendorReveal>
      <VendorReveal><section className="vendor-panel ea-surface ea-surface--blush"><h2 className="font-display text-2xl">Areas & services</h2><div className="mt-5 space-y-5"><fieldset id="service-areas"><legend className="mb-3 text-sm font-semibold">Service areas</legend><VendorChoices name="serviceAreas" choices={AREAS.map(([value]) => value)} selected={profile?.service_areas ?? []} /></fieldset><label className="grid gap-2 text-sm font-semibold">Services <span className="text-xs font-normal text-ink-soft">Separate services with commas.</span><textarea id="services" name="services" rows={3} defaultValue={(profile?.services ?? []).join(", ")} className="rounded-xl border bg-paper px-3.5 py-3 text-base font-normal" /></label></div></section></VendorReveal>
      <VendorReveal><section id="pricing" className="vendor-panel ea-surface"><h2 className="font-display text-2xl">Pricing</h2><div className="mt-5"><div className="grid gap-5 sm:grid-cols-2"><FormField name="minPriceShekels" type="number" min={0} label="Minimum price (₪)" defaultValue={profile?.min_price_minor == null ? "" : Number(profile.min_price_minor) / 100} /><FormField name="maxPriceShekels" type="number" min={0} label="Maximum price (₪)" defaultValue={profile?.max_price_minor == null ? "" : Number(profile.max_price_minor) / 100} /></div></div></section></VendorReveal>
      <VendorReveal><section className="vendor-panel ea-surface ea-surface--tonal"><h2 className="font-display text-2xl">Matching details</h2><div className="mt-5 space-y-5"><fieldset><legend className="mb-3 text-sm font-semibold">Styles</legend><VendorChoices name="styles" choices={WEDDING_STYLES} selected={profile?.styles ?? []} /></fieldset><fieldset><legend className="mb-3 text-sm font-semibold">Suitable event types</legend><VendorChoices name="eventTypes" choices={EVENT_TYPES.map(([value]) => value)} selected={profile?.event_types ?? []} /></fieldset><div className="grid gap-5 sm:grid-cols-2"><FormField name="minGuestCapacity" type="number" min={1} label="Minimum guest capacity" defaultValue={profile?.min_guest_capacity ?? ""} /><FormField name="maxGuestCapacity" type="number" min={1} label="Maximum guest capacity" defaultValue={profile?.max_guest_capacity ?? ""} /></div><div className="flex flex-wrap gap-5 text-sm font-semibold"><label className="flex items-center gap-2"><input type="checkbox" name="fridayAvailable" defaultChecked={profile?.friday_available ?? false} className="accent-wine" />Friday events</label><label className="flex items-center gap-2"><input type="checkbox" name="indoorAvailable" defaultChecked={profile?.indoor_available ?? false} className="accent-wine" />Indoor</label><label className="flex items-center gap-2"><input type="checkbox" name="outdoorAvailable" defaultChecked={profile?.outdoor_available ?? false} className="accent-wine" />Outdoor</label></div></div></section></VendorReveal>
      <VendorReveal><section id="contact" className="vendor-panel ea-surface"><h2 className="font-display text-2xl">Contact</h2><div className="mt-5 grid gap-5 sm:grid-cols-2"><FormField name="phone" type="tel" label="Phone" defaultValue={profile?.phone ?? ""} /><FormField name="email" type="email" label="Public email" defaultValue={profile?.email ?? ""} /><FormField name="websiteUrl" type="url" label="Website" defaultValue={profile?.website_url ?? ""} placeholder="https://" /><FormField name="instagramUrl" type="url" label="Instagram" defaultValue={profile?.instagram_url ?? ""} placeholder="https://instagram.com/…" /></div></section></VendorReveal>
      <VendorReveal><section id="publication" className="vendor-panel ea-surface ea-surface--champagne"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-2xl">Profile visibility</h2><span className="vendor-publication-pill">{profile?.is_public ? "Public · Live" : "Private"}</span></div><label className="flex cursor-pointer items-start gap-4"><input type="checkbox" name="isPublic" defaultChecked={profile?.is_public ?? false} className="ea-toggle mt-1 shrink-0" role="switch" /><span><strong className="block">Publish my Vendor Profile</strong><span className="mt-1 block text-sm leading-6 text-ink-soft">Let couples discover your business. Save your profile to apply a visibility change.</span></span></label></section></VendorReveal>
      <SubmitButton className="px-7" pendingLabel="Saving…">{state.status === "success" && !dirty ? "Saved ✓" : profile ? "Save business profile" : "Create business profile"}</SubmitButton>
    </form>
  );
}

function VendorChoices({ name, choices, selected }: { name: string; choices: readonly string[]; selected: readonly string[] }) {
  return <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{choices.map(value => <label key={value} className="ea-choice vendor-choice"><input type="checkbox" name={name} value={value} defaultChecked={selected.includes(value)} className="size-4 shrink-0 accent-wine" /><span>{value.replaceAll("_", " ").toUpperCase()}</span></label>)}</div>;
}
