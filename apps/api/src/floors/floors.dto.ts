import { z } from 'zod';

export const CreateFloorSchema = z.object({
  buildingId: z.uuid(),
  floorNumber: z.coerce.number().int(),
  planImageUrl: z.string().min(1),
});

export const UpdateFloorSchema = CreateFloorSchema.partial().omit({
  buildingId: true,
});

export type CreateFloorInput = z.infer<typeof CreateFloorSchema>;
export type UpdateFloorInput = z.infer<typeof UpdateFloorSchema>;
