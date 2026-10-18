<template>
  <Teleport to="body">
    <div class="fixed inset-x-0 bottom-0 z-[200] flex flex-col items-center gap-2 p-4 pointer-events-none">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-2"
      >
        <div
          v-if="visible"
          role="status"
          aria-live="polite"
          class="pointer-events-auto flex items-center gap-x-2 rounded-lg px-4 py-2.5 text-sm shadow-lg border"
          :class="variantClass"
        >
          <component :is="iconFor" class="shrink-0 size-4" aria-hidden="true" />
          <span><slot>{{ message }}</slot></span>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { CheckCircle2, CircleAlert, TriangleAlert } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    /** v-model: tampil/tidak. */
    modelValue?: boolean
    /** Dipakai bersama v-model="snack.show". */
    show?: boolean
    message?: string
    color?: 'success' | 'error' | 'warning' | 'info'
    timeout?: number
  }>(),
  { modelValue: undefined, show: undefined, message: '', color: 'success', timeout: 3000 },
)

const emit = defineEmits<{ 'update:modelValue': [v: boolean]; 'update:show': [v: boolean] }>()

const visible = computed(() => props.modelValue ?? props.show ?? false)

const variantClass = computed(() => {
  switch (props.color) {
    case 'error':
      return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/60 dark:border-red-900 dark:text-red-200'
    case 'warning':
      return 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/60 dark:border-amber-900 dark:text-amber-200'
    case 'info':
      return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/60 dark:border-blue-900 dark:text-blue-200'
    default:
      return 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-900 dark:text-emerald-200'
  }
})

const iconFor = computed(() => {
  if (props.color === 'error') return CircleAlert
  if (props.color === 'warning') return TriangleAlert
  if (props.color === 'info') return CircleAlert
  return CheckCircle2
})

function setVisible(v: boolean) {
  emit('update:modelValue', v)
  emit('update:show', v)
}

let timer: ReturnType<typeof setTimeout> | null = null

watch(
  visible,
  (v) => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (v && props.timeout > 0) {
      timer = setTimeout(() => setVisible(false), props.timeout)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})
</script>
