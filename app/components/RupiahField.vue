<template>
  <v-text-field
    :model-value="display"
    density="compact"
    variant="outlined"
    hide-details
    inputmode="numeric"
    prefix="Rp"
    :disabled="disabled"
    :bg-color="bgColor"
    @input="onInput"
    @blur="emit('blur', $event)"
    @keyup.enter="emit('enter', $event)"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRupiahInput } from '~/composables/useCurrency'

const props = withDefaults(
  defineProps<{
    modelValue: number
    disabled?: boolean
    bgColor?: string
  }>(),
  { disabled: false, bgColor: undefined },
)

const emit = defineEmits<{
  'update:modelValue': [value: number]
  blur: [event: FocusEvent]
  enter: [event: KeyboardEvent]
}>()

const amount = computed({
  get: () => Number(props.modelValue) || 0,
  set: (v: number) => emit('update:modelValue', v),
})

const amountProxy = computed({
  get: () => amount.value,
  set: (v: number) => { amount.value = v },
})

// Mask rupiah live + posisi caret terjaga (via event target native input).
const { display, onInput } = useRupiahInput(amountProxy)
</script>
