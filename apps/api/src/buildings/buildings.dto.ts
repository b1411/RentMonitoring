import { z } from 'zod';

export const CreateBuildingSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
});

export const UpdateBuildingSchema = CreateBuildingSchema.partial();

export type CreateBuildingInput = z.infer<typeof CreateBuildingSchema>;
export type UpdateBuildingInput = z.infer<typeof UpdateBuildingSchema>;
