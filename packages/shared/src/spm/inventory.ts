import { z } from 'zod';

const qty = z.number().min(0, 'Tidak boleh negatif').max(1_000_000_000);

const itemBase = z.object({
  name: z.string().trim().min(2, 'Nama wajib diisi').max(200),
  quantity: qty,
  unit: z.string().trim().min(1, 'Satuan wajib diisi').max(40),
  locationText: z.string().trim().max(300).nullish(),
  institution: z.string().trim().max(200).nullish(),
  qtyGood: qty.default(0),
  qtyBroken: qty.default(0),
});

/** Jumlah baik + rusak tidak boleh melebihi jumlah tersedia (data-model.md). */
function refineQty(v: { quantity?: number; qtyGood?: number; qtyBroken?: number }, ctx: z.RefinementCtx) {
  if (v.quantity !== undefined && (v.qtyGood ?? 0) + (v.qtyBroken ?? 0) > v.quantity) {
    ctx.addIssue({ code: 'custom', path: ['qtyGood'], message: 'Jumlah baik + rusak melebihi jumlah tersedia' });
  }
}

export const SUPPORT_KEYS = ['supportKajiCepat', 'supportPencarian', 'supportKorbanMeninggal', 'supportMedis', 'supportPengungsian'] as const;
export const SUPPORT_LABEL: Record<(typeof SUPPORT_KEYS)[number], string> = {
  supportKajiCepat: 'Kaji cepat',
  supportPencarian: 'Pencarian orang hilang',
  supportKorbanMeninggal: 'Penanganan korban meninggal',
  supportMedis: 'Penanganan medis',
  supportPengungsian: 'Fasilitas pengungsian',
};

const equipmentBase = itemBase.extend(Object.fromEntries(SUPPORT_KEYS.map((k) => [k, z.boolean().default(false)])) as Record<(typeof SUPPORT_KEYS)[number], z.ZodDefault<z.ZodBoolean>>);

export const equipmentSchema = equipmentBase.superRefine(refineQty);
export type EquipmentRequest = z.infer<typeof equipmentBase>;
export const updateEquipmentSchema = equipmentBase.partial().superRefine(refineQty);
export type UpdateEquipmentRequest = z.infer<typeof updateEquipmentSchema>;

export const logisticsSchema = itemBase.superRefine(refineQty);
export type LogisticsRequest = z.infer<typeof itemBase>;
export const updateLogisticsSchema = itemBase.partial().superRefine(refineQty);
export type UpdateLogisticsRequest = z.infer<typeof updateLogisticsSchema>;

export interface LogisticsDto extends LogisticsRequest {
  id: string;
}
export interface EquipmentDto extends EquipmentRequest {
  id: string;
}
