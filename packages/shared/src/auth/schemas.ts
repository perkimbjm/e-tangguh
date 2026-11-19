import { z } from 'zod';
import { ROLES } from './roles';

export const loginRequestSchema = z.object({
  identifier: z.string().trim().min(3, 'Isi email atau nomor ponsel').max(254),
  password: z.string().min(1, 'Isi kata sandi').max(256),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const sessionUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  role: z.enum(ROLES),
  kelurahanId: z.string().uuid().nullable(),
});
export type SessionUser = z.infer<typeof sessionUserSchema>;

export const meResponseSchema = z.object({ user: sessionUserSchema, csrfToken: z.string() });
export type MeResponse = z.infer<typeof meResponseSchema>;

const e164 = z.string().regex(/^\+[1-9]\d{7,14}$/, 'Nomor ponsel harus format internasional, mis. +62812…');

export const createUserSchema = z
  .object({
    email: z.string().trim().email('Email tidak valid').max(254).nullish(),
    phone: e164.nullish(),
    password: z.string().min(12, 'Kata sandi minimal 12 karakter').max(256),
    role: z.enum(ROLES),
    kelurahanId: z.string().uuid().nullish(),
  })
  .superRefine((v, ctx) => {
    if (!v.email && !v.phone) {
      ctx.addIssue({ code: 'custom', path: ['email'], message: 'Isi email atau nomor ponsel' });
    }
    if (v.role === 'pendata_kelurahan' && !v.kelurahanId) {
      ctx.addIssue({ code: 'custom', path: ['kelurahanId'], message: 'Pendata kelurahan wajib terikat satu kelurahan' });
    }
    if (v.role !== 'pendata_kelurahan' && v.kelurahanId) {
      ctx.addIssue({ code: 'custom', path: ['kelurahanId'], message: 'Hanya pendata kelurahan yang terikat kelurahan' });
    }
  });
export type CreateUserRequest = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({ isActive: z.boolean() });
export type UpdateUserRequest = z.infer<typeof updateUserSchema>;
