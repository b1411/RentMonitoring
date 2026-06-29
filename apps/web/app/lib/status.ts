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
    dot: 'bg-emerald-400',
    badge: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
    poly: 'fill-emerald-500/25 stroke-emerald-400 hover:fill-emerald-500/45',
  },
  BOOKED: {
    label: 'Бронь',
    dot: 'bg-sky-400',
    badge: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30',
    poly: 'fill-sky-500/25 stroke-sky-400 hover:fill-sky-500/45',
  },
  OCCUPIED: {
    label: 'Занято',
    dot: 'bg-violet-400',
    badge: 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30',
    poly: 'fill-violet-500/25 stroke-violet-400 hover:fill-violet-500/45',
  },
  OVERDUE: {
    label: 'Просрочка',
    dot: 'bg-red-500',
    badge: 'bg-red-500/15 text-red-300 ring-1 ring-red-500/30',
    poly: 'fill-red-600/35 stroke-red-500 hover:fill-red-600/55 animate-pulse',
  },
  REPAIR: {
    label: 'Ремонт',
    dot: 'bg-amber-400',
    badge: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30',
    poly: 'fill-amber-500/20 stroke-amber-400 hover:fill-amber-500/40',
  },
};

export const ROOM_STATUSES = Object.keys(ROOM_STATUS_META) as RoomStatus[];
