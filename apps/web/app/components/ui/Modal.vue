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
        class="glass fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-6 shadow-card outline-none data-[state=open]:animate-pop"
      >
        <div class="mb-5 flex items-start justify-between gap-4">
          <div>
            <DialogTitle class="text-lg font-bold text-fg">{{ title }}</DialogTitle>
            <DialogDescription v-if="subtitle" class="mt-1 text-sm text-muted">
              {{ subtitle }}
            </DialogDescription>
          </div>
          <DialogClose
            class="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg"
            aria-label="Закрыть"
          >
            <X class="h-4 w-4" />
          </DialogClose>
        </div>
        <slot />
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
