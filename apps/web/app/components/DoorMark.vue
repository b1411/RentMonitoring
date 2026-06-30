<script setup lang="ts">
import type { Door } from '~/types';

const props = defineProps<{ door: Door }>();

const S = 1000;
const geo = computed(() => {
  const ax = props.door.a.x * S;
  const ay = props.door.a.y * S;
  const bx = props.door.b.x * S;
  const by = props.door.b.y * S;
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  // Perpendicular unit → leaf swings 90° from the hinge (A).
  const px = -dy / len;
  const py = dx / len;
  const lx = ax + px * len;
  const ly = ay + py * len;
  return {
    ax,
    ay,
    bx,
    by,
    lx,
    ly,
    len,
    arc: `M ${bx} ${by} A ${len} ${len} 0 0 0 ${lx} ${ly}`,
  };
});
</script>

<template>
  <g class="pointer-events-none">
    <!-- Opening (cuts the wall) -->
    <line
      :x1="geo.ax"
      :y1="geo.ay"
      :x2="geo.bx"
      :y2="geo.by"
      class="stroke-white [stroke-width:7] [vector-effect:non-scaling-stroke]"
    />
    <!-- Swing arc -->
    <path
      :d="geo.arc"
      fill="none"
      class="stroke-brand/55 [stroke-width:2] [stroke-dasharray:5_5] [vector-effect:non-scaling-stroke]"
    />
    <!-- Door leaf -->
    <line
      :x1="geo.ax"
      :y1="geo.ay"
      :x2="geo.lx"
      :y2="geo.ly"
      class="stroke-brand [stroke-width:3] [vector-effect:non-scaling-stroke]"
    />
    <!-- Hinge -->
    <circle :cx="geo.ax" :cy="geo.ay" r="5" class="fill-brand" />
  </g>
</template>
