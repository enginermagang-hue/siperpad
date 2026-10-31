<template>
  <!--
    Filter rentang tanggal sebagai dropdown (trigger + panel).
    Untuk menyematkan panel tanpa trigger (mis. di dalam menu filter
    mobile), pakai <AppDateRangePanel> secara langsung.
  -->
  <AppMenu
    ref="menuRef"
    placement="bottom-start"
    auto-close="inside"
    root-class="[--auto-close:inside]"
    :aria-label="label"
    menu-class="min-w-[360px]"
    toggle-class="gap-1.5 px-2.5 py-1.5 border border-layer-line rounded-lg text-sm"
    :disabled="disabled"
  >
    <template #toggle>
      <CalendarDays class="shrink-0 size-4" aria-hidden="true" />
      <span>{{ label }}</span>
      <span v-if="isActive" class="text-xs text-muted-foreground-1">({{ rangeLabelText }})</span>
      <span v-if="isActive" class="inline-block size-1.5 rounded-full bg-primary" aria-hidden="true" />
      <ChevronDown class="shrink-0 size-3.5 text-muted-foreground-1" aria-hidden="true" />
    </template>

    <template #content>
      <AppDateRangePanel
        v-model="model"
        :presets="presets"
        :min-date="minDate"
        :max-date="maxDate"
        :disabled="disabled"
        @change="(v) => emit('change', v)"
        @commit="menuRef?.hide()"
      />
    </template>
  </AppMenu>
</template>

<script setup lang="ts">
import { CalendarDays, ChevronDown } from 'lucide-vue-next'
import {
  DATE_PRESETS,
  rangeLabel,
  type DatePresetKey,
  type DateRangeValue,
} from '~/composables/useDateRange'

const props = withDefaults(
  defineProps<{
    /** Teks pada toggle. */
    label?: string
    /** Subset preset; default semua. */
    presets?: DatePresetKey[]
    minDate?: string
    /** `undefined` = hari ini (client); `''` = tanpa batas atas. */
    maxDate?: string
    disabled?: boolean
  }>(),
  {
    label: 'Rentang Tanggal',
    presets: () => DATE_PRESETS.map((p) => p.key),
    minDate: '',
    disabled: false,
  },
)

const model = defineModel<DateRangeValue>({ default: () => ({ from: '', to: '' }) })
const emit = defineEmits<{ change: [value: DateRangeValue] }>()

// Ref ke AppMenu untuk menutup dropdown setelah rentang dikomit (Set/preset).
const menuRef = shallowRef<{ hide: () => void } | null>(null)

const isActive = computed(() => Boolean(model.value.from || model.value.to))
const rangeLabelText = computed(() => rangeLabel(model.value))
</script>
