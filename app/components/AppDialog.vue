<template>
  <v-dialog
    :model-value="modelValue"
    :max-width="maxWidth"
    :persistent="persistent"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="d-flex flex-column" style="max-height: 90vh" elevation="2" :border="false">
      <v-toolbar color="surface" density="compact" flat>
        <v-icon v-if="icon" :icon="icon" color="primary" class="ml-3 mr-1" />
        <v-toolbar-title class="text-h6">{{ title }}</v-toolbar-title>
        <slot name="header-actions" />
        <v-btn v-if="!hideClose" icon="mdi-close" variant="text" @click="emit('update:modelValue', false)" />
      </v-toolbar>
      <v-divider />
      <v-card-text style="overflow-y: auto; flex: 1 1 auto">
        <slot />
      </v-card-text>
      <template v-if="$slots.actions">
        <v-divider />
        <v-card-actions>
          <slot name="actions" />
        </v-card-actions>
      </template>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    maxWidth?: number | string
    persistent?: boolean
    icon?: string
    hideClose?: boolean
  }>(),
  {
    maxWidth: 520,
    persistent: true,
    icon: undefined,
    hideClose: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>
