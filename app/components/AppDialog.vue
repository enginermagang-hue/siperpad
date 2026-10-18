<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        ref="backdropEl"
        class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-neutral-900/60 p-4"
        @click.self="onBackdrop"
      >
        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0 translate-y-2 scale-95"
          enter-to-class="opacity-100 translate-y-0 scale-100"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0 scale-95"
          appear
        >
          <div
            v-if="modelValue"
            ref="panelEl"
            role="dialog"
            aria-modal="true"
            :aria-label="title"
            class="w-full bg-overlay border border-overlay-line rounded-xl shadow-xl flex flex-col max-h-[90vh]"
            :style="{ maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth }"
            @keydown.esc.stop.prevent="onEsc"
          >
            <!-- Header -->
            <div class="flex items-center gap-2 px-4 py-3 border-b border-overlay-divider">
              <component :is="icon" v-if="icon" class="shrink-0 size-5 text-primary" aria-hidden="true" />
              <h2 class="text-base font-semibold text-foreground truncate">{{ title }}</h2>
              <div class="ms-auto flex items-center gap-1">
                <slot name="header-actions" />
                <button
                  v-if="!hideClose"
                  type="button"
                  class="p-1.5 rounded-lg text-muted-foreground-1 hover:bg-overlay-header focus:outline-hidden focus:bg-overlay-header"
                  aria-label="Tutup"
                  @click="close"
                >
                  <X class="shrink-0 size-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <!-- Body -->
            <div class="px-4 py-4 overflow-y-auto flex-1">
              <slot />
            </div>

            <!-- Footer -->
            <div
              v-if="$slots.actions"
              class="flex items-center justify-end gap-2 px-4 py-3 border-t border-overlay-divider"
            >
              <slot name="actions" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { X } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    maxWidth?: number | string
    persistent?: boolean
    icon?: Component
    hideClose?: boolean
  }>(),
  { maxWidth: 520, persistent: true, icon: undefined, hideClose: false },
)

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const panelEl = ref<HTMLDivElement | null>(null)

function close() {
  emit('update:modelValue', false)
}

function onBackdrop() {
  if (!props.persistent) close()
}

function onEsc() {
  if (!props.persistent) close()
}

// Kunci scroll body + fokus awal + kembalikan fokus saat ditutup.
let previouslyFocused: HTMLElement | null = null

watch(
  () => props.modelValue,
  async (open) => {
    if (!import.meta.client) return
    if (open) {
      previouslyFocused = document.activeElement as HTMLElement | null
      document.body.style.overflow = 'hidden'
      await nextTick()
      // Fokus ke panel agar tombol Escape langsung berfungsi.
      panelEl.value?.focus()
    } else {
      document.body.style.overflow = ''
      previouslyFocused?.focus?.()
      previouslyFocused = null
    }
  },
)

onBeforeUnmount(() => {
  if (import.meta.client) document.body.style.overflow = ''
})
</script>
