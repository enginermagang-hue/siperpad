<template>
  <v-btn-toggle
    :model-value="modelValue"
    density="compact"
    variant="outlined"
    divided
    mandatory
    class="view-mode-toggle"
    @update:model-value="emit('update:modelValue', $event as ViewMode)"
  >
    <v-btn value="table" icon="mdi-table" title="Tabel" aria-label="Tampilan tabel" />
    <v-btn value="list" icon="mdi-view-list" title="List" aria-label="Tampilan list kartu" />
    <v-btn value="compact" icon="mdi-view-sequential" title="Compact" aria-label="Tampilan compact" />
  </v-btn-toggle>
</template>

<script setup lang="ts">
import type { ViewMode } from '~/composables/useViewMode'

defineProps<{ modelValue: ViewMode }>()
const emit = defineEmits<{ 'update:modelValue': [value: ViewMode] }>()
</script>
