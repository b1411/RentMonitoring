<script setup lang="ts">
import {
  PencilRuler,
  Building2,
  Layers,
  ChevronDown,
  CheckCircle2,
  Check,
  ChevronRight,
  Plus,
  ImageUp,
  Trash2,
  X,
  PencilRuler as PencilIcon,
} from 'lucide-vue-next';
import { cn, money } from '~/lib/utils';
import type { Building, Floor } from '~/types';

definePageMeta({ middleware: 'admin' });

const api = useApi();

const { data: buildings, refresh: refreshBuildings } = await useAsyncData(
  'admin-buildings',
  () => api<Building[]>('/buildings'),
);

const buildingId = ref<string | null>(null);
watchEffect(() => {
  if (!buildingId.value && buildings.value?.length) buildingId.value = buildings.value[0]!.id;
});

const { data: floors, refresh: refreshFloors } = await useAsyncData<Floor[]>(
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

/* ─── Toast ─── */
const notice = ref<string | null>(null);
let noticeTimer: ReturnType<typeof setTimeout> | null = null;
function toast(msg: string) {
  notice.value = msg;
  if (noticeTimer) clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => (notice.value = null), 3500);
}
onBeforeUnmount(() => noticeTimer && clearTimeout(noticeTimer));

function errMsg(e: unknown, fallback: string): string {
  const err = e as { data?: { message?: string } };
  return err.data?.message ?? fallback;
}

function onCreated(room: { roomNumber: string }) {
  void refresh();
  toast(`Помещение «${room.roomNumber}» сохранено`);
}

/* ─── Create building ─── */
const newBuilding = reactive({ name: '', address: '' });
const creatingBuilding = ref(false);
const buildingError = ref<string | null>(null);
async function createBuilding() {
  buildingError.value = null;
  if (!newBuilding.name.trim() || !newBuilding.address.trim()) {
    buildingError.value = 'Заполни название и адрес';
    return;
  }
  creatingBuilding.value = true;
  try {
    const b = await api<Building>('/buildings', {
      method: 'POST',
      body: { name: newBuilding.name.trim(), address: newBuilding.address.trim() },
    });
    newBuilding.name = '';
    newBuilding.address = '';
    await refreshBuildings();
    buildingId.value = b.id;
    toast(`БЦ «${b.name}» создан`);
  } catch (e) {
    buildingError.value = errMsg(e, 'Не удалось создать БЦ');
  } finally {
    creatingBuilding.value = false;
  }
}

/* ─── Create floor ─── */
const newFloorNumber = ref('');
const creatingFloor = ref(false);
const floorError = ref<string | null>(null);
async function createFloor() {
  floorError.value = null;
  if (!buildingId.value) {
    floorError.value = 'Сначала выбери БЦ';
    return;
  }
  const n = Number(newFloorNumber.value);
  if (!newFloorNumber.value || Number.isNaN(n)) {
    floorError.value = 'Укажи номер этажа';
    return;
  }
  creatingFloor.value = true;
  try {
    const f = await api<Floor>('/floors', {
      method: 'POST',
      body: { buildingId: buildingId.value, floorNumber: n },
    });
    newFloorNumber.value = '';
    await refreshFloors();
    floorId.value = f.id;
    toast(`Этаж ${f.floorNumber} добавлен — загрузи план`);
  } catch (e) {
    floorError.value = errMsg(e, 'Не удалось создать этаж (возможно, номер занят)');
  } finally {
    creatingFloor.value = false;
  }
}

async function onPlanUploaded() {
  await refresh();
  await refreshFloors();
  toast('План этажа обновлён');
}

async function onRoomChanged() {
  await refresh();
  toast('Дверь обновлена');
}

/* ─── Guided steps ─── */
const hasBuildings = computed(() => (buildings.value?.length ?? 0) > 0);
const hasFloors = computed(() => (floors.value?.length ?? 0) > 0);
const currentStep = computed(() => {
  if (!hasBuildings.value) return 1;
  if (!hasFloors.value) return 2;
  if (!floor.value?.planImageUrl) return 3;
  return 4;
});
const steps = [
  { n: 1, label: 'Бизнес-центр' },
  { n: 2, label: 'Этаж' },
  { n: 3, label: 'План' },
  { n: 4, label: 'Разметка' },
];

/* ─── Room placement (focused full-screen editor) ─── */
const placing = ref(false);
const rooms = computed(() => floor.value?.rooms ?? []);

async function deleteRoom(id: string, label: string) {
  if (!window.confirm(`Удалить помещение «${label}»?`)) return;
  try {
    await api(`/rooms/${id}`, { method: 'DELETE' });
    await refresh();
    toast(`Помещение «${label}» удалено`);
  } catch (e) {
    toast(errMsg(e, 'Не удалось удалить'));
  }
}
</script>

<template>
  <div class="animate-slide-up space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-gradient sm:text-3xl">
          <PencilRuler class="h-6 w-6 text-brand sm:h-7 sm:w-7" /> Конструктор разметки
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
        v-if="notice"
        class="flex items-center gap-2 rounded-xl bg-emerald-500/12 px-4 py-3 text-sm font-medium text-emerald-700 ring-1 ring-emerald-500/25"
      >
        <CheckCircle2 class="h-4 w-4" /> {{ notice }}
      </div>
    </Transition>

    <!-- Step guide -->
    <div class="glass flex flex-wrap items-center gap-1.5 rounded-2xl p-2 text-sm">
      <template v-for="(s, i) in steps" :key="s.n">
        <span
          :class="cn(
            'flex items-center gap-2 rounded-xl px-3 py-1.5 font-semibold',
            s.n === currentStep ? 'bg-brand text-white shadow-glow' : s.n < currentStep ? 'text-emerald-700' : 'text-muted',
          )"
        >
          <span
            :class="cn(
              'grid h-5 w-5 place-items-center rounded-full text-xs',
              s.n === currentStep ? 'bg-white/25' : s.n < currentStep ? 'bg-emerald-500/15 text-emerald-700' : 'bg-surface-2',
            )"
          >
            <Check v-if="s.n < currentStep" class="h-3 w-3" /><template v-else>{{ s.n }}</template>
          </span>
          {{ s.label }}
        </span>
        <ChevronRight v-if="i < steps.length - 1" class="h-4 w-4 shrink-0 text-muted/60" />
      </template>
    </div>

    <!-- Management: create building / floor / upload plan -->
    <div class="grid gap-4 md:grid-cols-3">
      <form class="glass rounded-2xl p-5" @submit.prevent="createBuilding">
        <h2 class="flex items-center gap-2 text-sm font-bold text-fg">
          <Building2 class="h-4 w-4 text-brand" /> Новый бизнес-центр
        </h2>
        <div class="mt-3 space-y-2.5">
          <input
            v-model="newBuilding.name"
            placeholder="Название (напр. BC Aurora)"
            class="h-10 w-full rounded-xl bg-surface px-3 text-sm text-fg ring-1 ring-border/60 outline-none focus:ring-2 focus:ring-brand/60"
          />
          <input
            v-model="newBuilding.address"
            placeholder="Адрес"
            class="h-10 w-full rounded-xl bg-surface px-3 text-sm text-fg ring-1 ring-border/60 outline-none focus:ring-2 focus:ring-brand/60"
          />
          <p v-if="buildingError" class="text-xs text-red-700">{{ buildingError }}</p>
          <UiButton type="submit" size="sm" class="w-full" :disabled="creatingBuilding">
            <UiSpinner v-if="creatingBuilding" class="h-4 w-4" /><Plus v-else class="h-4 w-4" /> Создать БЦ
          </UiButton>
        </div>
      </form>

      <form class="glass rounded-2xl p-5" @submit.prevent="createFloor">
        <h2 class="flex items-center gap-2 text-sm font-bold text-fg">
          <Layers class="h-4 w-4 text-brand" /> Новый этаж
        </h2>
        <div class="mt-3 space-y-2.5">
          <input
            v-model="newFloorNumber"
            type="number"
            placeholder="Номер этажа (напр. 3)"
            class="h-10 w-full rounded-xl bg-surface px-3 text-sm text-fg ring-1 ring-border/60 outline-none focus:ring-2 focus:ring-brand/60"
          />
          <p class="text-xs text-muted">Добавится в выбранный БЦ. План загрузишь следующим шагом.</p>
          <p v-if="floorError" class="text-xs text-red-700">{{ floorError }}</p>
          <UiButton type="submit" size="sm" class="w-full" :disabled="creatingFloor">
            <UiSpinner v-if="creatingFloor" class="h-4 w-4" /><Plus v-else class="h-4 w-4" /> Добавить этаж
          </UiButton>
        </div>
      </form>

      <div class="glass rounded-2xl p-5">
        <h2 class="flex items-center gap-2 text-sm font-bold text-fg">
          <ImageUp class="h-4 w-4 text-brand" /> План этажа
        </h2>
        <div class="mt-3">
          <template v-if="floorId">
            <PlanUploader :floor-id="floorId" @uploaded="onPlanUploaded" />
            <p class="mt-2 text-center text-xs text-muted">
              Не обязательно — можно сразу рисовать на сетке ниже.
            </p>
          </template>
          <p v-else class="rounded-xl bg-surface/60 p-4 text-center text-sm text-muted">
            Сначала выбери или создай этаж
          </p>
        </div>
      </div>
    </div>

    <!-- Floor workspace: room list + place button -->
    <div v-if="floor" class="glass rounded-2xl p-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-sm font-bold text-fg">Помещения · Этаж {{ floor.floorNumber }}</h2>
          <p class="text-xs text-muted">{{ rooms.length }} размечено</p>
        </div>
        <UiButton @click="placing = true">
          <PencilIcon class="h-4 w-4" /> Разместить помещение
        </UiButton>
      </div>

      <ul v-if="rooms.length" class="mt-4 grid gap-2 sm:grid-cols-2">
        <li
          v-for="r in rooms"
          :key="r.id"
          class="flex items-center justify-between gap-3 rounded-xl bg-surface/60 p-3 ring-1 ring-border/60"
        >
          <div class="flex min-w-0 items-center gap-2.5">
            <UiStatusBadge :status="r.currentStatus" />
            <span class="font-mono text-sm font-semibold text-fg">{{ r.roomNumber }}</span>
            <span class="truncate text-xs text-muted">{{ r.area }} м² · {{ money(r.basePrice) }}</span>
          </div>
          <button
            type="button"
            class="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-red-500/10 hover:text-red-700"
            aria-label="Удалить"
            @click="deleteRoom(r.id, r.roomNumber)"
          >
            <Trash2 class="h-4 w-4" />
          </button>
        </li>
      </ul>
      <div
        v-else
        class="mt-4 rounded-xl border border-dashed border-border bg-bg-soft p-6 text-center text-sm text-muted"
      >
        Пока пусто. Жми «Разместить помещение» и обведи первый офис.
      </div>
    </div>

    <!-- Guided empty state when no floor selected -->
    <div
      v-else
      class="grid h-72 place-items-center rounded-2xl border border-dashed border-border bg-bg-soft px-6 text-center"
    >
      <div v-if="!hasBuildings" class="max-w-xs text-muted">
        <Building2 class="mx-auto h-8 w-8 text-brand" />
        <p class="mt-3 font-semibold text-fg">Начни с бизнес-центра</p>
        <p class="mt-1 text-sm">Создай первый БЦ в карточке «Новый бизнес-центр» выше ↑</p>
      </div>
      <div v-else-if="!hasFloors" class="max-w-xs text-muted">
        <Layers class="mx-auto h-8 w-8 text-brand" />
        <p class="mt-3 font-semibold text-fg">Добавь этаж</p>
        <p class="mt-1 text-sm">Укажи номер этажа в карточке «Новый этаж» выше ↑</p>
      </div>
      <UiSpinner v-else class="h-8 w-8 text-brand" />
    </div>

    <!-- Focused full-screen drawing surface -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="placing && floor" class="fixed inset-0 z-50 flex flex-col bg-bg/95 backdrop-blur">
          <header class="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
            <div>
              <p class="text-sm font-bold text-fg">Разметка · Этаж {{ floor.floorNumber }}</p>
              <p class="text-xs text-muted">Рисуй помещения и двери. Закончил — жми «Готово».</p>
            </div>
            <button
              type="button"
              class="flex items-center gap-2 rounded-xl bg-surface px-3 py-2 text-sm font-semibold text-fg ring-1 ring-border/60 transition-colors hover:ring-brand/40"
              @click="placing = false"
            >
              <X class="h-4 w-4" /> Готово
            </button>
          </header>
          <div class="flex-1 overflow-auto p-4">
            <div class="mx-auto max-w-5xl">
              <PolygonEditor :key="floor.id" :floor="floor" @created="onCreated" @changed="onRoomChanged" />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
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
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
