// Serialize this server instance's gallery registrations. The database remains
// authoritative; this is not a distributed lock across deployment instances.
const pending = new Map<string, Promise<unknown>>();

export async function withVendorMediaLock<T>(vendorId: string, work: () => Promise<T>): Promise<T> {
  const previous = pending.get(vendorId) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(work);
  pending.set(vendorId, current);
  try { return await current; }
  finally { if (pending.get(vendorId) === current) pending.delete(vendorId); }
}
