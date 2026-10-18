<template>
  <v-tabs v-if="canVerif" :model-value="active" class="mb-4" color="primary">
    <v-tab to="/verifikasi" value="realisasi">Realisasi Diajukan</v-tab>
    <v-tab to="/verifikasi/batch" value="batch">Batch Laporan</v-tab>
    <v-tab v-if="isAdmin" to="/verifikasi/periode" value="periode">Kunci Periode</v-tab>
    <v-tab v-if="isAdmin" to="/verifikasi/catatan" value="catatan">Catatan Temuan</v-tab>
    <v-tab to="/verifikasi/audit" value="audit">Audit Trail</v-tab>
  </v-tabs>
</template>

<script setup lang="ts">
const route = useRoute()
const { isAdmin, canVerif } = useVerifikasiMaster()

const active = computed(() => {
  const p = route.path
  if (p.startsWith('/verifikasi/batch')) return 'batch'
  if (p.startsWith('/verifikasi/periode')) return 'periode'
  if (p.startsWith('/verifikasi/catatan')) return 'catatan'
  if (p.startsWith('/verifikasi/audit')) return 'audit'
  return 'realisasi'
})
</script>
