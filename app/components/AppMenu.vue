<template>
  <!--
    Wrapper dropdown Preline (HSDropdown).
    - Instance dibuat per komponen: aman di dalam v-for karena setiap baris
      memiliki root sendiri dan di-destroy saat baris unmount (pagination/filter).
    - --strategy:fixed (default Preline) memakai position:fixed sehingga menu
      lolos dari ancestor overflow:hidden/auto tanpa memindahkan node DOM
      (memindahkan node akan bertabrakan dengan patching Vue).
  -->
  <div ref="rootEl" class="hs-dropdown relative inline-flex" :class="rootClass" :style="cssVars">
    <button
      type="button"
      class="hs-dropdown-toggle inline-flex items-center justify-center gap-x-1 rounded-lg text-layer-foreground hover:bg-layer-hover focus:outline-hidden focus:bg-layer-focus disabled:opacity-50 disabled:pointer-events-none"
      :class="toggleClass"
      :disabled="disabled"
      :aria-label="ariaLabel"
    >
      <slot name="toggle">
        <EllipsisVertical class="shrink-0 size-4" aria-hidden="true" />
      </slot>
    </button>

    <div
      class="hs-dropdown-menu transition-[opacity,margin] duration hs-dropdown-open:opacity-100 opacity-0 hidden z-[100] mt-2 bg-dropdown border border-dropdown-line rounded-lg shadow-md"
      :class="menuClass"
      role="menu"
      aria-orientation="vertical"
    >
      <div class="p-1 space-y-0.5">
        <!-- Mode slot (panel notifikasi / user menu). -->
        <slot v-if="$slots.content" name="content" />

        <!-- Mode items (aksi per baris). -->
        <template v-else>
          <button
            v-for="(item, i) in items"
            :key="i"
            type="button"
            role="menuitem"
            class="hs-dropdown-close w-full flex items-center gap-x-2.5 py-2 px-3 rounded-lg text-sm text-start
                   hover:bg-dropdown-item-hover focus:outline-hidden focus:bg-dropdown-item-focus
                   disabled:opacity-50 disabled:pointer-events-none"
            :class="item.variant === 'danger' ? 'text-red-600 dark:text-red-400' : 'text-dropdown-item-foreground'"
            :disabled="item.disabled"
            @click="onItemClick(item)"
          >
            <component :is="item.icon" v-if="item.icon" class="shrink-0 size-4" aria-hidden="true" />
            <span>{{ item.label }}</span>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { EllipsisVertical } from 'lucide-vue-next'

export type MenuItem = {
  label: string
  icon?: Component
  onClick?: () => void | Promise<void>
  variant?: 'default' | 'danger'
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    items?: MenuItem[]
    disabled?: boolean
    ariaLabel?: string
    /** bottom-start (default) | bottom-end | top-start | top-end | right | left */
    placement?: string
    /** outside = tutup saat klik di luar tapi tidak saat klik isi (panel notif). */
    autoClose?: 'true' | 'outside' | 'inside' | 'false'
    toggleClass?: string
    menuClass?: string
    /**
     * Kelas tambahan pada root .hs-dropdown. Preline 5 membaca mode tutup
     * dari token kelas `[--auto-close:…]` saat menentukan klik-di-dalam,
     * sedangkan `--auto-close` inline style hanya dipakai untuk mode tutup
     * global. Untuk panel dengan kontrol interaktif (mis. filter berisi
     * AppSelect), set `root-class="[--auto-close:inside]"` agar dropdown
     * TIDAK tertutup saat berinteraksi dengan isinya.
     */
    rootClass?: string
  }>(),
  {
    items: () => [],
    disabled: false,
    ariaLabel: 'Menu',
    placement: 'bottom-end',
    autoClose: 'true',
    toggleClass: 'p-1.5',
    menuClass: 'min-w-44',
    rootClass: '',
  },
)

const emit = defineEmits<{ open: [] }>()

const rootEl = ref<HTMLDivElement | null>(null)
const hsDropdown = shallowRef<{ destroy: () => void; on: (e: string, cb: Function) => void; hide?: () => void } | null>(null)

const cssVars = computed(() => ({
  '--placement': props.placement,
  '--auto-close': props.autoClose,
  '--offset': '8',
}))

function onItemClick(item: MenuItem) {
  if (item.disabled) return
  item.onClick?.()
}

// Tutup dropdown dari dalam konten (mis. tombol "Set" pada panel filter
// rentang tanggal) — konten memakai [--auto-close:inside] sehingga klik
// di dalamnya tidak menutup menu secara otomatis.
function hide() {
  try {
    hsDropdown.value?.hide?.()
  } catch {
    /* instance belum siap */
  }
}

defineExpose({ hide })

onMounted(async () => {
  if (!import.meta.client || !rootEl.value) return
  await nextTick()
  const { HSDropdown } = await import('preline/non-auto')
  if (!rootEl.value) return
  // HSDropdown menandai root dengan properti internal _floatingUI.
  hsDropdown.value = new HSDropdown(
    rootEl.value as unknown as HTMLElement & { _floatingUI: unknown },
  ) as unknown as {
    destroy: () => void
    on: (e: string, cb: Function) => void
  }
  hsDropdown.value.on('open', () => emit('open'))
})

onBeforeUnmount(() => {
  hsDropdown.value?.destroy()
  hsDropdown.value = null
})
</script>
