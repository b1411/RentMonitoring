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

/** Door is a wall opening — a segment a→b (fractions), drawn blueprint-style. */
export const DoorSchema = z.object({
  a: PointSchema,
  b: PointSchema,
});

export const CreateRoomSchema = z.object({
  floorId: z.uuid(),
  roomNumber: z.string().min(1),
  area: z.coerce.number().positive(),
  basePrice: z.coerce.number().nonnegative(),
  coordinates: CoordinatesSchema,
  door: DoorSchema.nullish(),
  currentStatus: RoomStatusSchema.optional(),
});

export const UpdateRoomSchema = CreateRoomSchema.partial().omit({
  floorId: true,
});

export const UpdateRoomStatusSchema = z.object({
  currentStatus: RoomStatusSchema,
});

/** Set or clear a room's door (wall opening). */
export const UpdateDoorSchema = z.object({
  door: DoorSchema.nullable(),
});

export type Point = z.infer<typeof PointSchema>;
export type Door = z.infer<typeof DoorSchema>;
export type CreateRoomInput = z.infer<typeof CreateRoomSchema>;
export type UpdateRoomInput = z.infer<typeof UpdateRoomSchema>;
export type UpdateRoomStatusInput = z.infer<typeof UpdateRoomStatusSchema>;
export type UpdateDoorInput = z.infer<typeof UpdateDoorSchema>;
