<script setup lang="ts">
import { ROOM_STATUS_META } from '~/lib/status';
import { cn } from '~/lib/utils';
import type { RoomStatus } from '~/types';

const props = defineProps<{ status: RoomStatus; class?: string }>();
const meta = computed(() => ROOM_STATUS_META[props.status]);
</script>

<template>
  <span
    :class="
      cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        meta.badge,
        props.class,
      )
    "
  >
    <span :class="cn('h-1.5 w-1.5 rounded-full', meta.dot)" />
    {{ meta.label }}
  </span>
</template>
