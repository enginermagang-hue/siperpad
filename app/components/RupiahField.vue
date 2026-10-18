<template>
  <div class="relative">
    <span
      class="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-2.5 text-xs text-muted-foreground-1"
    >Rp</span>
    <input
      :value="display"
      type="text"
      inputmode="numeric"
      class="w-full rounded-lg border border-layer-line bg-layer py-2 ps-9 pe-3 text-sm text-layer-foreground
             focus:border-primary-focus focus:ring-primary-focus
             disabled:opacity-50 disabled:pointer-events-none"
      :class="bgColor"
      :disabled="disabled"
      @input="onInput"
      @blur="emit('blur', $event)"
      @keyup.enter="emit('enter', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRupiahInput } from '~/composables/useCurrency'

const props = withDefaults(
  defineProps<{
    modelValue: number
    disabled?: boolean
    /** Kelas latar tambahan (dulu bg-color Vuetify). */
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
