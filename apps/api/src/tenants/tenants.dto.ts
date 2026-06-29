import { z } from 'zod';

export const CreateTenantSchema = z.object({
  companyName: z.string().min(1),
  email: z.email(),
  phone: z.string().min(3),
});

export const UpdateTenantSchema = CreateTenantSchema.partial();

export type CreateTenantInput = z.infer<typeof CreateTenantSchema>;
export type UpdateTenantInput = z.infer<typeof UpdateTenantSchema>;
