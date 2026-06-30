<script setup lang="ts">
import { UploadCloud } from 'lucide-vue-next';
import type { Floor } from '~/types';

const props = defineProps<{ floorId: string }>();
const emit = defineEmits<{ uploaded: [floor: Floor] }>();

const api = useApi();
const dragging = ref(false);
const uploading = ref(false);
const error = ref<string | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);

async function upload(file: File) {
  error.value = null;
  if (!file.type.startsWith('image/')) {
    error.value = 'Только изображения (PNG, JPEG, WebP, SVG)';
    return;
  }
  uploading.value = true;
  try {
    const fd = new FormData();
    fd.append('file', file);
    const floor = await api<Floor>(`/floors/${props.floorId}/plan`, {
      method: 'POST',
      body: fd,
    });
    emit('uploaded', floor);
  } catch (e) {
    const err = e as { data?: { message?: string } };
    error.value = err.data?.message ?? 'Не удалось загрузить план';
  } finally {
    uploading.value = false;
  }
}

function onDrop(e: DragEvent) {
  dragging.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) void upload(file);
}
function onPick(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) void upload(file);
}
</script>

<template>
  <div>
    <div
      class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition-colors"
      :class="dragging ? 'border-brand bg-brand/5' : 'border-border hover:border-brand/50'"
      @click="inputRef?.click()"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <UiSpinner v-if="uploading" class="h-6 w-6 text-brand" />
      <UploadCloud v-else class="h-6 w-6 text-brand" />
      <p class="text-sm font-medium text-fg">
        {{ uploading ? 'Загрузка…' : 'Перетащи план сюда или нажми' }}
      </p>
      <p class="text-xs text-muted">PNG, JPEG, WebP, SVG · до 8 МБ</p>
      <input
        ref="inputRef"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        class="hidden"
        @change="onPick"
      />
    </div>
    <p v-if="error" class="mt-2 rounded-lg bg-red-500/12 px-3 py-2 text-sm text-red-700">
      {{ error }}
    </p>
  </div>
</template>
