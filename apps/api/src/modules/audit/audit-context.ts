import { AsyncLocalStorage } from 'node:async_hooks';

export interface AuditAnnotation {
  entityId?: string | null;
  detail?: Record<string, unknown>;
}

const storage = new AsyncLocalStorage<AuditAnnotation>();

/** Konteks per permintaan agar layanan dapat menambahkan `entity_id` dan rincian audit. */
export const AuditContext = {
  run<T>(fn: () => T): { result: T; annotation: AuditAnnotation } {
    const annotation: AuditAnnotation = {};
    return { result: storage.run(annotation, fn), annotation };
  },
  annotate(value: AuditAnnotation): void {
    const store = storage.getStore();
    if (!store) return;
    if (value.entityId !== undefined) store.entityId = value.entityId;
    if (value.detail) store.detail = { ...store.detail, ...value.detail };
  },
};
