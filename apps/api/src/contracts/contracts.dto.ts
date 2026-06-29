import { z } from 'zod';

export const CreateContractSchema = z
  .object({
    roomId: z.uuid(),
    tenantId: z.uuid(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    isActive: z.boolean().optional(),
  })
  .refine((c) => c.endDate > c.startDate, {
    message: 'endDate must be after startDate',
    path: ['endDate'],
  });

export const UpdateContractSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
});

export type CreateContractInput = z.infer<typeof CreateContractSchema>;
export type UpdateContractInput = z.infer<typeof UpdateContractSchema>;
