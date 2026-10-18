<template>
  <div>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <ChartColumn class="shrink-0 size-9 text-primary" aria-hidden="true" />
        <h1 class="text-2xl font-medium text-foreground">Laporan Rekap PAD</h1>
      </div>
      <div v-if="isAdminOrKepala" class="flex gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-layer-line px-3 py-2 text-sm font-medium
                 text-primary hover:bg-layer-hover focus:outline-hidden focus:bg-layer-focus
                 disabled:opacity-50 disabled:pointer-events-none"
          :disabled="exporting === 'csv'"
          @click="doExport('csv')"
        >
          <LoaderCircle v-if="exporting === 'csv'" class="shrink-0 size-4 animate-spin" aria-hidden="true" />
          <FileSpreadsheet v-else class="shrink-0 size-4" aria-hidden="true" />
          CSV
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 px-3 py-2 text-sm font-medium
                 text-emerald-700 hover:bg-emerald-50 focus:outline-hidden
                 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/50
                 disabled:opacity-50 disabled:pointer-events-none"
          :disabled="exporting === 'xlsx'"
          @click="doExport('xlsx')"
        >
          <LoaderCircle v-if="exporting === 'xlsx'" class="shrink-0 size-4 animate-spin" aria-hidden="true" />
          <FileSpreadsheet v-else class="shrink-0 size-4" aria-hidden="true" />
          XLSX
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium
                 text-primary-foreground hover:bg-primary-hover focus:outline-hidden focus:bg-primary-focus
                 disabled:opacity-50 disabled:pointer-events-none"
          :disabled="exporting === 'pdf'"
          @click="doExport('pdf')"
        >
          <LoaderCircle v-if="exporting === 'pdf'" class="shrink-0 size-4 animate-spin" aria-hidden="true" />
          <FileText v-else class="shrink-0 size-4" aria-hidden="true" />
          PDF
        </button>
      </div>
    </div>

    <!-- Tab -->
    <div class="mb-4 border-b border-line-2">
      <nav class="-mb-px flex gap-x-1" aria-label="Tab laporan">
        <button
          v-for="t in tabs"
          :key="t.value"
          type="button"
          class="whitespace-nowrap border-b-2 px-3 py-2 text-sm focus:outline-hidden focus:bg-layer-focus"
          :class="tab === t.value
            ? 'border-primary text-primary font-medium'
            : 'border-transparent text-muted-foreground-1 hover:text-foreground hover:border-line-4'"
          :aria-current="tab === t.value ? 'page' : undefined"
          @click="tab = t.value"
        >
          {{ t.label }}
        </button>
      </nav>
    </div>

    <!-- Tab Rekap -->
    <div v-show="tab === 'rekap'">
      <div class="mb-4 rounded-lg border border-card-line bg-card p-4">
        <div class="flex flex-wrap gap-3">
          <div class="w-full max-w-[240px]">
            <AppSelect v-model="filterKawasan" :items="kawasanOpts" placeholder="Semua kawasan" clearable @update:model-value="load" />
          </div>
          <div class="w-full max-w-[120px]">
            <AppSelect v-model="tahun" :items="tahunOpts" :search="false" @update:model-value="load" />
          </div>
          <div class="w-full max-w-[160px]">
            <AppSelect v-model="bulan" :items="bulanOpts" @update:model-value="load" />
          </div>
          <div class="w-full max-w-[150px]">
            <AppSelect v-model="periode" :items="periodeOpts" :search="false" />
          </div>
          <div class="relative w-full max-w-[300px]">
            <Search
              class="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground-1"
              aria-hidden="true"
            />
            <input
              v-model="q"
              type="text"
              placeholder="Cari kode / nama..."
              class="w-full rounded-lg border border-layer-line bg-layer py-2 ps-8 pe-3 text-sm text-layer-foreground
                     focus:border-primary-focus focus:ring-primary-focus"
            />
          </div>
        </div>
      </div>

      <div v-if="totals" class="mb-4 grid grid-cols-12 gap-4">
        <div class="col-span-12 sm:col-span-6 md:col-span-3">
          <div class="rounded-lg border border-card-line bg-card p-4 text-center">
            <div class="text-xs text-muted-foreground-1">Total Target</div>
            <div class="text-lg font-bold text-foreground">{{ fmt(totals.totalTarget) }}</div>
          </div>
        </div>
        <div class="col-span-12 sm:col-span-6 md:col-span-3">
          <div class="rounded-lg border border-card-line bg-card p-4 text-center">
            <div class="text-xs text-muted-foreground-1">Total Realisasi</div>
            <div class="text-lg font-bold text-primary">{{ fmt(totals.totalRealisasi) }}</div>
          </div>
        </div>
        <div class="col-span-12 sm:col-span-6 md:col-span-3">
          <div class="rounded-lg border border-card-line bg-card p-4 text-center">
            <div class="text-xs text-muted-foreground-1">Capaian</div>
            <div class="text-lg font-bold" :class="capaianText(totals.capaian)">{{ totals.capaian }}%</div>
          </div>
        </div>
        <div class="col-span-12 sm:col-span-6 md:col-span-3">
          <div class="rounded-lg border border-card-line bg-card p-4 text-center">
            <div class="text-xs text-muted-foreground-1">Selisih</div>
            <div
              class="text-lg font-bold"
              :class="totals.selisih >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'"
            >
              {{ fmt(totals.selisih) }}
            </div>
          </div>
        </div>
      </div>

      <div class="rounded-lg border border-card-line bg-card">
        <div class="flex justify-end px-4 pt-3">
          <ViewModeToggle v-model="modeRekap" />
        </div>

        <div v-if="modeRekap === 'table'" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-table-line text-sm">
            <thead>
              <tr class="text-start text-xs uppercase tracking-wide text-muted-foreground-1">
                <th class="px-3 py-2.5 text-start font-medium">Kode</th>
                <th class="px-3 py-2.5 text-start font-medium">Jenis Retribusi</th>
                <th class="px-3 py-2.5 text-start font-medium">Kawasan</th>
                <th class="px-3 py-2.5 text-end font-medium">Target</th>
                <th class="px-3 py-2.5 text-end font-medium">Realisasi</th>
                <th class="px-3 py-2.5 text-end font-medium">Capaian</th>
                <th class="px-3 py-2.5 text-end font-medium">Selisih</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-table-line">
              <tr v-if="loading">
                <td colspan="7" class="py-6 text-center text-muted-foreground-1">Memuat...</td>
              </tr>
              <tr v-else-if="!filtered.length">
                <td colspan="7" class="py-6 text-center text-muted-foreground-1">Belum ada data</td>
              </tr>
              <tr v-for="r in paginated" v-else :key="r.id" class="hover:bg-layer-hover">
                <td class="px-3 py-2.5 font-medium text-foreground">{{ r.kode || '-' }}</td>
                <td class="px-3 py-2.5 text-foreground">{{ r.nama }}</td>
                <td class="px-3 py-2.5">
                  <span class="inline-flex items-center rounded-full bg-surface px-2 py-0.5 text-xs text-surface-foreground">
                    {{ r.kawasan_kode }} — {{ r.kawasan_nama }}
                  </span>
                </td>
                <td class="px-3 py-2.5 text-end text-foreground">{{ fmt(r.target) }}</td>
                <td class="px-3 py-2.5 text-end text-foreground">{{ fmt(r.realisasi) }}</td>
                <td class="px-3 py-2.5 text-end">
                  <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" :class="capaianChip(r.capaian)">
                    {{ r.capaian }}%
                  </span>
                </td>
                <td class="px-3 py-2.5 text-end" :class="r.selisih >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">
                  {{ fmt(r.selisih) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else-if="modeRekap === 'list'" class="p-3">
          <div v-if="loading" class="py-6 text-center text-muted-foreground-1">Memuat...</div>
          <div v-else-if="!filtered.length" class="py-6 text-center text-muted-foreground-1">Belum ada data</div>
          <RecordCard
            v-for="r in paginated"
            v-else
            :key="r.id"
            :title="`${r.kode || '-'} — ${r.nama}`"
            :subtitle="`${r.kawasan_kode} — ${r.kawasan_nama}`"
            :fields="[
              { label: 'Target', value: fmt(r.target), class: 'text-end' },
              { label: 'Realisasi', value: fmt(r.realisasi), class: 'text-end' },
              { label: 'Capaian', value: r.capaian + '%', class: `text-end font-medium ${capaianText(r.capaian)}` },
              { label: 'Selisih', value: fmt(r.selisih), class: `text-end ${r.selisih >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}` },
            ]"
          />
        </div>

        <div v-else class="p-2">
          <div v-if="loading" class="py-6 text-center text-muted-foreground-1">Memuat...</div>
          <div v-else-if="!filtered.length" class="py-6 text-center text-muted-foreground-1">Belum ada data</div>
          <ul v-else class="divide-y divide-table-line">
            <li v-for="r in paginated" :key="r.id" class="flex items-center gap-2 py-2">
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm text-foreground">{{ r.kode || '-' }} — {{ r.nama }}</span>
                <span class="block truncate text-xs text-muted-foreground-1">{{ r.kawasan_kode }}</span>
              </span>
              <span class="shrink-0 text-sm font-medium text-foreground">{{ fmt(r.realisasi) }}</span>
              <span class="shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-medium" :class="capaianChip(r.capaian)">
                {{ r.capaian }}%
              </span>
            </li>
          </ul>
        </div>

        <hr v-if="total" class="border-card-divider" />
        <div v-if="total" class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div class="flex items-center gap-2 text-sm text-muted-foreground-1">
            <span>Menampilkan {{ from }}–{{ to }} dari {{ total }} data</span>
            <div class="w-[90px]"><AppSelect v-model="perPage" :items="[5, 10, 25, 50]" :search="false" /></div>
            <span>per halaman</span>
          </div>
          <AppPagination v-model="currentPage" :length="pageCount" :total-visible="5" />
        </div>
      </div>
    </div>

    <!-- Tab Perbandingan -->
    <div v-if="tab === 'banding'">
      <div class="mb-4 rounded-lg border border-card-line bg-card p-4">
        <div class="flex flex-wrap items-center gap-3">
          <div class="w-full max-w-[220px]">
            <AppSelect v-model="filterKawasan" :items="kawasanOpts" placeholder="Semua kawasan" clearable @update:model-value="loadBanding" />
          </div>
          <div class="w-full max-w-[110px]">
            <AppSelect v-model="bandTahun" :items="tahunOpts" :search="false" @update:model-value="loadBanding" />
          </div>
          <div class="w-full max-w-[150px]">
            <AppSelect v-model="bandBulanA" :items="bulanOpts" placeholder="Periode A" @update:model-value="loadBanding" />
          </div>
          <ArrowRight class="shrink-0 size-4 text-muted-foreground-1" aria-hidden="true" />
          <div class="w-full max-w-[150px]">
            <AppSelect v-model="bandBulanB" :items="bulanOpts" placeholder="Periode B" @update:model-value="loadBanding" />
          </div>
        </div>
        <div class="mt-2 text-xs text-muted-foreground-1">
          Contoh referensi: bandingkan bulan penuh (mis. Agustus) dengan periode berjalan (mis. 1–21 September) memakai rentang bebas.
        </div>
      </div>

      <div v-if="banding" class="mb-4 grid grid-cols-12 gap-4">
        <div class="col-span-12 sm:col-span-4">
          <div class="rounded-lg border border-card-line bg-card p-4 text-center">
            <div class="text-xs text-muted-foreground-1">{{ banding.a.label }}</div>
            <div class="text-lg font-bold text-foreground">{{ fmt(banding.total.a) }}</div>
          </div>
        </div>
        <div class="col-span-12 sm:col-span-4">
          <div class="rounded-lg border border-card-line bg-card p-4 text-center">
            <div class="text-xs text-muted-foreground-1">{{ banding.b.label }}</div>
            <div class="text-lg font-bold text-primary">{{ fmt(banding.total.b) }}</div>
          </div>
        </div>
        <div class="col-span-12 sm:col-span-4">
          <div class="rounded-lg border border-card-line bg-card p-4 text-center">
            <div class="text-xs text-muted-foreground-1">Selisih (B − A)</div>
            <div
              class="text-lg font-bold"
              :class="banding.total.selisih >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'"
            >
              {{ fmt(banding.total.selisih) }} ({{ banding.total.persen }}%)
            </div>
          </div>
        </div>
      </div>

      <!-- Grafik perbandingan per pos penerimaan utama -->
      <div v-if="banding" class="mb-4 rounded-lg border border-card-line bg-card">
        <div class="flex flex-wrap items-center gap-2 border-b border-card-divider px-4 py-3">
          <ChartColumnBig class="shrink-0 size-4 text-muted-foreground-1" aria-hidden="true" />
          <span class="font-medium text-foreground">Grafik Perbandingan Penerimaan per Pos</span>
          <div class="ms-auto inline-flex items-center rounded-lg border border-layer-line bg-layer p-0.5" role="group" aria-label="Mode grafik">
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-md p-1.5 text-layer-foreground hover:bg-layer-hover focus:outline-hidden"
              :class="modeBandingChart === 'chart' ? 'bg-primary/10 text-primary' : ''"
              title="Grafik batang"
              aria-label="Grafik batang"
              @click="modeBandingChart = 'chart'"
            >
              <ChartColumnBig class="shrink-0 size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-md p-1.5 text-layer-foreground hover:bg-layer-hover focus:outline-hidden"
              :class="modeBandingChart === 'bars' ? 'bg-primary/10 text-primary' : ''"
              title="Bar horizontal"
              aria-label="Bar horizontal"
              @click="modeBandingChart = 'bars'"
            >
              <Rows3 class="shrink-0 size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div class="p-4">
          <div v-if="bandLoading" class="py-8 text-center text-muted-foreground-1">Memuat grafik...</div>
          <SiperpadChart
            v-else-if="tab === 'banding' && modeBandingChart === 'chart' && bandingChartCategories.length"
            :series="bandingChartSeries"
            :categories="bandingChartCategories"
            :height="340"
            type="bar"
          />
          <div v-else-if="modeBandingChart === 'chart'" class="py-8 text-center text-muted-foreground-1">Belum ada data untuk dibandingkan</div>
          <div v-else class="space-y-2">
            <div v-if="!bandingChartCategories.length" class="py-6 text-center text-muted-foreground-1">Belum ada data</div>
            <div v-for="(label, i) in bandingChartCategories" :key="label" class="flex items-center gap-3">
              <span class="w-40 shrink-0 truncate text-xs text-foreground" :title="label">{{ label }}</span>
              <div class="flex-1 space-y-1">
                <div class="h-2.5 rounded-full bg-primary/70" :style="{ width: barWidth(bandingChartSeries[0]?.data[i] ?? 0) }" />
                <div class="h-2.5 rounded-full bg-emerald-500/70" :style="{ width: barWidth(bandingChartSeries[1]?.data[i] ?? 0) }" />
              </div>
              <span class="w-44 shrink-0 text-end text-xs text-muted-foreground-1">
                {{ fmt(bandingChartSeries[0]?.data[i] ?? 0) }} &rarr; {{ fmt(bandingChartSeries[1]?.data[i] ?? 0) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="rounded-lg border border-card-line bg-card">
        <div class="flex justify-end px-4 pt-3">
          <ViewModeToggle v-model="modeBanding" />
        </div>

        <div v-if="modeBanding === 'table'" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-table-line text-sm">
            <thead>
              <tr class="text-start text-xs uppercase tracking-wide text-muted-foreground-1">
                <th class="px-3 py-2.5 text-start font-medium">Kode</th>
                <th class="px-3 py-2.5 text-start font-medium">Jenis Retribusi</th>
                <th class="px-3 py-2.5 text-start font-medium">Kawasan</th>
                <th class="px-3 py-2.5 text-end font-medium">{{ banding?.a.label || 'A' }}</th>
                <th class="px-3 py-2.5 text-end font-medium">{{ banding?.b.label || 'B' }}</th>
                <th class="px-3 py-2.5 text-end font-medium">Selisih</th>
                <th class="px-3 py-2.5 text-end font-medium">%</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-table-line">
              <tr v-if="bandLoading">
                <td colspan="7" class="py-6 text-center text-muted-foreground-1">Memuat...</td>
              </tr>
              <tr v-else-if="!bandingFiltered.length">
                <td colspan="7" class="py-6 text-center text-muted-foreground-1">Belum ada data</td>
              </tr>
              <tr v-for="r in bandingFiltered" v-else :key="r.jenis_id" class="hover:bg-layer-hover">
                <td class="px-3 py-2.5 font-medium text-foreground">{{ r.kode || '-' }}</td>
                <td class="px-3 py-2.5 text-foreground">
                  <span :style="{ paddingInlineStart: `${(r.level - 1) * 14}px` }" :class="r.has_child ? 'font-medium' : ''">
                    {{ r.nama }}
                  </span>
                </td>
                <td class="px-3 py-2.5">
                  <span class="inline-flex items-center rounded-full bg-surface px-2 py-0.5 text-xs text-surface-foreground">
                    {{ r.kawasan_kode }}
                  </span>
                </td>
                <td class="px-3 py-2.5 text-end text-foreground">{{ fmt(r.a) }}</td>
                <td class="px-3 py-2.5 text-end text-foreground">{{ fmt(r.b) }}</td>
                <td class="px-3 py-2.5 text-end" :class="r.selisih >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">
                  {{ fmt(r.selisih) }}
                </td>
                <td class="px-3 py-2.5 text-end text-foreground">{{ r.persen }}%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else-if="modeBanding === 'list'" class="p-3">
          <div v-if="bandLoading" class="py-6 text-center text-muted-foreground-1">Memuat...</div>
          <div v-else-if="!bandingFiltered.length" class="py-6 text-center text-muted-foreground-1">Belum ada data</div>
          <RecordCard
            v-for="r in bandingFiltered"
            v-else
            :key="r.jenis_id"
            :title="`${r.kode || '-'} — ${r.nama}`"
            :subtitle="r.kawasan_kode"
            :fields="[
              { label: banding?.a.label || 'A', value: fmt(r.a), class: 'text-end' },
              { label: banding?.b.label || 'B', value: fmt(r.b), class: 'text-end' },
              { label: 'Selisih', value: fmt(r.selisih), class: `text-end ${r.selisih >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}` },
              { label: '%', value: r.persen + '%' },
            ]"
          />
        </div>

        <div v-else class="p-2">
          <div v-if="bandLoading" class="py-6 text-center text-muted-foreground-1">Memuat...</div>
          <div v-else-if="!bandingFiltered.length" class="py-6 text-center text-muted-foreground-1">Belum ada data</div>
          <ul v-else class="divide-y divide-table-line">
            <li v-for="r in bandingFiltered" :key="r.jenis_id" class="flex items-center gap-2 py-2">
              <span class="min-w-0 flex-1" :style="{ paddingInlineStart: `${(r.level - 1) * 14}px` }">
                <span class="block truncate text-sm text-foreground">{{ r.kode || '-' }} — {{ r.nama }}</span>
                <span class="block truncate text-xs text-muted-foreground-1">{{ r.kawasan_kode }}</span>
              </span>
              <span
                class="shrink-0 text-sm font-medium"
                :class="r.selisih >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'"
              >
                {{ fmt(r.selisih) }}
              </span>
              <span class="shrink-0 inline-flex items-center rounded-full bg-surface px-1.5 py-0.5 text-[11px] text-surface-foreground">
                {{ r.persen }}%
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <AppToast v-model="snack.show" :message="snack.msg" :color="snack.color" :timeout="3000" />
  </div>
</template>

<script setup lang="ts">
import {
  ArrowRight,
  ChartColumn,
  ChartColumnBig,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
  Rows3,
  Search,
} from 'lucide-vue-next'

definePageMeta({ layout: 'default', middleware: 'auth' })

const { mode: modeRekap } = useViewMode('laporan-rekap')
const { mode: modeBanding } = useViewMode('laporan-banding')

type RekapRow = { id: number; kode: string; nama: string; level: number; urutan: number; kawasan_id: number; kawasan_kode: string; kawasan_nama: string; target: number; realisasi: number; capaian: number; selisih: number }

const session = useUserSession()
const role = computed(() => String(session.user.value?.role || ''))
const isAdminOrKepala = computed(() => ['admin', 'kepala'].includes(role.value))

const kawasan = ref<{ id: number; kode: string; nama: string }[]>([])
const kawasanOpts = computed(() => kawasan.value.map((k) => ({ label: `${k.kode} — ${k.nama}`, value: k.id })))
const filterKawasan = ref<number | null>(null)
const tahun = ref(new Date().getFullYear())
const tahunOpts = [2024, 2025, 2026, 2027]
const bulan = ref(new Date().getMonth() + 1)
const bulanOpts = [
  { label: 'Januari', value: 1 }, { label: 'Februari', value: 2 }, { label: 'Maret', value: 3 }, { label: 'April', value: 4 },
  { label: 'Mei', value: 5 }, { label: 'Juni', value: 6 }, { label: 'Juli', value: 7 }, { label: 'Agustus', value: 8 },
  { label: 'September', value: 9 }, { label: 'Oktober', value: 10 }, { label: 'November', value: 11 }, { label: 'Desember', value: 12 },
]
const q = ref('')
const loading = ref(false)
const perJenis = ref<RekapRow[]>([])
const totals = ref<{ totalTarget: number; totalRealisasi: number; capaian: number; selisih: number } | null>(null)
const exporting = ref('')
// Mode periode laporan: bulan (rekap bulan terpilih) atau tahun (12 bulan).
const periode = ref<'bulan' | 'tahun'>('bulan')
const periodeOpts = [
  { label: 'Bulanan', value: 'bulan' },
  { label: 'Tahunan', value: 'tahun' },
]

const tabs = [
  { value: 'rekap', label: 'Rekap' },
  { value: 'banding', label: 'Perbandingan Periode' },
]
// Tab perbandingan
const tab = ref('rekap')
type BandRow = { jenis_id: number; kode: string; nama: string; level: number; urutan: number; kawasan_id: number; kawasan_kode: string; kawasan_nama: string; has_child: boolean; a: number; b: number; selisih: number; persen: number }
const bandTahun = ref(new Date().getFullYear())
const bandBulanA = ref(new Date().getMonth() === 0 ? 12 : new Date().getMonth())
const bandBulanB = ref(new Date().getMonth() + 1)
const banding = ref<{ a: { label: string }; b: { label: string }; total: { a: number; b: number; selisih: number; persen: number }; perJenis: BandRow[] } | null>(null)
const bandLoading = ref(false)
// Tampilkan hierarki penuh (indentasi) — bukan hanya level 1 — agar rincian
// pos (mis. Food Court, Parkir) terlihat saat membandingkan periode.
const bandingFiltered = computed(() => {
  const s = q.value.trim().toLowerCase()
  const list = banding.value?.perJenis || []
  if (!s) return list
  return list.filter((r) => (r.kode || '').toLowerCase().includes(s) || r.nama.toLowerCase().includes(s) || r.kawasan_nama.toLowerCase().includes(s))
})

// Grafik perbandingan: pos level 1 (induk) agar ringkas dan tidak dobel-hitung.
const modeBandingChart = ref<'chart' | 'bars'>('chart')
const bandingChartRows = computed(() => (banding.value?.perJenis || []).filter((r) => r.level === 1 && (r.a > 0 || r.b > 0)))
const bandingChartCategories = computed(() => bandingChartRows.value.map((r) => r.nama))
const bandingChartSeries = computed(() => [
  { name: banding.value?.a.label || 'A', data: bandingChartRows.value.map((r) => r.a) },
  { name: banding.value?.b.label || 'B', data: bandingChartRows.value.map((r) => r.b) },
])
const bandingChartMax = computed(() => Math.max(1, ...bandingChartRows.value.flatMap((r) => [r.a, r.b])))
function barWidth(v: number) { return `${Math.max(2, Math.round((v / bandingChartMax.value) * 100))}%` }

const filtered = computed(() => {
  const s = q.value.trim().toLowerCase()
  if (!s) return perJenis.value
  return perJenis.value.filter((r) => (r.kode || '').toLowerCase().includes(s) || r.nama.toLowerCase().includes(s) || r.kawasan_nama.toLowerCase().includes(s))
})
const currentPage = ref(1)
const perPage = ref(10)
const total = computed(() => filtered.value.length)
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))
const from = computed(() => total.value === 0 ? 0 : (currentPage.value - 1) * perPage.value + 1)
const to = computed(() => Math.min(currentPage.value * perPage.value, total.value))
const paginated = computed(() => {
  const start = (currentPage.value - 1) * perPage.value
  return filtered.value.slice(start, start + perPage.value)
})
watch([q, filterKawasan, tahun, bulan], () => { currentPage.value = 1 })
watch(perPage, () => { currentPage.value = 1 })
watch(pageCount, (pc) => { if (currentPage.value > pc) currentPage.value = pc })

const snack = reactive({ show: false, msg: '', color: 'success' as 'success' | 'error' })
function toast(msg: string, color: typeof snack.color = 'success') { snack.msg = msg; snack.color = color; snack.show = true }
const { formatRupiah: fmt } = useCurrency()

function capaianChip(v: number) {
  if (v >= 100) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
  if (v >= 75) return 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
  return 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
}
function capaianText(v: number) {
  if (v >= 100) return 'text-emerald-600 dark:text-emerald-400'
  if (v >= 75) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

async function loadKawasan() {
  try {
    const r = await $fetch<{ data: { id: number; kode: string; nama: string }[] }>('/api/kawasan')
    kawasan.value = r.data
  } catch {}
}
async function load() {
  loading.value = true
  try {
    const q2: Record<string, string> = { tahun: String(tahun.value) }
    if (filterKawasan.value) q2.kawasan_id = String(filterKawasan.value)
    const r = await $fetch<{ perJenis: RekapRow[]; totals: typeof totals.value }>('/api/laporan/rekap', { query: q2 })
    perJenis.value = r.perJenis
    totals.value = r.totals
  } catch (e: unknown) {
    toast((e as { data?: { message?: string } })?.data?.message || 'Gagal memuat', 'error')
  } finally { loading.value = false }
}

async function loadBanding() {
  bandLoading.value = true
  try {
    const query: Record<string, string> = { tahun: String(bandTahun.value), bulan_a: String(bandBulanA.value), bulan_b: String(bandBulanB.value) }
    if (filterKawasan.value) query.kawasan_id = String(filterKawasan.value)
    banding.value = await $fetch('/api/laporan/bandingkan', { query })
  } catch (e: unknown) {
    toast((e as { data?: { message?: string } })?.data?.message || 'Gagal memuat perbandingan', 'error')
  } finally { bandLoading.value = false }
}

async function doExport(format: string) {
  exporting.value = format
  try {
    const params = new URLSearchParams({ format, tahun: String(tahun.value), bulan: String(bulan.value), periode: periode.value })
    if (filterKawasan.value) params.set('kawasan_id', String(filterKawasan.value))
    const res = await fetch(`/api/laporan/export?${params.toString()}`, { credentials: 'include' })
    if (!res.ok) {
      const j = await res.json().catch(() => ({ message: res.statusText }))
      throw new Error((j as { message?: string }).message || res.statusText)
    }
    const blob = await res.blob()
    const cd = res.headers.get('content-disposition') || ''
    const m = cd.match(/filename="?([^"]+)"?/)
    const filename = m?.[1] || `rekap-${tahun.value}.${format}`
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast(`Unduhan ${format.toUpperCase()} dimulai`)
  } catch (e: unknown) {
    toast((e as Error).message || String(e), 'error')
  } finally { exporting.value = '' }
}

onMounted(async () => { await loadKawasan(); await load(); await loadBanding() })
watch(tab, (v) => { if (v === 'banding' && !banding.value) loadBanding() })
</script>
