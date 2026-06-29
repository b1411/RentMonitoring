<script setup lang="ts">
import { cn } from '~/lib/utils';
defineProps<{ class?: string }>();
</script>

<template>
  <svg
    :class="cn('animate-spin', $props.class)"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle class="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
    <path
      class="opacity-90"
      d="M22 12a10 10 0 0 1-10 10"
      stroke="currentColor"
      stroke-width="3"
      stroke-linecap="round"
    />
  </svg>
</template>
