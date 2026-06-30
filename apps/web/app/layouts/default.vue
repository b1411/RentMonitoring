<script setup lang="ts">
import { Map, PencilRuler, Building2, LogIn, LogOut } from 'lucide-vue-next';

const { user, isAdmin, isAuthenticated, logout } = useAuth();

// "Разметка" is admin-only; everyone sees the map.
const links = computed(() => [
  { to: '/', label: 'Карта', icon: Map },
  ...(isAdmin.value ? [{ to: '/admin', label: 'Разметка', icon: PencilRuler }] : []),
]);

async function onLogout() {
  logout();
  await navigateTo('/');
}
</script>

<template>
  <div class="relative min-h-screen overflow-x-hidden bg-bg">
    <!-- Ambient animated background -->
    <div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div class="bg-grid absolute inset-0" />
      <div class="blob blob--a animate-float absolute -left-40 -top-40 rounded-full bg-brand/15" />
      <div
        class="blob blob--b animate-float absolute -bottom-52 -right-32 rounded-full bg-sky-400/12"
        style="animation-delay: -3.5s"
      />
    </div>

    <header class="sticky top-0 z-40 border-b border-border/50">
      <div class="glass">
        <div class="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-5">
          <NuxtLink to="/" class="group flex items-center gap-3">
            <span
              class="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white shadow-glow transition-transform group-hover:scale-105"
            >
              <Building2 class="h-5 w-5" />
            </span>
            <div class="leading-tight">
              <p class="text-sm font-extrabold tracking-tight text-gradient">RentMonitoring</p>
              <p class="text-[11px] font-medium text-muted">PropTech floor map</p>
            </div>
          </NuxtLink>

          <div class="flex items-center gap-3">
            <nav class="flex items-center gap-1 rounded-2xl bg-bg-soft/60 p-1 ring-1 ring-border/60">
              <NuxtLink
                v-for="l in links"
                :key="l.to"
                :to="l.to"
                class="relative flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-muted transition-colors hover:text-fg sm:px-4"
                exact-active-class="!text-fg bg-surface shadow-card"
              >
                <component :is="l.icon" class="h-4 w-4 shrink-0" />
                <span class="hidden sm:inline">{{ l.label }}</span>
              </NuxtLink>
            </nav>

            <ClientOnly>
              <div v-if="isAuthenticated" class="flex items-center gap-2">
                <div class="hidden text-right leading-tight sm:block">
                  <p class="text-xs font-semibold text-fg">{{ user?.name }}</p>
                  <p class="text-[11px] font-medium text-muted">{{ user?.role }}</p>
                </div>
                <button
                  type="button"
                  class="flex items-center gap-2 rounded-xl bg-surface px-3 py-2 text-sm font-semibold text-muted ring-1 ring-border/60 transition-colors hover:text-fg"
                  @click="onLogout"
                >
                  <LogOut class="h-4 w-4 shrink-0" /> <span class="hidden sm:inline">Выйти</span>
                </button>
              </div>
              <NuxtLink
                v-else
                to="/login"
                class="flex items-center gap-2 rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-105"
              >
                <LogIn class="h-4 w-4" /> Войти
              </NuxtLink>
            </ClientOnly>
          </div>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-6 sm:px-5 sm:py-8">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.blob {
  width: 34rem;
  height: 34rem;
  filter: blur(120px);
}
.blob--b {
  width: 32rem;
  height: 32rem;
}
</style>
