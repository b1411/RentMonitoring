import { z } from 'zod';

/** Polygon point — relative fraction of the plan image (ТЗ §2: never pixels). */
export const PointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export const CoordinatesSchema = z
  .array(PointSchema)
  .min(3, 'Polygon needs at least 3 points');

export const RoomStatusSchema = z.enum([
  'FREE',
  'BOOKED',
  'OCCUPIED',
  'OVERDUE',
  'REPAIR',
]);

export const CreateRoomSchema = z.object({
  floorId: z.uuid(),
  roomNumber: z.string().min(1),
  area: z.coerce.number().positive(),
  basePrice: z.coerce.number().nonnegative(),
  coordinates: CoordinatesSchema,
  currentStatus: RoomStatusSchema.optional(),
});

export const UpdateRoomSchema = CreateRoomSchema.partial().omit({
  floorId: true,
});

export const UpdateRoomStatusSchema = z.object({
  currentStatus: RoomStatusSchema,
});

export type Point = z.infer<typeof PointSchema>;
export type CreateRoomInput = z.infer<typeof CreateRoomSchema>;
export type UpdateRoomInput = z.infer<typeof UpdateRoomSchema>;
export type UpdateRoomStatusInput = z.infer<typeof UpdateRoomStatusSchema>;
