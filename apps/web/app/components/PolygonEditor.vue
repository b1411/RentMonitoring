<script setup lang="ts">
import { Spline, Undo2, Check, Trash2, Plus, Minus, Maximize } from 'lucide-vue-next';
import { cn, money } from '~/lib/utils';
import { ROOM_STATUS_META } from '~/lib/status';
import type { Floor, Point, Room, CreateRoomPayload } from '~/types';

const props = defineProps<{ floor: Floor }>();
const emit = defineEmits<{ created: [room: Room] }>();
const api = useApi();

const existing = computed<Room[]>(() => props.floor.rooms ?? []);

/* ─── Drawing state (coords are fractions 0..1, ТЗ §2) ─── */
const points = ref<Point[]>([]);
const cursor = ref<Point | null>(null);
const svgRef = ref<SVGSVGElement | null>(null);
const SNAP = 0.018;

function toFraction(e: MouseEvent): Point | null {
  const rect = svgRef.value?.getBoundingClientRect();
  if (!rect) return null;
  // Bounding-rect ratio is scale/translate invariant → safe under zoom.
  const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
  const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
  return { x, y };
}

function near(a: Point, b: Point): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) < SNAP;
}

function onMove(e: MouseEvent) {
  cursor.value = toFraction(e);
}

function onClick(e: MouseEvent) {
  const p = toFraction(e);
  if (!p) return;
  // Click first point (with ≥3 points) closes the contour.
  if (points.value.length >= 3 && near(p, points.value[0]!)) {
    finish();
    return;
  }
  points.value.push(p);
}

function undo() {
  points.value.pop();
}
function clear() {
  points.value = [];
  cursor.value = null;
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter' && points.value.length >= 3) finish();
  if (e.key === 'Escape') clear();
  if ((e.key === 'z' && (e.ctrlKey || e.metaKey)) || e.key === 'Backspace') undo();
}
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));

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
    <!-- Toolbar (ТЗ §3 Module A) -->
    <div class="glass flex flex-wrap items-center gap-2 rounded-2xl p-2">
      <span class="flex items-center gap-2 px-2 text-sm font-semibold text-fg">
        <Spline class="h-4 w-4 text-brand" /> Инструмент «Полигон»
      </span>
      <span class="mx-1 h-6 w-px bg-border/60" />
      <UiButton variant="ghost" size="sm" :disabled="!points.length" @click="undo">
        <Undo2 class="h-4 w-4" /> Отмена точки
      </UiButton>
      <UiButton variant="ghost" size="sm" :disabled="!points.length" @click="clear">
        <Trash2 class="h-4 w-4" /> Сбросить
      </UiButton>
      <UiButton variant="primary" size="sm" :disabled="!canFinish" @click="finish">
        <Check class="h-4 w-4" /> Завершить обводку
      </UiButton>
      <span class="ml-auto rounded-lg bg-bg/60 px-2.5 py-1 font-mono text-xs text-muted">
        точек: {{ points.length }}
      </span>
    </div>

    <!-- Canvas -->
    <div class="relative overflow-auto rounded-2xl border border-border/60 bg-bg-soft shadow-card">
      <div class="absolute right-3 top-3 z-20 flex flex-col gap-1.5">
        <UiButton variant="secondary" size="icon" aria-label="Приблизить" @click="zoomIn"><Plus class="h-4 w-4" /></UiButton>
        <UiButton variant="secondary" size="icon" aria-label="Отдалить" @click="zoomOut"><Minus class="h-4 w-4" /></UiButton>
        <UiButton variant="secondary" size="icon" aria-label="Сброс" @click="resetZoom"><Maximize class="h-4 w-4" /></UiButton>
      </div>

      <div
        class="mx-auto origin-top-left transition-transform duration-200"
        :style="{ width: '100%', aspectRatio: '1 / 1', transform: `scale(${scale})` }"
      >
        <svg
          ref="svgRef"
          viewBox="0 0 1000 1000"
          class="h-full w-full cursor-crosshair"
          preserveAspectRatio="xMidYMid meet"
          @mousemove="onMove"
          @click="onClick"
        >
          <image :href="floor.planImageUrl" x="0" y="0" width="1000" height="1000" />

          <!-- Existing rooms (reference, dimmed) -->
          <polygon
            v-for="r in existing"
            :key="r.id"
            :points="existPoints(r)"
            :class="cn('opacity-40 [stroke-width:2] [vector-effect:non-scaling-stroke]', ROOM_STATUS_META[r.currentStatus].poly)"
          />

          <!-- Rubber-band line to cursor -->
          <line
            v-if="points.length && cursor"
            :x1="S(points[points.length - 1]!.x)"
            :y1="S(points[points.length - 1]!.y)"
            :x2="S(cursor.x)"
            :y2="S(cursor.y)"
            class="stroke-brand/70 [stroke-dasharray:6_6] [stroke-width:2] [vector-effect:non-scaling-stroke]"
          />

          <!-- Current polygon -->
          <polygon
            v-if="points.length >= 2"
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
            :class="
              cn(
                'transition-all',
                i === 0
                  ? 'fill-white stroke-brand [stroke-width:3] [vector-effect:non-scaling-stroke]'
                  : 'fill-brand stroke-white [stroke-width:2] [vector-effect:non-scaling-stroke]',
              )
            "
          />
          <!-- Snap hint on first point -->
          <circle
            v-if="canFinish && points[0]"
            :cx="S(points[0].x)"
            :cy="S(points[0].y)"
            r="16"
            class="animate-ping fill-none stroke-brand/60 [stroke-width:2] [vector-effect:non-scaling-stroke]"
          />
        </svg>
      </div>
    </div>

    <p class="px-1 text-xs leading-relaxed text-muted">
      Кликай по плану — ставит точки. Клик по <b class="text-fg">первой точке</b> или
      <kbd class="rounded bg-surface-2 px-1.5 py-0.5 font-mono">Enter</kbd> замыкает контур.
      <kbd class="rounded bg-surface-2 px-1.5 py-0.5 font-mono">Backspace</kbd> — отмена точки,
      <kbd class="rounded bg-surface-2 px-1.5 py-0.5 font-mono">Esc</kbd> — сброс. Координаты пишутся во
      фракциях 0…1 — карта не «съезжает» на любом экране.
    </p>

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
        <p v-if="error" class="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{{ error }}</p>

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
