<template>
  <div class="rounded-lg border border-card-line bg-card mb-2">
    <div class="p-3">
      <!-- Header: judul + aksi/chip status -->
      <div class="flex items-start justify-between gap-2 mb-2">
        <div class="min-w-0">
          <div v-if="title" class="font-medium text-foreground truncate">{{ title }}</div>
          <div v-if="subtitle" class="text-xs text-muted-foreground-1 truncate">{{ subtitle }}</div>
        </div>
        <div class="shrink-0 flex items-center gap-1">
          <slot name="badge" />
        </div>
      </div>

      <!-- Baris label-nilai -->
      <div v-if="fields && fields.length" class="flex flex-col gap-1">
        <div v-for="(f, i) in fields" :key="i" class="flex justify-between gap-3 text-sm">
          <span class="text-muted-foreground-1 shrink-0">{{ f.label }}</span>
          <span class="text-right" :class="f.class" :style="f.style">{{ f.value }}</span>
        </div>
      </div>

      <!-- Chip/extra -->
      <slot />

      <!-- Aksi -->
      <div v-if="$slots.actions" class="flex justify-end gap-1 mt-2">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
export type ViewField = { label: string; value: string | number; class?: string; style?: string }

defineProps<{
  title?: string
  subtitle?: string
  fields?: ViewField[]
}>()
</script>
