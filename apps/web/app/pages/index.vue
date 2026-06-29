<script setup lang="ts">
import { MapPin, Layers, ChevronDown } from 'lucide-vue-next';
import type { Building, Floor, Room } from '~/types';

const api = useApi();

const { data: buildings } = await useAsyncData('buildings', () => api<Building[]>('/buildings'));

const buildingId = ref<string | null>(null);
watchEffect(() => {
  if (!buildingId.value && buildings.value?.length) buildingId.value = buildings.value[0]!.id;
});

const { data: floors } = await useAsyncData<Floor[]>(
  'floors',
  () => (buildingId.value ? api<Floor[]>(`/floors?buildingId=${buildingId.value}`) : Promise.resolve([])),
  { watch: [buildingId], default: () => [] },
);

const floorId = ref<string | null>(null);
watch(
  floors,
  (list) => {
    if (list?.length && !list.some((f) => f.id === floorId.value)) floorId.value = list[0]!.id;
  },
  { immediate: true },
);

const {
  data: floor,
  pending: floorPending,
  refresh: refreshFloor,
} = await useAsyncData<Floor | null>(
  'floor',
  () => (floorId.value ? api<Floor>(`/floors/${floorId.value}`) : Promise.resolve(null)),
  { watch: [floorId] },
);

const rooms = computed(() => floor.value?.rooms ?? []);
const activeBuilding = computed(() => buildings.value?.find((b) => b.id === buildingId.value));

/* Room sheet */
const selectedRoomId = ref<string | null>(null);
const sheetOpen = ref(false);
function onSelect(room: Room) {
  selectedRoomId.value = room.id;
  sheetOpen.value = true;
}
</script>

<template>
  <div class="animate-slide-up space-y-6">
    <!-- Hero header -->
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-3xl font-extrabold tracking-tight text-gradient">Карта помещений</h1>
        <p v-if="activeBuilding" class="mt-1 flex items-center gap-1.5 text-sm text-muted">
          <MapPin class="h-4 w-4" /> {{ activeBuilding.name }} · {{ activeBuilding.address }}
        </p>
      </div>

      <!-- Selectors -->
      <div class="flex flex-wrap gap-3">
        <label class="relative">
          <select
            v-model="buildingId"
            class="glass h-11 appearance-none rounded-xl border-0 pl-4 pr-10 text-sm font-semibold text-fg ring-1 ring-border/60 outline-none transition-shadow focus:ring-2 focus:ring-brand/60"
          >
            <option v-for="b in buildings ?? []" :key="b.id" :value="b.id" class="bg-surface">
              {{ b.name }}
            </option>
          </select>
          <ChevronDown class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        </label>
        <label class="relative">
          <select
            v-model="floorId"
            class="glass h-11 appearance-none rounded-xl border-0 pl-4 pr-10 text-sm font-semibold text-fg ring-1 ring-border/60 outline-none transition-shadow focus:ring-2 focus:ring-brand/60"
          >
            <option v-for="f in floors ?? []" :key="f.id" :value="f.id" class="bg-surface">
              Этаж {{ f.floorNumber }} · {{ f._count?.rooms ?? 0 }} пом.
            </option>
          </select>
          <Layers class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        </label>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-[1fr_300px]">
      <!-- Map -->
      <div class="relative">
        <Transition name="page" mode="out-in">
          <FloorMap v-if="floor" :key="floor.id" :floor="floor" @select="onSelect" />
          <div
            v-else
            class="grid aspect-square w-full place-items-center rounded-2xl border border-border/60 bg-bg-soft text-muted"
          >
            <UiSpinner class="h-8 w-8 text-brand" />
          </div>
        </Transition>
        <div
          v-if="floorPending"
          class="absolute inset-0 grid place-items-center rounded-2xl bg-bg/40 backdrop-blur-sm"
        >
          <UiSpinner class="h-8 w-8 text-brand" />
        </div>
      </div>

      <!-- Side panel -->
      <aside class="space-y-5">
        <div class="glass rounded-2xl p-5">
          <p class="text-xs font-semibold uppercase tracking-wide text-muted">Статусы</p>
          <div class="mt-3">
            <StatusLegend :rooms="rooms" />
          </div>
        </div>
        <div class="glass rounded-2xl p-5">
          <p class="text-xs font-semibold uppercase tracking-wide text-muted">Сводка по этажу</p>
          <dl class="mt-3 space-y-2.5 text-sm">
            <div class="flex justify-between">
              <dt class="text-muted">Всего помещений</dt>
              <dd class="font-mono font-semibold text-fg">{{ rooms.length }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted">Свободно</dt>
              <dd class="font-mono font-semibold text-emerald-300">
                {{ rooms.filter((r) => r.currentStatus === 'FREE').length }}
              </dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted">Просрочка</dt>
              <dd class="font-mono font-semibold text-red-300">
                {{ rooms.filter((r) => r.currentStatus === 'OVERDUE').length }}
              </dd>
            </div>
          </dl>
        </div>
        <p class="px-1 text-xs leading-relaxed text-muted">
          Наведи на помещение — быстрая сводка. Клик — финансовая история и оплата счетов.
        </p>
      </aside>
    </div>

    <RoomSheet v-model:open="sheetOpen" :room-id="selectedRoomId" @changed="refreshFloor()" />
  </div>
</template>
