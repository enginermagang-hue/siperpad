<template>
  <v-card flat border class="mb-2">
    <v-card-text class="py-3">
      <!-- Header: judul + aksi/chip status -->
      <div class="d-flex align-start justify-space-between ga-2 mb-2">
        <div class="min-w-0">
          <div v-if="title" class="font-weight-medium text-truncate">{{ title }}</div>
          <div v-if="subtitle" class="text-caption text-medium-emphasis text-truncate">{{ subtitle }}</div>
        </div>
        <div class="flex-shrink-0 d-flex align-center ga-1">
          <slot name="badge" />
        </div>
      </div>

      <!-- Baris label-nilai -->
      <div v-if="fields.length" class="d-flex flex-column ga-1">
        <div v-for="(f, i) in fields" :key="i" class="d-flex justify-space-between ga-3 text-body-2">
          <span class="text-medium-emphasis flex-shrink-0">{{ f.label }}</span>
          <span class="text-right" :class="f.class" :style="f.style">{{ f.value }}</span>
        </div>
      </div>

      <!-- Chip/extra -->
      <slot />

      <!-- Aksi -->
      <div v-if="$slots.actions" class="d-flex justify-end ga-1 mt-2">
        <slot name="actions" />
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
export type ViewField = { label: string; value: string | number; class?: string; style?: string }

defineProps<{
  title?: string
  subtitle?: string
  fields?: ViewField[]
}>()
</script>
