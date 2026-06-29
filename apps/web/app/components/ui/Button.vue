<script setup lang="ts">
import { cva } from 'class-variance-authority';
import { cn } from '~/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const button = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand/60 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]',
  {
    variants: {
      variant: {
        primary:
          'bg-brand text-white shadow-[0_8px_24px_-8px_var(--color-brand)] hover:bg-brand-soft hover:shadow-glow',
        secondary: 'bg-surface-2 text-fg ring-1 ring-border hover:bg-surface hover:ring-brand/40',
        ghost: 'text-muted hover:text-fg hover:bg-surface-2',
        danger: 'bg-red-500/90 text-white hover:bg-red-500 shadow-[0_8px_24px_-8px_#ef4444]',
        outline: 'ring-1 ring-border text-fg hover:bg-surface-2 hover:ring-brand/40',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

const props = defineProps<{ variant?: Variant; size?: Size; class?: string }>();
</script>

<template>
  <button :class="cn(button({ variant, size }), props.class)">
    <slot />
  </button>
</template>
