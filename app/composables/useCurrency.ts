export function formatRupiah(v: number | string | null | undefined): string {
  const n = Number(v)
  if (!Number.isFinite(n)) return 'Rp 0'
  const sign = n < 0 ? '-' : ''
  return `${sign}Rp ${Math.abs(Math.trunc(n)).toLocaleString('id-ID')}`
}

export function formatRupiahInput(v: number | string | null | undefined): string {
  const n = Number(v)
  if (!n) return ''
  return Math.abs(Math.trunc(n)).toLocaleString('id-ID')
}

export function parseRupiahInput(raw: string): number {
  const d = String(raw ?? '').replace(/\D/g, '')
  return d ? Number(d) : 0
}

// ponytail: cursor jumps to end on format; add caret preservation when needed
export function useRupiahModel(amountRef: Ref<number>) {
  return computed({
    get: () => formatRupiahInput(amountRef.value),
    set: (val: string) => { amountRef.value = parseRupiahInput(val) },
  })
}

export function useCurrency() {
  return { formatRupiah, formatRupiahInput, parseRupiahInput, useRupiahModel }
}
