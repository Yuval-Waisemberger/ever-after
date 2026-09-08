"use client";
import { useRef } from "react";
import { Plus, X } from "lucide-react";
import { ExternalVendorForm } from "./external-vendor-form";
import type { CoupleVendorTaxonomy } from "@/lib/queries/couple-vendors";

export function ExternalVendorDialog({ taxonomy }: { taxonomy: CoupleVendorTaxonomy }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return <>
    <button type="button" className="ea-button ea-button--primary" onClick={() => { dialog.current?.showModal(); dialog.current?.querySelector<HTMLInputElement>('input[name="businessName"]')?.focus(); }}><Plus size={16} aria-hidden="true" />Add external vendor</button>
    <dialog ref={dialog} className="external-vendor-dialog" aria-labelledby="external-vendor-title">
      <button type="button" className="ea-icon-button external-dialog-close" aria-label="Close external vendor dialog" onClick={() => dialog.current?.close()}><X size={19} /></button>
      <h2 id="external-vendor-title">Add external vendor</h2>
      <p className="mb-6 mt-2 text-sm text-ink-soft">Add someone you found outside Ever After. Their details stay private to your wedding.</p>
      <ExternalVendorForm taxonomy={taxonomy} />
    </dialog>
  </>;
}
