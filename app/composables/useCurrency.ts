export function formatRupiah(v: number | string | null | undefined): string {
  const n = Number(v)
  if (!Number.isFinite(n)) return 'Rp 0'
  const sign = n < 0 ? '-' : ''
  return `${sign}Rp ${Math.abs(Math.trunc(n)).toLocaleString('id-ID')}`
}

export function formatRupiahInput(v: number | string | null | undefined): string {
  const n = Number(v)
  if (!Number.isFinite(n)) return '0'
  return Math.abs(Math.trunc(n)).toLocaleString('id-ID')
}

export function parseRupiahInput(raw: string): number {
  const d = String(raw ?? '').replace(/\D/g, '')
  return d ? Number(d) : 0
}

// Hitung posisi caret baru setelah teks diformat, berdasarkan jumlah digit
// di sebelah kiri caret. Dipakai agar caret tidak melompat ke akhir field.
export function caretFromDigits(formatted: string, digitsBeforeCaret: number): number {
  if (digitsBeforeCaret <= 0) return 0
  let seen = 0
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i]!)) {
      seen++
      if (seen === digitsBeforeCaret) return i + 1
    }
  }
  return formatted.length
}

// Rupiah input dengan format ribuan live + posisi caret yang terjaga.
// `amountRef` menyimpan nilai numerik; `display` untuk ditampilkan di field,
// `onInput` dipasang pada event input (target harus elemen <input> native).
export function useRupiahInput(amountRef: Ref<number>) {
  const display = computed({
    get: () => formatRupiahInput(amountRef.value),
    set: (val: string) => { amountRef.value = parseRupiahInput(val) },
  })

  function onInput(e: Event) {
    const el = e.target as HTMLInputElement
    const raw = el.value
    const caret = el.selectionStart ?? raw.length
    const digitsBefore = raw.slice(0, caret).replace(/\D/g, '').length

    const formatted = formatRupiahInput(parseRupiahInput(raw))
    amountRef.value = parseRupiahInput(raw)
    // Tulis langsung ke elemen agar kursor bisa dipulihkan pada posisi yang benar.
    el.value = formatted

    const pos = caretFromDigits(formatted, digitsBefore)
    nextTick(() => {
      el.setSelectionRange(pos, pos)
    })
  }

  return { display, onInput }
}

export function useCurrency() {
  return { formatRupiah, formatRupiahInput, parseRupiahInput, caretFromDigits, useRupiahInput }
}
