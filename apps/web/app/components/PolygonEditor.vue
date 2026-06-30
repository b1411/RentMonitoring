<script setup lang="ts">
import {
  Spline,
  Square,
  Grid3x3,
  HelpCircle,
  Undo2,
  Check,
  Trash2,
  Plus,
  Minus,
  Maximize,
  MousePointerClick,
  DoorOpen,
} from 'lucide-vue-next';
import { cn, money } from '~/lib/utils';
import { ROOM_STATUS_META } from '~/lib/status';
import type { Floor, Point, Room, CreateRoomPayload } from '~/types';

const props = defineProps<{ floor: Floor }>();
const emit = defineEmits<{ created: [room: Room]; changed: [] }>();
const api = useApi();

const existing = computed<Room[]>(() => props.floor.rooms ?? []);
const hasPlan = computed(() => Boolean(props.floor.planImageUrl));
const planAspect = usePlanAspect(() => props.floor.planImageUrl);

/* ─── Tools ─── */
type Tool = 'rect' | 'polygon' | 'door';
const tool = ref<Tool>('rect'); // most rooms are rectangular → fastest default
const snapOn = ref(true);
const GRID = 0.02; // 2% grid → snaps points onto a clean grid

function snap(p: Point): Point {
  if (!snapOn.value) return p;
  return { x: +(Math.round(p.x / GRID) * GRID).toFixed(4), y: +(Math.round(p.y / GRID) * GRID).toFixed(4) };
}

/* ─── Drawing state (coords are fractions 0..1, ТЗ §2) ─── */
const points = ref<Point[]>([]);
const cursor = ref<Point | null>(null);
const svgRef = ref<SVGSVGElement | null>(null);
const SNAP_CLOSE = 0.018;

function toFraction(e: MouseEvent): Point | null {
  const rect = svgRef.value?.getBoundingClientRect();
  if (!rect) return null;
  // Bounding-rect ratio is scale/translate invariant → safe under zoom.
  const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
  const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
  return { x, y };
}

function near(a: Point, b: Point): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) < SNAP_CLOSE;
}

/* ─── Polygon mode ─── */
function onClick(e: MouseEvent) {
  if (tool.value === 'door') {
    void handleDoorClick(e);
    return;
  }
  if (tool.value !== 'polygon') return;
  const raw = toFraction(e);
  if (!raw) return;
  const p = snap(raw);
  if (points.value.length >= 3 && near(p, points.value[0]!)) {
    finish();
    return;
  }
  points.value.push(p);
}

/* ─── Door mode (two clicks → wall opening a→b) ─── */
const doorError = ref<string | null>(null);
const doorA = ref<Point | null>(null);

function inside(p: Point, poly: Point[]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    ) {
      hit = !hit;
    }
  }
  return hit;
}

function fix(p: Point): Point {
  return { x: +p.x.toFixed(4), y: +p.y.toFixed(4) };
}

async function clearDoor(roomId: string) {
  try {
    await api(`/rooms/${roomId}/door`, { method: 'PATCH', body: { door: null } });
    emit('changed');
  } catch {
    doorError.value = 'Не удалось убрать дверь';
  }
}

async function handleDoorClick(e: MouseEvent) {
  const raw = toFraction(e);
  if (!raw) return;
  const p = snap(raw);
  doorError.value = null;

  // First click on an existing door removes it.
  if (!doorA.value) {
    const hit = existing.value.find(
      (r) => r.door && (near(p, r.door.a) || near(p, r.door.b)),
    );
    if (hit) {
      void clearDoor(hit.id);
      return;
    }
    doorA.value = p;
    return;
  }

  // Second click → finish the opening.
  const a = doorA.value;
  const b = p;
  doorA.value = null;
  if (Math.hypot(a.x - b.x, a.y - b.y) < 0.01) return; // ignore double-click
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const room = existing.value.find((r) => inside(mid, r.polygonCoordinates));
  if (!room) {
    doorError.value = 'Дверь должна быть на помещении — кликни по его стене';
    return;
  }
  try {
    await api(`/rooms/${room.id}/door`, {
      method: 'PATCH',
      body: { door: { a: fix(a), b: fix(b) } },
    });
    emit('changed');
  } catch (err) {
    const e2 = err as { data?: { message?: string } };
    doorError.value = e2.data?.message ?? 'Не удалось сохранить дверь';
  }
}

const doorPreview = computed(() => {
  if (tool.value !== 'door' || !doorA.value || !cursor.value) return null;
  return {
    x1: doorA.value.x * 1000,
    y1: doorA.value.y * 1000,
    x2: cursor.value.x * 1000,
    y2: cursor.value.y * 1000,
  };
});

/* ─── Rectangle mode (click-drag) ─── */
const rectStart = ref<Point | null>(null);
function onMouseDown(e: MouseEvent) {
  if (tool.value !== 'rect') return;
  rectStart.value = snap(toFraction(e) ?? { x: 0, y: 0 });
  cursor.value = rectStart.value;
}
function onMouseUp(e: MouseEvent) {
  if (tool.value !== 'rect' || !rectStart.value) return;
  const end = snap(toFraction(e) ?? rectStart.value);
  const x0 = Math.min(rectStart.value.x, end.x);
  const y0 = Math.min(rectStart.value.y, end.y);
  const x1 = Math.max(rectStart.value.x, end.x);
  const y1 = Math.max(rectStart.value.y, end.y);
  rectStart.value = null;
  if (x1 - x0 < 0.01 || y1 - y0 < 0.01) return; // ignore stray clicks
  points.value = [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
  finish();
}

function onMove(e: MouseEvent) {
  const raw = toFraction(e);
  cursor.value = raw ? snap(raw) : null;
}

const rectPreview = computed(() => {
  if (tool.value !== 'rect' || !rectStart.value || !cursor.value) return null;
  const x0 = Math.min(rectStart.value.x, cursor.value.x);
  const y0 = Math.min(rectStart.value.y, cursor.value.y);
  return {
    x: x0 * 1000,
    y: y0 * 1000,
    w: Math.abs(cursor.value.x - rectStart.value.x) * 1000,
    h: Math.abs(cursor.value.y - rectStart.value.y) * 1000,
  };
});

function undo() {
  points.value.pop();
}
function clear() {
  points.value = [];
  cursor.value = null;
  rectStart.value = null;
  doorA.value = null;
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter' && points.value.length >= 3) finish();
  if (e.key === 'Escape') clear();
  if ((e.key === 'z' && (e.ctrlKey || e.metaKey)) || e.key === 'Backspace') undo();
}

/* ─── Onboarding ─── */
const helpOpen = ref(false);
const hint = computed(() => {
  if (tool.value === 'door') {
    return doorA.value
      ? 'Кликни вторую точку — конец проёма. Дверь нарисуется как на чертеже.'
      : 'Кликни начало двери на стене, затем конец. Клик по готовой двери — убрать.';
  }
  if (tool.value === 'rect') {
    return rectStart.value
      ? 'Тяни до противоположного угла и отпусти — откроется форма.'
      : 'Нажми на один угол помещения и протяни прямоугольник до другого.';
  }
  if (points.value.length === 0) return 'Кликни по углу помещения — поставит первую точку.';
  if (points.value.length < 3) return 'Ставь точки по углам. Нужно минимум 3.';
  return 'Кликни по первой точке (пульсирует) или нажми Enter — контур замкнётся.';
});

onMounted(() => {
  window.addEventListener('keydown', onKey);
  // Show the guide once for first-time admins.
  if (import.meta.client && !localStorage.getItem('rm_markup_help_seen')) {
    helpOpen.value = true;
    localStorage.setItem('rm_markup_help_seen', '1');
  }
});
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));

watch(tool, clear);

/* ─── Zoom (CSS scale; bounding-rect capture stays correct) ─── */
const scale = ref(1);
const zoomIn = () => (scale.value = Math.min(5, +(scale.value + 0.4).toFixed(2)));
const zoomOut = () => (scale.value = Math.max(1, +(scale.value - 0.4).toFixed(2)));
const resetZoom = () => (scale.value = 1);

/* ─── Finish → modal form ─── */
const modalOpen = ref(false);
const form = reactive({ roomNumber: '', area: '', basePrice: '' });
const submitting = ref(false);
const error = ref<string | null>(null);

function finish() {
  if (points.value.length < 3) return;
  error.value = null;
  modalOpen.value = true;
}

async function submit() {
  error.value = null;
  if (!form.roomNumber.trim()) {
    error.value = 'Укажите номер помещения';
    return;
  }
  submitting.value = true;
  try {
    const payload: CreateRoomPayload = {
      floorId: props.floor.id,
      roomNumber: form.roomNumber.trim(),
      area: Number(form.area) || 0,
      basePrice: Number(form.basePrice) || 0,
      coordinates: points.value.map((p) => ({ x: +p.x.toFixed(4), y: +p.y.toFixed(4) })),
    };
    const room = await api<Room>('/rooms', { method: 'POST', body: payload });
    emit('created', room);
    modalOpen.value = false;
    clear();
    form.roomNumber = '';
    form.area = '';
    form.basePrice = '';
  } catch (e) {
    const err = e as { data?: { message?: string } };
    error.value = err.data?.message ?? 'Не удалось сохранить помещение';
  } finally {
    submitting.value = false;
  }
}

/* ─── SVG helpers ─── */
const S = (n: number) => (n * 1000).toFixed(1);
const polyPoints = computed(() => points.value.map((p) => `${S(p.x)},${S(p.y)}`).join(' '));
const existPoints = (r: Room) => r.polygonCoordinates.map((p) => `${S(p.x)},${S(p.y)}`).join(' ');
const canFinish = computed(() => points.value.length >= 3);
</script>

<template>
  <div class="space-y-4">
    <!-- Onboarding hint -->
    <div class="flex items-center gap-2.5 rounded-2xl bg-brand/8 px-4 py-3 text-sm text-fg ring-1 ring-brand/20">
      <MousePointerClick class="h-4 w-4 shrink-0 text-brand" />
      <span class="font-medium">{{ hint }}</span>
      <button
        type="button"
        class="ml-auto flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-brand hover:bg-brand/10"
        @click="helpOpen = true"
      >
        <HelpCircle class="h-4 w-4" /> Как рисовать?
      </button>
    </div>

    <!-- Toolbar -->
    <div class="glass flex flex-wrap items-center gap-2 rounded-2xl p-2">
      <!-- Tool switch -->
      <div class="flex items-center gap-1 rounded-xl bg-surface-2/60 p-1 ring-1 ring-border/60">
        <button
          type="button"
          :class="cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors', tool === 'rect' ? 'bg-brand text-white shadow-glow' : 'text-muted hover:text-fg')"
          @click="tool = 'rect'"
        >
          <Square class="h-4 w-4" /> Прямоугольник
        </button>
        <button
          type="button"
          :class="cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors', tool === 'polygon' ? 'bg-brand text-white shadow-glow' : 'text-muted hover:text-fg')"
          @click="tool = 'polygon'"
        >
          <Spline class="h-4 w-4" /> Полигон
        </button>
        <button
          type="button"
          :class="cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors', tool === 'door' ? 'bg-brand text-white shadow-glow' : 'text-muted hover:text-fg')"
          @click="tool = 'door'"
        >
          <DoorOpen class="h-4 w-4" /> Дверь
        </button>
      </div>

      <button
        type="button"
        :class="cn('flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold ring-1 transition-colors', snapOn ? 'bg-brand/10 text-brand ring-brand/30' : 'text-muted ring-border/60 hover:text-fg')"
        @click="snapOn = !snapOn"
      >
        <Grid3x3 class="h-4 w-4" /> Сетка
      </button>

      <span class="mx-1 h-6 w-px bg-border/60" />

      <UiButton v-if="tool === 'polygon'" variant="ghost" size="sm" :disabled="!points.length" @click="undo">
        <Undo2 class="h-4 w-4" /> Отмена точки
      </UiButton>
      <UiButton variant="ghost" size="sm" :disabled="!points.length && !rectStart" @click="clear">
        <Trash2 class="h-4 w-4" /> Сбросить
      </UiButton>
      <UiButton v-if="tool === 'polygon'" variant="primary" size="sm" :disabled="!canFinish" @click="finish">
        <Check class="h-4 w-4" /> Завершить
      </UiButton>

      <span class="ml-auto rounded-lg bg-bg/60 px-2.5 py-1 font-mono text-xs text-muted">
        точек: {{ points.length }}
      </span>
    </div>

    <p v-if="doorError && tool === 'door'" class="rounded-xl bg-red-500/12 px-3 py-2 text-sm text-red-700">
      {{ doorError }}
    </p>

    <!-- Canvas -->
    <div class="relative overflow-auto rounded-2xl border border-border/60 bg-bg-soft shadow-card">
      <div class="absolute right-3 top-3 z-20 flex flex-col gap-1.5">
        <UiButton variant="secondary" size="icon" aria-label="Приблизить" @click="zoomIn"><Plus class="h-4 w-4" /></UiButton>
        <UiButton variant="secondary" size="icon" aria-label="Отдалить" @click="zoomOut"><Minus class="h-4 w-4" /></UiButton>
        <UiButton variant="secondary" size="icon" aria-label="Сброс" @click="resetZoom"><Maximize class="h-4 w-4" /></UiButton>
      </div>

      <div
        class="mx-auto origin-top-left transition-transform duration-200"
        :style="{ width: '100%', aspectRatio: planAspect, transform: `scale(${scale})` }"
      >
        <svg
          ref="svgRef"
          viewBox="0 0 1000 1000"
          class="h-full w-full cursor-crosshair select-none"
          preserveAspectRatio="none"
          @mousemove="onMove"
          @mousedown="onMouseDown"
          @mouseup="onMouseUp"
          @click="onClick"
        >
          <defs>
            <pattern id="snapgrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M20 0H0V20" fill="none" stroke="var(--color-brand)" stroke-width="0.4" opacity="0.25" />
            </pattern>
            <pattern id="editor-blankgrid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M50 0H0V50" fill="none" stroke="var(--color-border)" stroke-width="1" />
            </pattern>
          </defs>

          <image v-if="hasPlan" :href="floor.planImageUrl" x="0" y="0" width="1000" height="1000" preserveAspectRatio="none" />
          <template v-else>
            <rect x="0" y="0" width="1000" height="1000" class="fill-surface" />
            <rect x="0" y="0" width="1000" height="1000" fill="url(#editor-blankgrid)" />
          </template>

          <!-- Snap grid overlay -->
          <rect v-if="snapOn" x="0" y="0" width="1000" height="1000" fill="url(#snapgrid)" class="pointer-events-none" />

          <!-- Existing rooms (reference, dimmed) -->
          <polygon
            v-for="r in existing"
            :key="r.id"
            :points="existPoints(r)"
            :class="cn('opacity-40 [stroke-width:2] [vector-effect:non-scaling-stroke]', ROOM_STATUS_META[r.currentStatus].poly)"
          />

          <!-- Existing doors (blueprint) -->
          <template v-for="r in existing" :key="r.id + '-door'">
            <DoorMark v-if="r.door" :door="r.door" />
          </template>

          <!-- Door being drawn -->
          <line
            v-if="doorPreview"
            :x1="doorPreview.x1"
            :y1="doorPreview.y1"
            :x2="doorPreview.x2"
            :y2="doorPreview.y2"
            class="stroke-brand [stroke-dasharray:6_6] [stroke-width:3] [vector-effect:non-scaling-stroke]"
          />
          <circle
            v-if="tool === 'door' && doorA"
            :cx="doorA.x * 1000"
            :cy="doorA.y * 1000"
            r="6"
            class="fill-brand stroke-white [stroke-width:2] [vector-effect:non-scaling-stroke]"
          />

          <!-- Rectangle preview -->
          <rect
            v-if="rectPreview"
            :x="rectPreview.x"
            :y="rectPreview.y"
            :width="rectPreview.w"
            :height="rectPreview.h"
            class="fill-brand/20 stroke-brand [stroke-dasharray:6_6] [stroke-width:3] [vector-effect:non-scaling-stroke]"
          />

          <!-- Polygon: rubber-band line to cursor -->
          <line
            v-if="tool === 'polygon' && points.length && cursor"
            :x1="S(points[points.length - 1]!.x)"
            :y1="S(points[points.length - 1]!.y)"
            :x2="S(cursor.x)"
            :y2="S(cursor.y)"
            class="stroke-brand/70 [stroke-dasharray:6_6] [stroke-width:2] [vector-effect:non-scaling-stroke]"
          />

          <!-- Current polygon -->
          <polygon
            v-if="tool === 'polygon' && points.length >= 2"
            :points="polyPoints"
            class="fill-brand/20 stroke-brand [stroke-width:3] [vector-effect:non-scaling-stroke]"
          />

          <!-- Vertices -->
          <circle
            v-for="(p, i) in points"
            :key="i"
            :cx="S(p.x)"
            :cy="S(p.y)"
            :r="i === 0 ? 9 : 6"
            :class="cn('transition-all', i === 0 ? 'fill-white stroke-brand [stroke-width:3] [vector-effect:non-scaling-stroke]' : 'fill-brand stroke-white [stroke-width:2] [vector-effect:non-scaling-stroke]')"
          />
          <!-- Snap hint on first point (polygon) -->
          <circle
            v-if="tool === 'polygon' && canFinish && points[0]"
            :cx="S(points[0].x)"
            :cy="S(points[0].y)"
            r="16"
            class="animate-ping fill-none stroke-brand/60 [stroke-width:2] [vector-effect:non-scaling-stroke]"
          />
        </svg>
      </div>
    </div>

    <!-- Help modal -->
    <UiModal v-model:open="helpOpen" title="Как размечать помещения" subtitle="Два режима — выбери удобный">
      <div class="space-y-4 text-sm">
        <div class="rounded-xl bg-surface/60 p-4 ring-1 ring-border/60">
          <p class="flex items-center gap-2 font-semibold text-fg"><Square class="h-4 w-4 text-brand" /> Прямоугольник (быстро)</p>
          <p class="mt-1 text-muted">Нажми на один угол помещения и протяни мышь до противоположного. Отпусти — откроется форма. Подходит для большинства комнат.</p>
        </div>
        <div class="rounded-xl bg-surface/60 p-4 ring-1 ring-border/60">
          <p class="flex items-center gap-2 font-semibold text-fg"><Spline class="h-4 w-4 text-brand" /> Полигон (сложная форма)</p>
          <ol class="mt-1 list-decimal space-y-1 pl-5 text-muted">
            <li>Кликай по углам — точки соединятся линией.</li>
            <li>Минимум 3 точки.</li>
            <li>Клик по первой точке или <kbd class="rounded bg-surface-2 px-1.5 font-mono">Enter</kbd> — замкнуть.</li>
          </ol>
        </div>
        <div class="rounded-xl bg-surface/60 p-4 ring-1 ring-border/60">
          <p class="flex items-center gap-2 font-semibold text-fg"><DoorOpen class="h-4 w-4 text-brand" /> Дверь</p>
          <p class="mt-1 text-muted">Включи режим «Дверь» и кликни внутри помещения — поставит метку входа. Клик по двери — убрать. Дверь видят и клиенты на карте.</p>
        </div>
        <div class="rounded-xl bg-surface/60 p-4 ring-1 ring-border/60">
          <p class="flex items-center gap-2 font-semibold text-fg"><Grid3x3 class="h-4 w-4 text-brand" /> Сетка</p>
          <p class="mt-1 text-muted">Точки прилипают к сетке — контуры ровные. Можно выключить кнопкой «Сетка».</p>
        </div>
        <p class="text-xs text-muted">
          Горячие клавиши: <kbd class="rounded bg-surface-2 px-1.5 font-mono">Enter</kbd> замкнуть ·
          <kbd class="rounded bg-surface-2 px-1.5 font-mono">Backspace</kbd> отмена точки ·
          <kbd class="rounded bg-surface-2 px-1.5 font-mono">Esc</kbd> сброс. Координаты пишутся во фракциях 0…1 — карта не «съезжает».
        </p>
        <div class="flex justify-end">
          <UiButton size="sm" @click="helpOpen = false">Понятно</UiButton>
        </div>
      </div>
    </UiModal>

    <!-- New room modal (ТЗ §3: модалка с номером помещения) -->
    <UiModal v-model:open="modalOpen" title="Новое помещение" subtitle="Привязка контура к данным аренды">
      <form class="space-y-4" @submit.prevent="submit">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-fg">Номер помещения</label>
          <input
            v-model="form.roomNumber"
            placeholder="напр. 301-B"
            class="h-11 w-full rounded-xl bg-bg-soft px-4 text-sm text-fg ring-1 ring-border/60 outline-none transition-shadow placeholder:text-muted focus:ring-2 focus:ring-brand/60"
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-fg">Площадь, м²</label>
            <input
              v-model="form.area"
              type="number"
              min="0"
              step="0.1"
              placeholder="48"
              class="h-11 w-full rounded-xl bg-bg-soft px-4 text-sm text-fg ring-1 ring-border/60 outline-none focus:ring-2 focus:ring-brand/60"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-fg">Ставка, ₸</label>
            <input
              v-model="form.basePrice"
              type="number"
              min="0"
              step="100"
              placeholder="10500"
              class="h-11 w-full rounded-xl bg-bg-soft px-4 text-sm text-fg ring-1 ring-border/60 outline-none focus:ring-2 focus:ring-brand/60"
            />
          </div>
        </div>

        <p class="rounded-lg bg-bg/60 px-3 py-2 font-mono text-xs text-muted">
          {{ points.length }} точек · ставка {{ money(Number(form.basePrice) || 0) }}
        </p>
        <p v-if="error" class="rounded-lg bg-red-500/12 px-3 py-2 text-sm text-red-700">{{ error }}</p>

        <div class="flex justify-end gap-2 pt-1">
          <UiButton type="button" variant="ghost" @click="modalOpen = false">Отмена</UiButton>
          <UiButton type="submit" :disabled="submitting">
            <UiSpinner v-if="submitting" class="h-4 w-4" />
            Сохранить помещение
          </UiButton>
        </div>
      </form>
    </UiModal>
  </div>
</template>
