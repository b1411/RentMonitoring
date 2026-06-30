<script setup lang="ts">
import { MapPin, Layers, ChevronDown, SlidersHorizontal } from 'lucide-vue-next';
import { ROOM_STATUSES } from '~/lib/status';
import { money, cn } from '~/lib/utils';
import type { Building, Floor, Room, RoomStatus } from '~/types';

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

const { canViewFinance } = useAuth();

const freeRooms = computed(() => rooms.value.filter((r) => r.currentStatus === 'FREE'));
const occupiedCount = computed(() => rooms.value.filter((r) => r.currentStatus !== 'FREE').length);

/* Client filters for free spaces */
const minArea = ref('');
const maxPrice = ref('');
const filteredFreeRooms = computed(() =>
  freeRooms.value.filter((r) => {
    const okArea = !minArea.value || r.area >= Number(minArea.value);
    const okPrice = !maxPrice.value || Number(r.basePrice) <= Number(maxPrice.value);
    return okArea && okPrice;
  }),
);
// Clients see only the two collapsed states; staff see the full palette.
const legendStatuses = computed<RoomStatus[]>(() =>
  canViewFinance.value ? ROOM_STATUSES : ['FREE', 'OCCUPIED'],
);

/* Room sheet */
const selectedRoomId = ref<string | null>(null);
const selectedRoom = ref<Room | null>(null);
const sheetOpen = ref(false);
function onSelect(room: Room) {
  selectedRoomId.value = room.id;
  selectedRoom.value = room;
  sheetOpen.value = true;
}
</script>

<template>
  <div class="animate-slide-up space-y-6">
    <!-- Hero header -->
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-gradient sm:text-3xl">Карта помещений</h1>
        <p v-if="activeBuilding" class="mt-1 flex items-center gap-1.5 text-sm text-muted">
          <MapPin class="h-4 w-4" /> {{ activeBuilding.name }} · {{ activeBuilding.address }}
        </p>
      </div>

      <!-- Building selector -->
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
    </div>

    <!-- Floor tabs (scroll on mobile / many floors) -->
    <div v-if="(floors?.length ?? 0) > 0" class="flex gap-2 overflow-x-auto pb-1">
      <button
        v-for="f in floors ?? []"
        :key="f.id"
        type="button"
        :class="cn(
          'flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ring-1 transition-colors',
          f.id === floorId ? 'bg-brand text-white ring-brand shadow-glow' : 'glass text-muted ring-border/60 hover:text-fg',
        )"
        @click="floorId = f.id"
      >
        <Layers class="h-4 w-4" /> Этаж {{ f.floorNumber }}
        <span :class="cn('rounded-md px-1.5 text-xs', f.id === floorId ? 'bg-white/20' : 'bg-surface-2')">
          {{ f._count?.rooms ?? 0 }}
        </span>
      </button>
    </div>

    <div class="grid gap-6 lg:grid-cols-[1fr_300px]">
      <!-- Map -->
      <div class="relative">
        <Transition name="page" mode="out-in">
          <FloorMap
            v-if="floor"
            :key="floor.id"
            :floor="floor"
            :can-view-finance="canViewFinance"
            @select="onSelect"
          />
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
            <StatusLegend :rooms="rooms" :statuses="legendStatuses" />
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
              <dd class="font-mono font-semibold text-emerald-600">{{ freeRooms.length }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted">{{ canViewFinance ? 'Просрочка' : 'Занято' }}</dt>
              <dd
                class="font-mono font-semibold"
                :class="canViewFinance ? 'text-red-600' : 'text-violet-600'"
              >
                {{
                  canViewFinance
                    ? rooms.filter((r) => r.currentStatus === 'OVERDUE').length
                    : occupiedCount
                }}
              </dd>
            </div>
          </dl>
        </div>

        <!-- Client listing: free spaces with area + price + filters -->
        <div v-if="!canViewFinance" class="glass rounded-2xl p-5">
          <p class="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted">
            <span class="flex items-center gap-1.5"><SlidersHorizontal class="h-3.5 w-3.5" /> Свободные площади</span>
            <span class="rounded-md bg-emerald-500/12 px-1.5 py-0.5 text-emerald-700">{{ filteredFreeRooms.length }}</span>
          </p>
          <div class="mt-3 grid grid-cols-2 gap-2">
            <input
              v-model="minArea"
              type="number"
              min="0"
              placeholder="от, м²"
              class="h-9 w-full rounded-lg bg-surface px-2.5 text-sm text-fg ring-1 ring-border/60 outline-none focus:ring-2 focus:ring-brand/60"
            />
            <input
              v-model="maxPrice"
              type="number"
              min="0"
              placeholder="до, ₸"
              class="h-9 w-full rounded-lg bg-surface px-2.5 text-sm text-fg ring-1 ring-border/60 outline-none focus:ring-2 focus:ring-brand/60"
            />
          </div>
          <ul v-if="filteredFreeRooms.length" class="mt-3 space-y-2">
            <li v-for="r in filteredFreeRooms" :key="r.id">
              <button
                type="button"
                class="flex w-full items-center justify-between gap-3 rounded-xl bg-surface/60 px-3 py-2.5 text-left ring-1 ring-border/60 transition-colors hover:ring-brand/40"
                @click="onSelect(r)"
              >
                <span class="flex items-center gap-2">
                  <span class="h-2 w-2 rounded-full bg-emerald-500" />
                  <span class="font-mono text-sm font-semibold text-fg">{{ r.roomNumber }}</span>
                  <span class="text-xs text-muted">{{ r.area }} м²</span>
                </span>
                <span class="text-sm font-semibold text-fg">{{ money(r.basePrice) }}</span>
              </button>
            </li>
          </ul>
          <p v-else class="mt-3 rounded-xl bg-surface/50 p-3 text-center text-sm text-muted">
            {{ freeRooms.length ? 'Ничего не найдено по фильтру' : 'Нет свободных помещений на этом этаже' }}
          </p>
        </div>

        <p class="px-1 text-xs leading-relaxed text-muted">
          {{
            canViewFinance
              ? 'Наведи на помещение — быстрая сводка. Клик — финансовая история и оплата счетов.'
              : 'Наведи на помещение — площадь и ставка. Клик — детали свободной площади.'
          }}
        </p>
      </aside>
    </div>

    <RoomSheet
      v-model:open="sheetOpen"
      :room-id="selectedRoomId"
      :room="selectedRoom"
      :can-view-finance="canViewFinance"
      @changed="refreshFloor()"
    />
  </div>
</template>
