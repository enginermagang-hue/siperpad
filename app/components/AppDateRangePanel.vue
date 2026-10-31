<template>
  <!--
    Panel filter rentang tanggal — 2 kolom:
    [daftar preset vertikal]  [input Dari/Sampai (2 baris) + Reset/Set]

    Edit input di-stage secara lokal (draft) dan dikomit lewat tombol "Set";
    klik preset langsung mengomit. Komit memicu `change` (hanya bila nilai
    benar-benar berubah) dan `commit` (selalu — untuk menutup dropdown).
  -->
  <div class="flex flex-col gap-2">
    <div v-if="draftActive" class="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-xs text-muted-foreground-1">
      <span class="font-medium text-foreground">{{ rangeLabelText }}</span>
      <template v-if="durationDays !== null">
        <span aria-hidden="true">·</span>
        <span>{{ durationDays }} hari</span>
      </template>
      <span class="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
        {{ activePresetLabel ?? 'Kustom' }}
      </span>
    </div>

    <div class="flex gap-2">
      <!-- Kiri: preset vertikal -->
      <div class="flex w-[120px] shrink-0 flex-col gap-1">
        <button
          v-for="p in presetList"
          :key="p.key"
          type="button"
          :aria-pressed="activeKey === p.key"
          :disabled="disabled"
          class="rounded-md border px-2 py-1.5 text-start text-xs focus:outline-hidden disabled:opacity-50 disabled:pointer-events-none"
          :class="activeKey === p.key
            ? 'border-primary/50 bg-primary/10 text-primary'
            : 'border-layer-line bg-layer text-layer-foreground hover:bg-layer-hover'"
          @click="applyPreset(p.key)"
        >
          {{ p.label }}
        </button>
      </div>

      <!-- Kanan: 2 baris input + aksi -->
      <div class="flex min-w-0 flex-1 flex-col gap-2">
        <label class="block text-xs text-muted-foreground-1">
          Dari
          <input
            :value="draft.from"
            type="date"
            :min="minDate || undefined"
            :max="resolvedMax || undefined"
            :disabled="disabled"
            aria-label="Tanggal mulai"
            class="mt-0.5 w-full rounded-lg border border-layer-line bg-layer px-2 py-1.5 text-sm text-layer-foreground
                   focus:border-primary-focus focus:ring-primary-focus disabled:opacity-50 disabled:pointer-events-none"
            @change="onFromChange"
          />
        </label>
        <label class="block text-xs text-muted-foreground-1">
          Sampai
          <input
            :value="draft.to"
            type="date"
            :min="minDate || undefined"
            :max="resolvedMax || undefined"
            :disabled="disabled"
            aria-label="Tanggal selesai"
            class="mt-0.5 w-full rounded-lg border border-layer-line bg-layer px-2 py-1.5 text-sm text-layer-foreground
                   focus:border-primary-focus focus:ring-primary-focus disabled:opacity-50 disabled:pointer-events-none"
            @change="onToChange"
          />
        </label>
        <div class="flex gap-1.5">
          <button
            v-if="draftActive"
            type="button"
            :disabled="disabled"
            class="flex-1 rounded-lg border border-layer-line bg-layer px-3 py-1.5 text-sm text-layer-foreground
                   hover:bg-layer-hover focus:outline-hidden disabled:opacity-50 disabled:pointer-events-none"
            @click="clearDraft"
          >
            Reset
          </button>
          <button
            type="button"
            :disabled="disabled"
            class="flex-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground
                   hover:bg-primary-hover focus:outline-hidden disabled:opacity-50 disabled:pointer-events-none"
            @click="commit"
          >
            Set
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  DATE_PRESETS,
  clampFrom,
  clampTo,
  detectPreset,
  presetRange,
  rangeDays,
  rangeLabel,
  toDateStr,
  type DatePresetKey,
  type DateRangeValue,
} from '~/composables/useDateRange'

const props = withDefaults(
  defineProps<{
    /** Subset preset yang ditampilkan; default semua. */
    presets?: DatePresetKey[]
    minDate?: string
    /** `undefined` = hari ini (client); `''` = tanpa batas atas. */
    maxDate?: string
    disabled?: boolean
  }>(),
  {
    presets: () => DATE_PRESETS.map((p) => p.key),
    minDate: '',
    disabled: false,
  },
)

const model = defineModel<DateRangeValue>({ default: () => ({ from: '', to: '' }) })
const emit = defineEmits<{
  change: [value: DateRangeValue]
  commit: []
}>()

// Draft lokal: edit input di-stage dulu, baru dikomit lewat Set/preset.
const draft = ref<DateRangeValue>({ from: model.value.from, to: model.value.to })
watch(model, (v) => { draft.value = { from: v.from, to: v.to } })

// `max` bawaan = hari ini; diisi setelah mount agar render SSR deterministik.
const today = ref('')
onMounted(() => { today.value = toDateStr(new Date()) })
const resolvedMax = computed(() => (props.maxDate !== undefined ? props.maxDate : today.value) || undefined)

const draftActive = computed(() => Boolean(draft.value.from || draft.value.to))
const rangeLabelText = computed(() => rangeLabel(draft.value))
const durationDays = computed(() => rangeDays(draft.value))
const activeKey = computed(() => detectPreset(draft.value))
const activePresetLabel = computed(() => DATE_PRESETS.find((p) => p.key === activeKey.value)?.label ?? null)
const presetList = computed(() => DATE_PRESETS.filter((p) => props.presets.includes(p.key)))

/** Komit draft ke model. `change` hanya bila nilai berubah (hindari reload sia-sia). */
function commit() {
  const next = { from: draft.value.from, to: draft.value.to }
  const changed = next.from !== model.value.from || next.to !== model.value.to
  model.value = next
  emit('commit')
  if (changed) emit('change', next)
}

function onFromChange(e: Event) {
  const v = (e.target as HTMLInputElement).value
  draft.value = clampFrom(v, draft.value.to)
}
function onToChange(e: Event) {
  const v = (e.target as HTMLInputElement).value
  draft.value = clampTo(draft.value.from, v)
}
function applyPreset(key: DatePresetKey) {
  draft.value = presetRange(key)
  commit()
}
function clearDraft() {
  draft.value = { from: '', to: '' }
}
</script>
