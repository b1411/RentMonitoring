<script setup lang="ts">
import { ROOM_STATUS_META, ROOM_STATUSES } from '~/lib/status';
import { cn } from '~/lib/utils';
import type { Room, RoomStatus } from '~/types';

const props = defineProps<{ rooms: Room[] }>();

const counts = computed(() => {
  const map = Object.fromEntries(ROOM_STATUSES.map((s) => [s, 0])) as Record<RoomStatus, number>;
  for (const r of props.rooms) map[r.currentStatus] += 1;
  return map;
});
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <div
      v-for="status in ROOM_STATUSES"
      :key="status"
      class="flex items-center gap-2 rounded-xl bg-surface/60 px-3 py-2 ring-1 ring-border/60"
    >
      <span :class="cn('h-2.5 w-2.5 rounded-full', ROOM_STATUS_META[status].dot)" />
      <span class="text-sm font-medium text-fg">{{ ROOM_STATUS_META[status].label }}</span>
      <span class="rounded-md bg-bg/70 px-1.5 font-mono text-xs text-muted">{{ counts[status] }}</span>
    </div>
  </div>
</template>
