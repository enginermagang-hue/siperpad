<template>
  <div v-if="canVerif" class="mb-4 border-b border-line-2">
    <nav class="-mb-px flex flex-wrap gap-x-1" aria-label="Navigasi verifikasi">
      <NuxtLink
        v-for="t in tabs"
        :key="t.value"
        :to="t.to"
        class="inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm
               focus:outline-hidden focus:bg-layer-focus"
        :class="
          active === t.value
            ? 'border-primary text-primary font-medium'
            : 'border-transparent text-muted-foreground-1 hover:text-foreground hover:border-line-4'
        "
        :aria-current="active === t.value ? 'page' : undefined"
      >
        {{ t.label }}
      </NuxtLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { isAdmin, canVerif } = useVerifikasiMaster()

const tabs = computed(() => {
  const list = [
    { to: '/verifikasi', value: 'realisasi', label: 'Realisasi Diajukan' },
  ]
  if (isAdmin.value) {
    list.push({ to: '/verifikasi/periode', value: 'periode', label: 'Kunci Periode' })
    list.push({ to: '/verifikasi/catatan', value: 'catatan', label: 'Catatan Temuan' })
  }
  list.push({ to: '/verifikasi/audit', value: 'audit', label: 'Audit Trail' })
  return list
})

const active = computed(() => {
  const p = route.path
  if (p.startsWith('/verifikasi/periode')) return 'periode'
  if (p.startsWith('/verifikasi/catatan')) return 'catatan'
  if (p.startsWith('/verifikasi/audit')) return 'audit'
  return 'realisasi'
})
</script>
