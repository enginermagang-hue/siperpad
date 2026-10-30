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
      <!-- Summary cards -->
      <div v-if="totals" class="mb-4 grid grid-cols-12 gap-4 items-stretch">
        <div class="col-span-12 sm:col-span-6 md:col-span-3 h-full">
          <div class="relative flex h-full flex-col rounded-lg border border-card-line bg-card p-4 border-l-4 border-l-blue-500">
            <Target class="absolute right-3 top-3 size-8 text-blue-500/80" aria-hidden="true" />
            <div class="text-xs font-medium text-muted-foreground-1 pe-10">Total Target Penerimaan</div>
            <div class="mt-1 text-lg font-bold text-foreground">{{ fmt(totals.totalTarget) }}</div>
            <div class="mt-1 text-[11px] leading-tight text-muted-foreground-1 pe-10">
              Target retribusi tahun {{ tahun }} (semua pos yang dipilih)
            </div>
          </div>
        </div>
        <div class="col-span-12 sm:col-span-6 md:col-span-3 h-full">
          <div class="relative flex h-full flex-col rounded-lg border border-card-line bg-card p-4 border-l-4 border-l-emerald-500">
            <Banknote class="absolute right-3 top-3 size-8 text-emerald-500/80" aria-hidden="true" />
            <div class="text-xs font-medium text-muted-foreground-1 pe-10">Total Realisasi</div>
            <div class="mt-1 text-lg font-bold text-primary">{{ fmt(totals.totalRealisasi) }}</div>
            <div class="mt-1 text-[11px] leading-tight text-muted-foreground-1 pe-10">
              Realisasi disetujui s/d {{ periode === 'tahun' ? 'Desember' : bulanLabel }} {{ tahun }}
            </div>
            <div v-if="mingguan.some((m) => m.nilai > 0)" class="mt-2">
              <SiperpadChart
                :series="[{ name: 'Realisasi', data: mingguan.map((m) => m.nilai) }]"
                :categories="mingguan.map((m) => m.label)"
                :height="48"
                type="area"
                :colors="['#10b981']"
                sparkline
              />
            </div>
          </div>
        </div>
        <div class="col-span-12 sm:col-span-6 md:col-span-3 h-full">
          <div class="relative flex h-full flex-col rounded-lg border border-card-line bg-card p-4 border-l-4 border-l-amber-500">
            <Gauge class="absolute right-3 top-3 size-8 text-amber-500/80" aria-hidden="true" />
            <div class="text-xs font-medium text-muted-foreground-1 pe-10">Capaian</div>
            <div class="mt-1 text-lg font-bold" :class="capaianText(totals.capaian)">{{ totals.capaian }}%</div>
            <div class="mt-1 text-[11px] leading-tight text-muted-foreground-1 pe-10">
              Persentase realisasi terhadap target
            </div>
            <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-layer">
              <div
                class="h-full rounded-full transition-all"
                :class="totals.capaian >= 100
                  ? 'bg-emerald-500'
                  : totals.capaian >= 75
                    ? 'bg-amber-500'
                    : 'bg-red-500'"
                :style="{ width: `${Math.min(100, Math.max(0, totals.capaian))}%` }"
              />
            </div>
          </div>
        </div>
        <div class="col-span-12 sm:col-span-6 md:col-span-3 h-full">
          <div class="relative flex h-full flex-col rounded-lg border border-card-line bg-card p-4 border-l-4"
               :class="totals.selisih >= 0 ? 'border-l-emerald-500' : 'border-l-red-500'">
            <Scale class="absolute right-3 top-3 size-8"
                   :class="totals.selisih >= 0 ? 'text-emerald-500/80' : 'text-red-500/80'"
                   aria-hidden="true" />
            <div class="text-xs font-medium text-muted-foreground-1 pe-10">Selisih</div>
            <div
              class="mt-1 text-lg font-bold"
              :class="totals.selisih >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'"
            >
              {{ fmt(totals.selisih) }}
            </div>
            <div class="mt-1 text-[11px] leading-tight text-muted-foreground-1 pe-10">
              Realisasi − Target (positif = surplus)
            </div>
          </div>
        </div>
      </div>

      <!-- Filter toolbar -->
      <div class="mb-4 rounded-lg border border-card-line bg-card">
        <div class="flex flex-wrap items-center gap-3 p-4">
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

          <!-- Desktop: filter inline -->
          <div v-if="isAdminOrKepala" class="hidden md:contents">
            <div class="w-full max-w-[240px]">
              <AppSelect v-model="filterKawasan" :items="kawasanOpts" placeholder="Semua kawasan" clearable @update:model-value="load" />
            </div>
          </div>

          <!-- Mobile: filter dalam dropdown -->
          <div v-if="isAdminOrKepala" class="md:hidden">
            <AppMenu placement="bottom-start" root-class="[--auto-close:inside]" menu-class="w-72" toggle-class="inline-flex items-center gap-1.5 rounded-lg border border-layer-line bg-layer px-3 py-2 text-sm text-layer-foreground hover:bg-layer-hover focus:outline-hidden" aria-label="Filter">
              <template #toggle>
                <Filter class="shrink-0 size-4" aria-hidden="true" />
                <span>Filter</span>
              </template>
              <template #content>
                <div class="space-y-2 p-2">
                  <AppSelect v-model="filterKawasan" :items="kawasanOpts" placeholder="Semua kawasan" clearable @update:model-value="load" />
                </div>
              </template>
            </AppMenu>
          </div>

          <div v-if="periode === 'tahun'" class="text-xs text-muted-foreground-1">
            Mode Tahunan: rekap kumulatif Januari–Desember {{ tahun }}.
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <input
              v-model="dateFrom"
              type="date"
              class="rounded-lg border border-layer-line bg-layer px-2 py-2 text-sm text-layer-foreground focus:border-primary-focus focus:ring-primary-focus"
              @change="load"
            />
            <span class="text-muted-foreground-1">s/d</span>
            <input
              v-model="dateTo"
              type="date"
              class="rounded-lg border border-layer-line bg-layer px-2 py-2 text-sm text-layer-foreground focus:border-primary-focus focus:ring-primary-focus"
              @change="load"
            />
            <div class="flex flex-wrap gap-1">
              <button type="button" class="rounded-md border border-layer-line bg-layer px-2 py-1 text-xs text-layer-foreground hover:bg-layer-hover" @click="setDatePreset('today')">Hari ini</button>
              <button type="button" class="rounded-md border border-layer-line bg-layer px-2 py-1 text-xs text-layer-foreground hover:bg-layer-hover" @click="setDatePreset('7d')">7 hari</button>
              <button type="button" class="rounded-md border border-layer-line bg-layer px-2 py-1 text-xs text-layer-foreground hover:bg-layer-hover" @click="setDatePreset('30d')">30 hari</button>
              <button type="button" class="rounded-md border border-layer-line bg-layer px-2 py-1 text-xs text-layer-foreground hover:bg-layer-hover" @click="setDatePreset('month')">Bulan ini</button>
              <button v-if="dateFrom || dateTo" type="button" class="rounded-md border border-layer-line bg-layer px-2 py-1 text-xs text-red-600 hover:bg-layer-hover dark:text-red-400" @click="clearDateRange">Reset</button>
            </div>
          </div>

          <div class="ms-auto">
            <ViewModeToggle v-model="modeRekap" />
          </div>
        </div>
      </div>


      <!-- Card: Rekap per jenis -->
      <div class="rounded-lg border border-card-line bg-card">
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
              <tr v-for="r in paginated" v-else :key="r.id" class="hover:bg-layer-hover cursor-pointer" :class="r.hasChild ? 'bg-layer/40' : ''" @click="openDetail(r)">
                <td class="px-3 py-2.5 font-medium text-foreground">{{ r.kode || '-' }}</td>
                <td class="px-3 py-2.5 text-foreground">
                  <span :style="{ paddingInlineStart: `${(r.level - 1) * 14}px` }" :class="r.hasChild ? 'font-semibold text-foreground' : ''">
                    {{ r.nama }}
                  </span>
                </td>
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
          >
            <template #badge>
              <span
                v-if="r.hasChild"
                class="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
              >
                Induk
              </span>
            </template>
          </RecordCard>
        </div>

        <div v-else class="p-2">
          <div v-if="loading" class="py-6 text-center text-muted-foreground-1">Memuat...</div>
          <div v-else-if="!filtered.length" class="py-6 text-center text-muted-foreground-1">Belum ada data</div>
          <ul v-else class="divide-y divide-table-line">
            <li v-for="r in paginated" :key="r.id" class="flex items-center gap-2 py-2">
              <span class="min-w-0 flex-1">
                <span
                  class="block truncate text-sm text-foreground"
                  :style="{ paddingInlineStart: `${(r.level - 1) * 14}px` }"
                  :class="r.hasChild ? 'font-semibold' : ''"
                >
                  {{ r.kode || '-' }} — {{ r.nama }}
                </span>
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
            <div v-if="isAdminOrKepala" class="w-full max-w-[220px]">
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

    <AppDialog v-model="detailDialog" title="Detail Rekap" :max-width="520" :icon="FileText">
      <div v-if="detailRow" class="space-y-2 text-sm">
        <div class="flex justify-between gap-3"><span class="text-muted-foreground-1">Kode</span><span class="font-medium text-foreground">{{ detailRow.kode || '-' }}</span></div>
        <div class="flex justify-between gap-3"><span class="text-muted-foreground-1">Jenis</span><span class="font-medium text-foreground">{{ detailRow.nama }}</span></div>
        <div class="flex justify-between gap-3"><span class="text-muted-foreground-1">Tipe</span><span class="font-medium text-foreground">{{ detailRow.hasChild ? 'Induk (kategori)' : 'Anak (pos)' }}</span></div>
        <div class="flex justify-between gap-3"><span class="text-muted-foreground-1">Level</span><span class="font-medium text-foreground">{{ detailRow.level }}</span></div>
        <div class="flex justify-between gap-3"><span class="text-muted-foreground-1">Kawasan</span><span class="font-medium text-foreground">{{ detailRow.kawasan_kode }} — {{ detailRow.kawasan_nama }}</span></div>
        <div class="flex justify-between gap-3"><span class="text-muted-foreground-1">Target</span><span class="font-medium text-foreground">{{ fmt(detailRow.target) }}</span></div>
        <div class="flex justify-between gap-3"><span class="text-muted-foreground-1">Realisasi</span><span class="font-medium text-foreground">{{ fmt(detailRow.realisasi) }}</span></div>
        <div class="flex justify-between gap-3"><span class="text-muted-foreground-1">Capaian</span><span class="font-medium text-foreground">{{ detailRow.capaian }}%</span></div>
        <div class="flex justify-between gap-3"><span class="text-muted-foreground-1">Selisih</span><span class="font-medium text-foreground">{{ fmt(detailRow.selisih) }}</span></div>
        <div v-if="detailRow.targetInduk != null" class="flex justify-between gap-3"><span class="text-muted-foreground-1">Target Induk Tertulis</span><span class="font-medium text-foreground">{{ fmt(detailRow.targetInduk) }}</span></div>
      </div>

      <div class="mt-4">
        <div class="mb-2 text-sm font-medium text-foreground">History Realisasi per Tanggal</div>
        <div v-if="detailLoading" class="py-4 text-center text-muted-foreground-1">Memuat...</div>
        <div v-else-if="!detailHistory.length" class="py-4 text-center text-muted-foreground-1">Belum ada realisasi</div>
        <div v-else class="max-h-64 overflow-y-auto rounded-lg border border-card-line">
          <table class="min-w-full divide-y divide-table-line text-sm">
            <thead class="sticky top-0 bg-card">
              <tr class="text-start text-xs uppercase tracking-wide text-muted-foreground-1">
                <th class="px-3 py-2 text-start font-medium">Tanggal</th>
                <th class="px-3 py-2 text-start font-medium">Jenis</th>
                <th class="px-3 py-2 text-end font-medium">Jumlah</th>
                <th class="px-3 py-2 text-start font-medium">Status</th>
                <th class="px-3 py-2 text-start font-medium">Catatan</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-table-line">
              <tr v-for="h in detailHistory" :key="h.id">
                <td class="px-3 py-2 text-foreground">{{ h.tanggal }}</td>
                <td class="px-3 py-2 text-foreground">{{ h.jenis_nama || '-' }}</td>
                <td class="px-3 py-2 text-end text-foreground">{{ fmt(h.jumlah) }}</td>
                <td class="px-3 py-2 text-foreground">{{ h.status }}</td>
                <td class="px-3 py-2 text-foreground">{{ h.catatan || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </AppDialog>

    <AppToast v-model="snack.show" :message="snack.msg" :color="snack.color" :timeout="3000" />
  </div>
</template>

<script setup lang="ts">
import {
  ArrowRight,
  Banknote,
  CalendarDays,
  ChartColumn,
  ChartColumnBig,
  FileSpreadsheet,
  FileText,
  Filter,
  Gauge,
  LoaderCircle,
  Rows3,
  Scale,
  Search,
  Target,
} from 'lucide-vue-next'

definePageMeta({ layout: 'default', middleware: 'auth' })

const { mode: modeRekap } = useViewMode('laporan-rekap')
const { mode: modeBanding } = useViewMode('laporan-banding')

type RekapRow = { id: number; kode: string; nama: string; level: number; urutan: number; kawasan_id: number; kawasan_kode: string; kawasan_nama: string; target: number; realisasi: number; capaian: number; selisih: number; hasChild: boolean; children: { id: number; nama: string }[]; leafIds: number[] }

const session = useUserSession()
const role = computed(() => String(session.user.value?.role || ''))
const isAdminOrKepala = computed(() => ['admin', 'kepala'].includes(role.value))
// Petugas kawasan yang punya kawasan_id tidak boleh melihat data kawasan lain.
const isScopedUser = computed(() => {
  const kw = (session.user.value as Record<string, unknown>)?.kawasan_id
  return kw != null
})

const kawasan = ref<{ id: number; kode: string; nama: string }[]>([])
const kawasanOpts = computed(() => kawasan.value.map((k) => ({ label: `${k.kode} — ${k.nama}`, value: k.id })))
const filterKawasan = ref<number | null>(null)
const tahun = ref(new Date().getFullYear())
const tahunOpts = [2024, 2025, 2026, 2027]
const bulan = ref(new Date().getMonth() + 1)
const dateFrom = ref('')
const dateTo = ref('')
const bulanOpts = [
  { label: 'Januari', value: 1 }, { label: 'Februari', value: 2 }, { label: 'Maret', value: 3 }, { label: 'April', value: 4 },
  { label: 'Mei', value: 5 }, { label: 'Juni', value: 6 }, { label: 'Juli', value: 7 }, { label: 'Agustus', value: 8 },
  { label: 'September', value: 9 }, { label: 'Oktober', value: 10 }, { label: 'November', value: 11 }, { label: 'Desember', value: 12 },
]
const bulanLabel = computed(() => bulanOpts.find((b) => b.value === bulan.value)?.label || String(bulan.value))
const q = ref('')
const loading = ref(false)
const perJenis = ref<RekapRow[]>([])
const detailDialog = ref(false)
const detailRow = ref<RekapRow | null>(null)
const detailHistory = ref<{ id: number; tanggal: string; jumlah: number; status: string; catatan: string; jenis_nama: string }[]>([])
const detailLoading = ref(false)
const totals = ref<{ totalTarget: number; totalRealisasi: number; capaian: number; selisih: number } | null>(null)
const mingguan = ref<{ minggu: number; label: string; nilai: number }[]>([])
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
watch([q, filterKawasan, tahun, bulan, periode, dateFrom, dateTo], () => { currentPage.value = 1 })
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

const weekTotal = computed(() => mingguan.value.reduce((s, m) => s + m.nilai, 0))
function weekRange(w: number) {
  if (w === 1) return '1–7'
  if (w === 2) return '8–14'
  if (w === 3) return '15–21'
  const last = new Date(tahun.value, bulan.value, 0).getDate()
  return `22–${last}`
}
function weekPct(v: number) {
  if (!weekTotal.value) return 0
  return Math.round((v / weekTotal.value) * 10000) / 100
}
function weekKeterangan(w: number, v: number) {
  if (v === 0) return 'Belum ada realisasi'
  const maxVal = Math.max(...mingguan.value.map((m) => m.nilai))
  if (v === maxVal && maxVal > 0) return 'Tertinggi'
  return '—'
}
const weekTopNote = computed(() => {
  if (!weekTotal.value) return ''
  const maxVal = Math.max(...mingguan.value.map((m) => m.nilai))
  const top = mingguan.value.find((m) => m.nilai === maxVal)
  if (!top || maxVal === 0) return ''
  return `Puncak realisasi pada ${top.label} (Rp ${fmt(maxVal)}).`
})

async function loadKawasan() {
  try {
    const r = await $fetch<{ data: { id: number; kode: string; nama: string }[] }>('/api/kawasan')
    kawasan.value = r.data
  } catch {}
}
function fmtDate(d: Date) { return d.toISOString().slice(0, 10) }
function setDatePreset(p: string) {
  const now = new Date()
  if (p === 'today') {
    dateFrom.value = fmtDate(now)
    dateTo.value = fmtDate(now)
  } else if (p === '7d') {
    const s = new Date(now); s.setDate(s.getDate() - 6)
    dateFrom.value = fmtDate(s)
    dateTo.value = fmtDate(now)
  } else if (p === '30d') {
    const s = new Date(now); s.setDate(s.getDate() - 29)
    dateFrom.value = fmtDate(s)
    dateTo.value = fmtDate(now)
  } else if (p === 'month') {
    const s = new Date(now.getFullYear(), now.getMonth(), 1)
    const e = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    dateFrom.value = fmtDate(s)
    dateTo.value = fmtDate(e)
  }
  load()
}
function clearDateRange() {
  dateFrom.value = ''
  dateTo.value = ''
  load()
}

async function load() {
  loading.value = true
  try {
    const sampaiBulan = periode.value === 'tahun' ? 12 : bulan.value
    const q2: Record<string, string> = { tahun: String(tahun.value) }
    if (dateFrom.value && dateTo.value) {
      q2.from = dateFrom.value
      q2.to = dateTo.value
    } else {
      q2.bulan = String(sampaiBulan)
    }
    if (filterKawasan.value) q2.kawasan_id = String(filterKawasan.value)
    const r = await $fetch<{ perJenis: RekapRow[]; totals: typeof totals.value; mingguan?: typeof mingguan.value }>('/api/laporan/rekap', { query: q2 })
    perJenis.value = r.perJenis
    totals.value = r.totals
    mingguan.value = r.mingguan || []
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

async function openDetail(r: RekapRow) {
  detailRow.value = r
  detailDialog.value = true
  detailLoading.value = true
  detailHistory.value = []
  try {
    if (r.hasChild && r.leafIds.length) {
      const leafSet = new Set(r.leafIds)
      const res = await $fetch<{ data: { id: number; tanggal: string; jumlah: number; status: string; catatan: string; jenis_nama: string; jenis_retribusi_id: number }[] }>('/api/realisasi', {
        query: { kawasan_id: String(r.kawasan_id) },
      })
      detailHistory.value = (res.data || [])
        .filter((h) => leafSet.has(Number(h.jenis_retribusi_id)))
        .filter((h) => h.status !== 'draft') as typeof detailHistory.value
    } else {
      const res = await $fetch<{ data: { id: number; tanggal: string; jumlah: number; status: string; catatan: string; jenis_nama: string }[] }>('/api/realisasi', {
        query: { jenis_retribusi_id: String(r.id) },
      })
      detailHistory.value = (res.data || []).filter((h) => h.status !== 'draft')
    }
  } catch {
    detailHistory.value = []
  } finally { detailLoading.value = false }
}

onMounted(async () => { await loadKawasan(); await load(); await loadBanding() })
watch(tab, (v) => { if (v === 'banding' && !banding.value) loadBanding() })
</script>
