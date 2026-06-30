<script setup lang="ts">
import { LogIn, Lock, Mail, AlertCircle } from 'lucide-vue-next';

const { login, isAuthenticated } = useAuth();
const route = useRoute();

const email = ref('');
const password = ref('');
const error = ref<string | null>(null);
const loading = ref(false);

const redirect = computed(() => (route.query.redirect as string) || '/');

// Already signed in → skip the form.
watchEffect(() => {
  if (isAuthenticated.value) void navigateTo(redirect.value);
});

async function onSubmit() {
  error.value = null;
  loading.value = true;
  try {
    await login(email.value, password.value);
    await navigateTo(redirect.value);
  } catch {
    error.value = 'Неверный email или пароль';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="animate-slide-up grid min-h-[70vh] place-items-center">
    <div class="glass w-full max-w-sm rounded-2xl p-7 shadow-card">
      <div class="mb-6 text-center">
        <span class="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand text-white shadow-glow">
          <LogIn class="h-6 w-6" />
        </span>
        <h1 class="mt-4 text-2xl font-extrabold tracking-tight text-gradient">Вход</h1>
        <p class="mt-1 text-sm text-muted">Доступ к управлению и финансам</p>
      </div>

      <form class="space-y-4" @submit.prevent="onSubmit">
        <label class="relative block">
          <Mail class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            v-model="email"
            type="email"
            autocomplete="email"
            required
            placeholder="admin@rent.local"
            class="h-11 w-full rounded-xl border-0 bg-surface/60 pl-10 pr-4 text-sm text-fg ring-1 ring-border/60 outline-none focus:ring-2 focus:ring-brand/60"
          />
        </label>
        <label class="relative block">
          <Lock class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
            placeholder="••••••••"
            class="h-11 w-full rounded-xl border-0 bg-surface/60 pl-10 pr-4 text-sm text-fg ring-1 ring-border/60 outline-none focus:ring-2 focus:ring-brand/60"
          />
        </label>

        <Transition name="tt">
          <p
            v-if="error"
            class="flex items-center gap-2 rounded-xl bg-red-500/12 px-3 py-2 text-sm text-red-700 ring-1 ring-red-500/25"
          >
            <AlertCircle class="h-4 w-4 shrink-0" /> {{ error }}
          </p>
        </Transition>

        <UiButton type="submit" class="w-full" :disabled="loading">
          <UiSpinner v-if="loading" class="h-4 w-4" />
          <LogIn v-else class="h-4 w-4" />
          Войти
        </UiButton>
      </form>
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
