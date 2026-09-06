"use client";

import { useActionState, useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { deleteExternalVendor, saveExternalVendor } from "@/lib/actions/vendors";
import { initialActionState } from "@/lib/actions/state";
import type { CoupleVendorTaxonomy } from "@/lib/queries/couple-vendors";
import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";

export type ExternalVendorFormValue = {
  id: string;
  relationshipId: string;
  businessName: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  websiteUrl: string | null;
  notes: string | null;
  categoryId: string | null;
  subcategoryId: string | null;
  lifecycleStatus: "none" | "contacted" | "considering" | "booked" | "rejected";
  isSaved: boolean;
  agreedPriceShekels: number | null;
};

export function ExternalVendorForm({ taxonomy, value }: { taxonomy: CoupleVendorTaxonomy; value?: ExternalVendorFormValue }) {
  const [state, action] = useActionState(saveExternalVendor, initialActionState);
  const [categoryId, setCategoryId] = useState(value?.categoryId ?? "");
  const [subcategoryId, setSubcategoryId] = useState(value?.subcategoryId ?? "");
  const subcategories = taxonomy.find((category) => category.id === categoryId)?.vendor_subcategories ?? [];

  return (
    <div className="external-vendor-form">
      <form action={action} className="grid gap-5">
        {value ? <><input type="hidden" name="externalVendorId" value={value.id} /><input type="hidden" name="relationshipId" value={value.relationshipId} /></> : null}
        {state.message ? <p className={`ea-feedback ${state.status === "error" ? "ea-feedback--error" : "ea-feedback--success"}`} role="status">{state.message}</p> : null}
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField name="businessName" label="Business name" required maxLength={120} defaultValue={value?.businessName ?? ""} error={state.errors?.businessName?.[0]} />
          <FormField name="contactName" label="Contact name" maxLength={120} defaultValue={value?.contactName ?? ""} error={state.errors?.contactName?.[0]} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold">Category
            <select name="categoryId" value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setSubcategoryId(""); }} className="min-h-11 rounded-md border bg-paper px-3.5 text-base font-normal">
              <option value="">Not set</option>
              {taxonomy.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">Subcategory
            <select name="subcategoryId" value={subcategoryId} onChange={(event) => setSubcategoryId(event.target.value)} disabled={!categoryId} className="min-h-11 rounded-md border bg-paper px-3.5 text-base font-normal disabled:opacity-60">
              <option value="">Not set</option>
              {subcategories.map((subcategory) => <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>)}
            </select>
          </label>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField name="phone" type="tel" label="Phone" maxLength={32} defaultValue={value?.phone ?? ""} error={state.errors?.phone?.[0]} />
          <FormField name="email" type="email" label="Email" defaultValue={value?.email ?? ""} error={state.errors?.email?.[0]} />
        </div>
        <FormField name="websiteUrl" type="url" label="Website" placeholder="https://" defaultValue={value?.websiteUrl ?? ""} error={state.errors?.websiteUrl?.[0]} />
        <label className="grid gap-2 text-sm font-semibold">Notes
          <textarea name="notes" rows={3} maxLength={3000} defaultValue={value?.notes ?? ""} className="rounded-md border bg-paper px-3.5 py-3 text-base font-normal" />
          {state.errors?.notes?.[0] ? <span className="ea-field-error text-xs" role="alert">{state.errors.notes[0]}</span> : null}
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold">Relationship status
            <select name="lifecycleStatus" defaultValue={value?.lifecycleStatus ?? "none"} className="min-h-11 rounded-md border bg-paper px-3.5 text-base font-normal">
              <option value="none">No active status</option><option value="contacted">Contacted</option><option value="considering">Considering</option><option value="booked">Booked</option><option value="rejected">Rejected</option>
            </select>
          </label>
          <FormField name="agreedPriceShekels" type="number" min={0} step={1} label="Agreed price (₪)" defaultValue={value?.agreedPriceShekels ?? ""} error={state.errors?.agreedPriceShekels?.[0]} />
        </div>
        <label className="flex min-h-11 items-center gap-3 rounded-md border bg-canvas/60 px-4 text-sm font-semibold"><input type="checkbox" name="isSaved" defaultChecked={value?.isSaved ?? false} />Save as a bookmark too</label>
        <SubmitButton className="justify-self-start" pendingLabel={value ? "Saving vendor…" : "Adding vendor…"}><Save className="size-4" />{value ? "Save external vendor" : "Add to Our Vendors"}</SubmitButton>
      </form>
      {value ? <form action={deleteExternalVendor} onSubmit={(event) => { if (!window.confirm(`Remove ${value.businessName} from Our Vendors?`)) event.preventDefault(); }} className="mt-5 border-t pt-4"><input type="hidden" name="externalVendorId" value={value.id} /><button className="inline-flex min-h-11 items-center gap-2 rounded-md border border-red-800 px-4 text-sm font-semibold text-red-800"><Trash2 className="size-4" />Delete external vendor</button></form> : null}
    </div>
  );
}
