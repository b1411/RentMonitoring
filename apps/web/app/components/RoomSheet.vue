<script setup lang="ts">
import { Building2, CalendarRange, Wallet, Receipt, CheckCircle2, Lock, DoorOpen, Mail } from 'lucide-vue-next';
import { cn, money, formatDate } from '~/lib/utils';
import type { Room, Invoice, InvoiceStatus } from '~/types';

const open = defineModel<boolean>('open', { default: false });
const props = withDefaults(
  defineProps<{
    roomId: string | null;
    room?: Room | null;
    canViewFinance?: boolean;
  }>(),
  { room: null, canViewFinance: false },
);
const emit = defineEmits<{ changed: [] }>();

const api = useApi();
const room = ref<Room | null>(null);
const loading = ref(false);
const paying = ref<string | null>(null);

async function load(id: string) {
  loading.value = true;
  try {
    room.value = await api<Room>(`/rooms/${id}`);
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.roomId,
  (id) => {
    // Show the basic room instantly; fetch full financials only for signed-in users.
    room.value = props.room;
    if (id && props.canViewFinance) void load(id);
  },
);

// Client lead — opens the mail composer pre-filled for the selected free room.
const leadHref = computed(() => {
  const r = room.value;
  const subject = encodeURIComponent(`Заявка на аренду — помещение ${r?.roomNumber ?? ''}`);
  const body = encodeURIComponent(
    `Здравствуйте! Интересует помещение ${r?.roomNumber ?? ''} (${r?.area ?? ''} м²). Прошу связаться по вопросу аренды.`,
  );
  return `mailto:?subject=${subject}&body=${body}`;
});

const activeContract = computed(() => room.value?.contracts?.find((c) => c.isActive) ?? null);
const tenant = computed(() => activeContract.value?.tenant ?? null);

const invoices = computed<Invoice[]>(() =>
  (room.value?.contracts ?? []).flatMap((c) => c.invoices ?? []),
);

const balance = computed(() =>
  invoices.value.filter((i) => i.status === 'UNPAID').reduce((sum, i) => sum + Number(i.amount), 0),
);

const INVOICE_META: Record<InvoiceStatus, { label: string; cls: string }> = {
  UNPAID: { label: 'Не оплачен', cls: 'bg-red-500/12 text-red-700 ring-red-500/25' },
  PAID: { label: 'Оплачен', cls: 'bg-emerald-500/12 text-emerald-700 ring-emerald-500/25' },
  CANCELLED: { label: 'Отменён', cls: 'bg-surface-2 text-muted ring-border' },
};

function isOverdue(inv: Invoice): boolean {
  return inv.status === 'UNPAID' && new Date(inv.dueDate) < new Date();
}

async function pay(inv: Invoice) {
  paying.value = inv.id;
  try {
    await api(`/invoices/${inv.id}/status`, { method: 'PATCH', body: { status: 'PAID' } });
    if (props.roomId) await load(props.roomId);
    emit('changed');
  } finally {
    paying.value = null;
  }
}
</script>

<template>
  <UiSheet
    v-model:open="open"
    :title="room ? `Помещение ${room.roomNumber}` : 'Помещение'"
    :subtitle="room?.floor?.building?.name ?? 'Детали и финансовая история'"
  >
    <div v-if="loading" class="flex h-40 items-center justify-center text-muted">
      <UiSpinner class="h-7 w-7 text-brand" />
    </div>

    <div v-else-if="room" class="space-y-6">
      <div class="flex items-center justify-between">
        <UiStatusBadge :status="room.currentStatus" />
        <span class="font-mono text-sm text-muted">
          {{ room.area }} м²<template v-if="canViewFinance || room.currentStatus === 'FREE'">
            · {{ money(room.basePrice) }}</template
          >
        </span>
      </div>

      <!-- Client listing: free → area + price + lead CTA; occupied → just unavailable -->
      <section v-if="!canViewFinance">
        <template v-if="room.currentStatus === 'FREE'">
          <div class="rounded-2xl bg-emerald-500/8 p-5 ring-1 ring-emerald-500/25">
            <p class="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <DoorOpen class="h-4 w-4" /> Свободно — можно арендовать
            </p>
            <dl class="mt-4 grid grid-cols-2 gap-3">
              <div class="rounded-xl bg-surface/70 p-3 ring-1 ring-border/60">
                <dt class="text-xs text-muted">Площадь</dt>
                <dd class="mt-0.5 text-lg font-bold text-fg">{{ room.area }} м²</dd>
              </div>
              <div class="rounded-xl bg-surface/70 p-3 ring-1 ring-border/60">
                <dt class="text-xs text-muted">Ставка</dt>
                <dd class="mt-0.5 text-lg font-bold text-fg">{{ money(room.basePrice) }}</dd>
              </div>
            </dl>
          </div>
          <a
            :href="leadHref"
            class="mt-3 flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-[1.02]"
          >
            <Mail class="h-4 w-4" /> Оставить заявку на аренду
          </a>
        </template>
        <div v-else class="rounded-2xl bg-surface/50 p-5 text-center ring-1 ring-border/60">
          <Lock class="mx-auto h-6 w-6 text-muted" />
          <p class="mt-3 text-sm font-medium text-fg">Помещение занято</p>
          <p class="mt-1 text-xs text-muted">Свободные площади отмечены зелёным на карте.</p>
        </div>
        <NuxtLink
          to="/login"
          class="mt-4 block text-center text-xs font-medium text-muted underline-offset-2 hover:text-fg hover:underline"
        >
          Сотрудник? Войти
        </NuxtLink>
      </section>

      <!-- Tenant -->
      <section v-if="canViewFinance" class="rounded-2xl bg-surface/50 p-4 ring-1 ring-border/60">
        <h3 class="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
          <Building2 class="h-3.5 w-3.5" /> Арендатор
        </h3>
        <template v-if="tenant">
          <p class="font-semibold text-fg">{{ tenant.companyName }}</p>
          <p class="mt-0.5 text-sm text-muted">{{ tenant.email }} · {{ tenant.phone }}</p>
        </template>
        <p v-else class="text-sm text-muted">Помещение свободно</p>
      </section>

      <!-- Summary cards -->
      <div v-if="canViewFinance" class="grid grid-cols-2 gap-3">
        <div class="rounded-2xl bg-surface/50 p-4 ring-1 ring-border/60">
          <p class="flex items-center gap-1.5 text-xs text-muted"><Wallet class="h-3.5 w-3.5" /> Баланс</p>
          <p :class="cn('mt-1 text-lg font-bold', balance > 0 ? 'text-red-600' : 'text-emerald-600')">
            {{ money(balance) }}
          </p>
        </div>
        <div class="rounded-2xl bg-surface/50 p-4 ring-1 ring-border/60">
          <p class="flex items-center gap-1.5 text-xs text-muted">
            <CalendarRange class="h-3.5 w-3.5" /> Договор
          </p>
          <p class="mt-1 text-sm font-semibold text-fg">
            <template v-if="activeContract">
              до {{ formatDate(activeContract.endDate) }}
            </template>
            <template v-else>—</template>
          </p>
        </div>
      </div>

      <!-- Invoice history -->
      <section v-if="canViewFinance">
        <h3 class="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
          <Receipt class="h-3.5 w-3.5" /> Финансовая история
        </h3>
        <ul v-if="invoices.length" class="space-y-2">
          <li
            v-for="inv in invoices"
            :key="inv.id"
            class="animate-slide-up flex items-center justify-between gap-3 rounded-xl bg-surface/40 p-3 ring-1 ring-border/50"
          >
            <div class="min-w-0">
              <p class="font-semibold text-fg">{{ money(inv.amount) }}</p>
              <p class="text-xs" :class="isOverdue(inv) ? 'text-red-600' : 'text-muted'">
                до {{ formatDate(inv.dueDate) }}{{ isOverdue(inv) ? ' · просрочен' : '' }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <span
                :class="
                  cn('rounded-full px-2.5 py-1 text-xs font-semibold ring-1', INVOICE_META[inv.status].cls)
                "
              >
                {{ INVOICE_META[inv.status].label }}
              </span>
              <UiButton
                v-if="inv.status === 'UNPAID'"
                size="sm"
                variant="secondary"
                :disabled="paying === inv.id"
                @click="pay(inv)"
              >
                <UiSpinner v-if="paying === inv.id" class="h-3.5 w-3.5" />
                <CheckCircle2 v-else class="h-3.5 w-3.5" />
                Оплатить
              </UiButton>
            </div>
          </li>
        </ul>
        <p v-else class="rounded-xl bg-surface/40 p-4 text-center text-sm text-muted">Счетов нет</p>
      </section>
    </div>
  </UiSheet>
</template>
