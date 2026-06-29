<script setup lang="ts">
import { PencilRuler, Building2, Layers, ChevronDown, CheckCircle2 } from 'lucide-vue-next';
import type { Building, Floor } from '~/types';

const api = useApi();

const { data: buildings } = await useAsyncData('admin-buildings', () => api<Building[]>('/buildings'));

const buildingId = ref<string | null>(null);
watchEffect(() => {
  if (!buildingId.value && buildings.value?.length) buildingId.value = buildings.value[0]!.id;
});

const { data: floors } = await useAsyncData<Floor[]>(
  'admin-floors',
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

const { data: floor, refresh } = await useAsyncData<Floor | null>(
  'admin-floor',
  () => (floorId.value ? api<Floor>(`/floors/${floorId.value}`) : Promise.resolve(null)),
  { watch: [floorId] },
);

const justSaved = ref<string | null>(null);
let savedTimer: ReturnType<typeof setTimeout> | null = null;
async function onCreated(room: { roomNumber: string }) {
  await refresh();
  justSaved.value = room.roomNumber;
  if (savedTimer) clearTimeout(savedTimer);
  savedTimer = setTimeout(() => (justSaved.value = null), 3500);
}
onBeforeUnmount(() => savedTimer && clearTimeout(savedTimer));
</script>

<template>
  <div class="animate-slide-up space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="flex items-center gap-2 text-3xl font-extrabold tracking-tight text-gradient">
          <PencilRuler class="h-7 w-7 text-brand" /> Конструктор разметки
        </h1>
        <p class="mt-1 text-sm text-muted">Обведи помещение на плане и привяжи к данным аренды.</p>
      </div>

      <div class="flex flex-wrap gap-3">
        <label class="relative">
          <Building2 class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <select
            v-model="buildingId"
            class="glass h-11 appearance-none rounded-xl border-0 pl-10 pr-10 text-sm font-semibold text-fg ring-1 ring-border/60 outline-none focus:ring-2 focus:ring-brand/60"
          >
            <option v-for="b in buildings ?? []" :key="b.id" :value="b.id" class="bg-surface">{{ b.name }}</option>
          </select>
          <ChevronDown class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        </label>
        <label class="relative">
          <Layers class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <select
            v-model="floorId"
            class="glass h-11 appearance-none rounded-xl border-0 pl-10 pr-10 text-sm font-semibold text-fg ring-1 ring-border/60 outline-none focus:ring-2 focus:ring-brand/60"
          >
            <option v-for="f in floors ?? []" :key="f.id" :value="f.id" class="bg-surface">
              Этаж {{ f.floorNumber }} · {{ f._count?.rooms ?? 0 }} пом.
            </option>
          </select>
          <ChevronDown class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        </label>
      </div>
    </div>

    <Transition name="tt">
      <div
        v-if="justSaved"
        class="flex items-center gap-2 rounded-xl bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-300 ring-1 ring-emerald-500/30"
      >
        <CheckCircle2 class="h-4 w-4" /> Помещение «{{ justSaved }}» сохранено
      </div>
    </Transition>

    <PolygonEditor v-if="floor" :key="floor.id" :floor="floor" @created="onCreated" />
    <div v-else class="grid h-96 place-items-center rounded-2xl border border-border/60 bg-bg-soft text-muted">
      <UiSpinner class="h-8 w-8 text-brand" />
    </div>
  </div>
</template>

<style scoped>
.tt-enter-active,
.tt-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.tt-enter-from,
.tt-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
