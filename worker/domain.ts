import { z } from 'zod';
export const specialities = [
  'General physician',
  'Gynecologist',
  'Dermatologist',
  'Pediatricians',
  'Neurologist',
  'Gastroenterologist',
] as const;
export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z
    .email()
    .max(200)
    .transform((v) => v.toLowerCase()),
  password: z.string().min(10).max(128),
});
export const loginSchema = registerSchema.omit({ name: true });
export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().max(30),
  address: z.string().max(250),
  gender: z.enum(['', 'Female', 'Male', 'Other', 'Prefer not to say']),
  dob: z
    .string()
    .refine(
      (v) =>
        v === '' || (/^\d{4}-\d{2}-\d{2}$/.test(v) && v <= new Date().toISOString().slice(0, 10)),
      'Invalid date of birth',
    ),
});
export const doctorSchema = z.object({
  name: z.string().trim().min(3).max(80),
  speciality: z.enum(specialities),
  degree: z.string().min(2).max(100),
  experience: z.number().int().min(0).max(70),
  about: z.string().min(30).max(2000),
  fee: z.number().int().min(1).max(5000),
  image: z.string().regex(/^\/assets\/(doc\d+\.webp|profile_pic\.webp)$/),
  address: z.string().min(5).max(250),
  available: z.number().int().min(0).max(1),
});
export const bookingSchema = z.object({
  doctorId: z.string().min(1).max(60),
  slot: z.iso.datetime(),
});
export function availableSlots(now = new Date()) {
  const slots: string[] = [];
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() + 1);
  start.setUTCHours(0, 0, 0, 0);
  for (let d = 0; d < 7; d++) {
    for (let h = 9; h < 17; h++) {
      for (const m of [0, 30]) {
        const t = new Date(start);
        t.setUTCDate(t.getUTCDate() + d);
        t.setUTCHours(h, m);
        slots.push(t.toISOString());
      }
    }
  }
  return slots;
}
export function isValidSlot(slot: string, now = new Date()) {
  return availableSlots(now).includes(slot);
}
