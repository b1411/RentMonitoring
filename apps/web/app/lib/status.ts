import type { RoomStatus } from '~/types';

interface StatusMeta {
  label: string;
  /** Tailwind classes for the legend dot / badge. */
  dot: string;
  badge: string;
  /** SVG polygon classes (fill + stroke) for the map. */
  poly: string;
}

export const ROOM_STATUS_META: Record<RoomStatus, StatusMeta> = {
  FREE: {
    label: 'Свободно',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-500/25',
    poly: 'fill-emerald-500/25 stroke-emerald-500 hover:fill-emerald-500/45',
  },
  BOOKED: {
    label: 'Бронь',
    dot: 'bg-sky-500',
    badge: 'bg-sky-500/12 text-sky-700 ring-1 ring-sky-500/25',
    poly: 'fill-sky-500/25 stroke-sky-500 hover:fill-sky-500/45',
  },
  OCCUPIED: {
    label: 'Занято',
    dot: 'bg-violet-500',
    badge: 'bg-violet-500/12 text-violet-700 ring-1 ring-violet-500/25',
    poly: 'fill-violet-500/25 stroke-violet-500 hover:fill-violet-500/45',
  },
  OVERDUE: {
    label: 'Просрочка',
    dot: 'bg-red-500',
    badge: 'bg-red-500/12 text-red-700 ring-1 ring-red-500/25',
    poly: 'fill-red-500/35 stroke-red-600 hover:fill-red-500/55 animate-pulse',
  },
  REPAIR: {
    label: 'Ремонт',
    dot: 'bg-amber-500',
    badge: 'bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/30',
    poly: 'fill-amber-500/25 stroke-amber-500 hover:fill-amber-500/45',
  },
};

export const ROOM_STATUSES = Object.keys(ROOM_STATUS_META) as RoomStatus[];
