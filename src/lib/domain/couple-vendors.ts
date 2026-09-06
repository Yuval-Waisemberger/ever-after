export const VENDOR_LIFECYCLE_STATUSES = [
  "contacted",
  "considering",
  "booked",
  "rejected",
] as const;

export type VendorLifecycleStatus = (typeof VENDOR_LIFECYCLE_STATUSES)[number];
export type StoredVendorStatus = VendorLifecycleStatus | "saved";

export function lifecycleFromStoredStatus(status: StoredVendorStatus | null | undefined): VendorLifecycleStatus | null {
  return status === "saved" || !status ? null : status;
}

export function storedStatusFromLifecycle(status: VendorLifecycleStatus | null): StoredVendorStatus {
  return status ?? "saved";
}

export type RelationshipRetention = {
  status: StoredVendorStatus;
  agreedPriceMinor: number | null;
  privateNotes: string | null;
  contactOverride: string | null;
  paymentReference: string | null;
  externalVendorId: string | null;
  hasBudgetItem: boolean;
};

export function shouldDeleteAfterUnsave(relationship: RelationshipRetention): boolean {
  return relationship.status === "saved"
    && relationship.externalVendorId == null
    && relationship.agreedPriceMinor == null
    && !relationship.privateNotes
    && !relationship.contactOverride
    && !relationship.paymentReference
    && !relationship.hasBudgetItem;
}

export function countSaved<T extends { is_saved?: boolean | null }>(relationships: T[]): number {
  return relationships.filter((relationship) => relationship.is_saved === true).length;
}
