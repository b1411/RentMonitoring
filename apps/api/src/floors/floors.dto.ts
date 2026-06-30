import { z } from 'zod';

// Plan image is optional — admin can draw on a blank grid, then upload later
// via POST /floors/:id/plan. Empty string = blank canvas.
export const CreateFloorSchema = z.object({
  buildingId: z.uuid(),
  floorNumber: z.coerce.number().int(),
  planImageUrl: z.string().default(''),
});

export const UpdateFloorSchema = CreateFloorSchema.partial().omit({
  buildingId: true,
});

export type CreateFloorInput = z.infer<typeof CreateFloorSchema>;
export type UpdateFloorInput = z.infer<typeof UpdateFloorSchema>;
