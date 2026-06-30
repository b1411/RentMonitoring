<script setup lang="ts">
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui';
import { X } from 'lucide-vue-next';

const open = defineModel<boolean>('open', { default: false });
defineProps<{ title?: string; subtitle?: string }>();
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay
        class="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm data-[state=open]:animate-fade-in"
      />
      <DialogContent
        class="glass fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l shadow-card outline-none data-[state=open]:animate-slide-in-right"
      >
        <header class="flex items-start justify-between gap-4 border-b border-border/60 px-6 py-5">
          <div class="min-w-0">
            <DialogTitle class="truncate text-lg font-bold text-fg">{{ title }}</DialogTitle>
            <DialogDescription v-if="subtitle" class="mt-0.5 truncate text-sm text-muted">
              {{ subtitle }}
            </DialogDescription>
          </div>
          <DialogClose
            class="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg"
            aria-label="Закрыть"
          >
            <X class="h-5 w-5" />
          </DialogClose>
        </header>
        <div class="flex-1 overflow-y-auto px-6 py-5">
          <slot />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
