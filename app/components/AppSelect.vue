<template>
  <div ref="wrapEl" class="relative">
    <!--
      SSR: <select> native tampil bergaya Preline (progressive enhancement).
      Client: HSSelect menyembunyikan select ini dan membangun toggle + dropdown
      di sekitarnya. Vue tetap pemilik daftar <option>; saat opsi berubah,
      instance di-destroy lalu dibuat ulang (lihat watch optsKey).
    -->
    <select
      ref="selectEl"
      :data-hs-select="hsConfig"
      :value="normalized"
      :disabled="disabled"
      class="w-full appearance-none bg-layer border border-layer-line rounded-lg
             py-2 ps-3 pe-9 text-sm text-layer-foreground
             disabled:opacity-50 disabled:pointer-events-none"
      @change="onNativeChange"
    >
      <option v-if="clearable" value="">{{ placeholder ?? 'Semua' }}</option>
      <option v-for="o in options" :key="String(o.value)" :value="String(o.value)">
        {{ o.label }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
type Item = { label: string; value: number | string }
type RawItem = Item | number | string

const props = withDefaults(
  defineProps<{
    modelValue: number | string | null
    /** Array of {label,value} atau array primitif. */
    items: RawItem[]
    placeholder?: string
    disabled?: boolean
    /** Izinkan kosong (menggantikan `clearable` Vuetify). */
    clearable?: boolean
    /** Paksa tampil kotak pencarian. Default: otomatis bila opsi > 10. */
    search?: boolean
    /** Di dalam modal: dropdown diposisikan fixed agar tidak ter-clip. */
    inModal?: boolean
  }>(),
  { clearable: false, disabled: false, inModal: false, search: undefined },
)

const emit = defineEmits<{
  'update:modelValue': [value: number | string | null]
}>()

const wrapEl = ref<HTMLDivElement | null>(null)
const selectEl = ref<HTMLSelectElement | null>(null)
const hsSelect = shallowRef<{ destroy: () => void; setValue: (v: string | string[]) => void } | null>(null)

/** Normalisasi item ke bentuk {label,value}. */
const options = computed<Item[]>(() =>
  props.items.map((i) => (typeof i === 'object' && i !== null ? (i as Item) : { label: String(i), value: i })),
)

/** Pencarian hanya berguna untuk daftar panjang. */
const showSearch = computed(() => props.search ?? options.value.length > 10)

/** Kunci identitas daftar opsi — berubah => HSSelect harus dibangun ulang. */
const optsKey = computed(() => options.value.map((o) => String(o.value)).join('|'))

const normalized = computed(() => (props.modelValue == null ? '' : String(props.modelValue)))

const CHEVRON =
  '<div class="absolute top-1/2 inset-e-3 -translate-y-1/2 pointer-events-none">' +
  '<svg class="shrink-0 size-3.5 text-muted-foreground-1" xmlns="http://www.w3.org/2000/svg" width="24" height="24" ' +
  'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg></div>'

const hsConfig = computed(() =>
  JSON.stringify({
    placeholder: props.placeholder ?? 'Semua',
    // Scope 'parent' menempelkan dropdown di dalam wrapper (position:absolute
    // terhadap wrapper .hs-select) sehingga tidak menambah tinggi layout.
    dropdownScope: 'parent',
    toggleTag: '<button type="button" aria-expanded="false"></button>',
    toggleClasses:
      'hs-select-disabled:pointer-events-none hs-select-disabled:opacity-50 relative py-2 ps-3 pe-9 flex text-nowrap w-full cursor-pointer bg-layer border border-layer-line text-layer-foreground rounded-lg text-start text-sm hover:bg-layer-hover focus:outline-hidden focus:bg-layer-focus',
    dropdownClasses:
      'absolute top-full mt-2 z-[100] w-full max-h-72 pb-1 px-1 space-y-0.5 bg-select border border-select-line rounded-lg shadow-xl overflow-y-auto overflow-x-hidden siperpad-select-scroll',
    optionClasses:
      'hs-selected:bg-select-item-active py-2 px-3 w-full text-sm text-select-item-foreground cursor-pointer hover:bg-select-item-hover rounded-lg focus:outline-hidden focus:bg-select-item-focus',
    optionAllowEmptyOption: props.clearable,
    hasSearch: showSearch.value,
    searchWrapperClasses: 'bg-select p-2 -mx-1 sticky top-0 z-10',
    // Pakai token aplikasi (bukan default Preline abu-abu/biru) agar seragam
    // dengan input lain di light & dark mode.
    searchClasses:
      'block w-full text-sm bg-transparent border border-layer-line rounded-lg text-foreground placeholder:text-muted-foreground-1 focus:border-primary-focus focus:ring-primary-focus py-2 px-3',
    searchPlaceholder: 'Cari…',
    ...(props.inModal ? { dropdownVerticalFixedPlacement: 'bottom' } : {}),
    extraMarkup: CHEVRON,
  }),
)

/** Native select selalu string — petakan balik ke tipe asli dari items. */
function onNativeChange(e: Event) {
  const raw = (e.target as HTMLSelectElement).value
  if (raw === '') {
    emit('update:modelValue', null)
    return
  }
  const hit = options.value.find((o) => String(o.value) === raw)
  emit('update:modelValue', hit ? hit.value : raw)
}

async function init() {
  if (!import.meta.client || !selectEl.value) return
  const { HSSelect } = await import('preline/non-auto')
  try {
    hsSelect.value?.destroy()
    // destroy() menghapus markup generated; select asli tetap ada.
    if (!selectEl.value) return
    hsSelect.value = new HSSelect(selectEl.value) as unknown as {
      destroy: () => void
      setValue: (v: string | string[]) => void
    }
  } catch {
    // Jangan biarkan kegagalan satu select memutus render halaman.
    hsSelect.value = null
  }
}

function teardown() {
  hsSelect.value?.destroy()
  hsSelect.value = null
}

onMounted(async () => {
  await nextTick()
  await init()
})

onBeforeUnmount(teardown)

// Opsi berubah (mis. filter kawasan mengubah daftar jenis): bangun ulang.
watch(optsKey, async () => {
  teardown()
  await nextTick()
  await init()
})

// Nilai diubah dari luar (openEdit / reset form): dorong ke instance Preline.
watch(normalized, (val) => {
  if (!import.meta.client) return
  // Guard: jangan setValue bila sudah sama (mencegah loop change -> emit -> watch).
  if (selectEl.value && selectEl.value.value === val) return
  // setValue melempar bila dipanggil saat instance belum selesai init
  // (mis. model diisi tepat setelah mount). Abaikan: select asli sudah
  // memegang nilai terbaru lewat binding :value, dan init berikutnya
  // membaca nilai itu.
  try {
    hsSelect.value?.setValue(val)
  } catch {
    /* instance belum siap — nilai akan terbaca saat init */
  }
})
</script>
