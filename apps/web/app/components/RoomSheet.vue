<script setup lang="ts">
import { Building2, CalendarRange, Wallet, Receipt, CheckCircle2 } from 'lucide-vue-next';
import { cn, money, formatDate } from '~/lib/utils';
import type { Room, Invoice, InvoiceStatus } from '~/types';

const open = defineModel<boolean>('open', { default: false });
const props = defineProps<{ roomId: string | null }>();
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
    room.value = null;
    if (id) void load(id);
  },
);

const activeContract = computed(() => room.value?.contracts?.find((c) => c.isActive) ?? null);
const tenant = computed(() => activeContract.value?.tenant ?? null);

const invoices = computed<Invoice[]>(() =>
  (room.value?.contracts ?? []).flatMap((c) => c.invoices ?? []),
);

const balance = computed(() =>
  invoices.value.filter((i) => i.status === 'UNPAID').reduce((sum, i) => sum + Number(i.amount), 0),
);

const INVOICE_META: Record<InvoiceStatus, { label: string; cls: string }> = {
  UNPAID: { label: 'Не оплачен', cls: 'bg-red-500/15 text-red-300 ring-red-500/30' },
  PAID: { label: 'Оплачен', cls: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30' },
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
        <span class="font-mono text-sm text-muted">{{ room.area }} м² · {{ money(room.basePrice) }}</span>
      </div>

      <!-- Tenant -->
      <section class="rounded-2xl bg-surface/50 p-4 ring-1 ring-border/60">
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
      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-2xl bg-surface/50 p-4 ring-1 ring-border/60">
          <p class="flex items-center gap-1.5 text-xs text-muted"><Wallet class="h-3.5 w-3.5" /> Баланс</p>
          <p :class="cn('mt-1 text-lg font-bold', balance > 0 ? 'text-red-300' : 'text-emerald-300')">
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
      <section>
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
              <p class="text-xs" :class="isOverdue(inv) ? 'text-red-300' : 'text-muted'">
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
