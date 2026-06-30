<script setup lang="ts">
import type { PanzoomObject } from '@panzoom/panzoom';
import { Plus, Minus, Maximize } from 'lucide-vue-next';
import { ROOM_STATUS_META } from '~/lib/status';
import { cn, money, formatDate } from '~/lib/utils';
import type { Floor, Room } from '~/types';

const props = withDefaults(
  defineProps<{ floor: Floor; canViewFinance?: boolean }>(),
  { canViewFinance: false },
);
const emit = defineEmits<{ select: [room: Room] }>();

const rooms = computed(() => props.floor.rooms ?? []);
const hasPlan = computed(() => Boolean(props.floor.planImageUrl));
const planAspect = usePlanAspect(() => props.floor.planImageUrl);

function points(room: Room): string {
  return room.polygonCoordinates.map((p) => `${(p.x * 1000).toFixed(1)},${(p.y * 1000).toFixed(1)}`).join(' ');
}

function centroid(room: Room): { x: number; y: number } {
  const pts = room.polygonCoordinates;
  const sum = pts.reduce((a, p) => ({ x: a.x + p.x, y: a.y + p.y }), { x: 0, y: 0 });
  return { x: (sum.x / pts.length) * 1000, y: (sum.y / pts.length) * 1000 };
}

function tenantName(room: Room): string | null {
  return room.contracts?.find((c) => c.isActive)?.tenant?.companyName ?? null;
}
function contractEnd(room: Room): string | null {
  const end = room.contracts?.find((c) => c.isActive)?.endDate;
  return end ? formatDate(end) : null;
}

/* ─── Hover tooltip ─── */
const hovered = ref<Room | null>(null);
const pointer = reactive({ x: 0, y: 0 });
const wrapRef = ref<HTMLElement | null>(null);

function onMove(e: MouseEvent) {
  const rect = wrapRef.value?.getBoundingClientRect();
  if (!rect) return;
  pointer.x = e.clientX - rect.left;
  pointer.y = e.clientY - rect.top;
}

/* ─── Pan & zoom (ТЗ §2 perf + QA: clean up listeners on floor switch) ─── */
const stageRef = ref<HTMLElement | null>(null);
let panzoom: PanzoomObject | null = null;
const zoom = ref(1);

async function bindPanzoom() {
  if (!stageRef.value || !wrapRef.value || panzoom) return;
  const Panzoom = (await import('@panzoom/panzoom')).default;
  if (!stageRef.value || !wrapRef.value) return;
  panzoom = Panzoom(stageRef.value, {
    maxScale: 6,
    minScale: 1,
    contain: 'outside',
    cursor: 'grab',
    animate: true,
  });
  wrapRef.value.addEventListener('wheel', onWheel, { passive: false });
  stageRef.value.addEventListener('panzoomzoom', onZoomEvt as EventListener);
}
function onWheel(e: WheelEvent) {
  panzoom?.zoomWithWheel(e);
}
function onZoomEvt(e: CustomEvent<{ scale: number }>) {
  zoom.value = e.detail.scale;
}
function teardownPanzoom() {
  wrapRef.value?.removeEventListener('wheel', onWheel);
  stageRef.value?.removeEventListener('panzoomzoom', onZoomEvt as EventListener);
  panzoom?.destroy();
  panzoom = null;
}

onMounted(() => void bindPanzoom());
onBeforeUnmount(teardownPanzoom);

// Re-init cleanly whenever the floor changes (no leaked listeners between floors).
watch(
  () => props.floor.id,
  () => {
    teardownPanzoom();
    hovered.value = null;
    nextTick(() => void bindPanzoom());
  },
);

const zoomIn = () => panzoom?.zoomIn();
const zoomOut = () => panzoom?.zoomOut();
const reset = () => {
  panzoom?.reset();
  zoom.value = 1;
};
</script>

<template>
  <div
    ref="wrapRef"
    class="relative w-full select-none overflow-hidden rounded-2xl border border-border/60 bg-bg-soft shadow-card"
    :style="{ aspectRatio: planAspect }"
    @mousemove="onMove"
    @mouseleave="hovered = null"
  >
    <!-- Zoom controls -->
    <div class="absolute right-3 top-3 z-20 flex flex-col gap-1.5">
      <UiButton variant="secondary" size="icon" aria-label="Приблизить" @click="zoomIn">
        <Plus class="h-4 w-4" />
      </UiButton>
      <UiButton variant="secondary" size="icon" aria-label="Отдалить" @click="zoomOut">
        <Minus class="h-4 w-4" />
      </UiButton>
      <UiButton variant="secondary" size="icon" aria-label="Сбросить" @click="reset">
        <Maximize class="h-4 w-4" />
      </UiButton>
    </div>
    <div
      class="absolute left-3 top-3 z-20 rounded-lg bg-bg/70 px-2.5 py-1 font-mono text-xs text-muted ring-1 ring-border/60"
    >
      {{ Math.round(zoom * 100) }}%
    </div>

    <!-- Pan/zoom stage -->
    <div ref="stageRef" class="h-full w-full origin-center">
      <svg
        viewBox="0 0 1000 1000"
        class="h-full w-full"
        style="content-visibility: auto"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern id="map-blankgrid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M50 0H0V50" fill="none" stroke="var(--color-border)" stroke-width="1" />
          </pattern>
        </defs>
        <image
          v-if="hasPlan"
          :href="floor.planImageUrl"
          x="0"
          y="0"
          width="1000"
          height="1000"
          preserveAspectRatio="none"
        />
        <template v-else>
          <rect x="0" y="0" width="1000" height="1000" class="fill-surface" />
          <rect x="0" y="0" width="1000" height="1000" fill="url(#map-blankgrid)" />
        </template>
        <g>
          <polygon
            v-for="(room, i) in rooms"
            :key="room.id"
            :points="points(room)"
            :data-status="room.currentStatus"
            :class="
              cn(
                'room-poly cursor-pointer transition-all duration-200',
                ROOM_STATUS_META[room.currentStatus].poly,
                hovered && hovered.id === room.id ? 'room-poly--active opacity-100' : '',
                hovered && hovered.id !== room.id ? 'opacity-50' : '',
              )
            "
            :style="{ animation: `pop 0.4s cubic-bezier(0.34,1.56,0.64,1) ${i * 60}ms both` }"
            @mouseenter="hovered = room"
            @click="emit('select', room)"
          />
        </g>
        <g class="pointer-events-none">
          <text
            v-for="room in rooms"
            :key="room.id + '-l'"
            :x="centroid(room).x"
            :y="centroid(room).y"
            text-anchor="middle"
            dominant-baseline="middle"
            class="room-label fill-slate-800 font-mono text-[22px] font-semibold"
          >
            {{ room.roomNumber }}
          </text>
        </g>

        <!-- Doors (blueprint openings) -->
        <g class="pointer-events-none">
          <template v-for="room in rooms" :key="room.id + '-door'">
            <DoorMark v-if="room.door" :door="room.door" />
          </template>
        </g>
      </svg>
    </div>

    <!-- Floating tooltip (ТЗ §Б: hover popup) -->
    <Transition name="tt">
      <div
        v-if="hovered"
        class="glass pointer-events-none absolute z-30 w-56 rounded-xl p-3 shadow-glow"
        :style="{
          left: `${Math.min(pointer.x + 16, (wrapRef?.clientWidth ?? 0) - 240)}px`,
          top: `${pointer.y + 16}px`,
        }"
      >
        <div class="flex items-center justify-between gap-2">
          <span class="font-mono text-sm font-bold text-fg">{{ hovered.roomNumber }}</span>
          <UiStatusBadge :status="hovered.currentStatus" />
        </div>
        <dl class="mt-2.5 space-y-1.5 text-xs">
          <div v-if="canViewFinance" class="flex justify-between gap-2">
            <dt class="text-muted">Арендатор</dt>
            <dd class="truncate font-medium text-fg">{{ tenantName(hovered) ?? '—' }}</dd>
          </div>
          <div class="flex justify-between gap-2">
            <dt class="text-muted">Площадь</dt>
            <dd class="font-medium text-fg">{{ hovered.area }} м²</dd>
          </div>
          <div v-if="canViewFinance || hovered.currentStatus === 'FREE'" class="flex justify-between gap-2">
            <dt class="text-muted">Ставка</dt>
            <dd class="font-medium text-fg">{{ money(hovered.basePrice) }}</dd>
          </div>
          <div v-if="canViewFinance && contractEnd(hovered)" class="flex justify-between gap-2">
            <dt class="text-muted">Договор до</dt>
            <dd class="font-medium text-fg">{{ contractEnd(hovered) }}</dd>
          </div>
        </dl>
        <p class="mt-2.5 text-center text-[11px] text-muted">
          {{ canViewFinance ? 'Клик — детали и фин-история' : 'Клик — детали помещения' }}
        </p>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.room-poly {
  stroke-width: 3;
  vector-effect: non-scaling-stroke;
  will-change: transform, opacity;
}
.room-poly--active {
  stroke-width: 5;
}
.room-label {
  paint-order: stroke;
  stroke: #ffffff;
  stroke-width: 4px;
}
.tt-enter-active,
.tt-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.tt-enter-from,
.tt-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
</style>
