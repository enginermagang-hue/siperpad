#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const ENV_PATH = fileURLToPath(new URL('../.env', import.meta.url))

function loadEnv() {
  const raw = readFileSync(ENV_PATH, 'utf8')
  const env = {}
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim()
    env[key] = val
  }
  return env
}

function saveEnv(env) {
  const lines = []
  for (const [key, val] of Object.entries(env)) {
    lines.push(`${key}=${val}`)
  }
  writeFileSync(ENV_PATH, lines.join('\n') + '\n', 'utf8')
}

async function main() {
  const env = loadEnv()
  const appKey = env.DROPBOX_APP_KEY || process.env.DROPBOX_APP_KEY
  const appSecret = env.DROPBOX_APP_SECRET || process.env.DROPBOX_APP_SECRET

  if (!appKey || !appSecret) {
    console.error('DROPBOX_APP_KEY dan DROPBOX_APP_SECRET wajib diisi di file .env')
    process.exit(1)
  }

  console.log('\n=== Dropbox Refresh Token Generator ===\n')

  const redirectUri = 'http://localhost:3000/api/auth/dropbox/callback'
  const authUrl = new URL('https://www.dropbox.com/oauth2/authorize')
  authUrl.searchParams.set('client_id', appKey)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('token_access_type', 'offline')
  authUrl.searchParams.set('redirect_uri', redirectUri)

  console.log('1. Buka URL berikut di browser:')
  console.log(`   ${authUrl.toString()}\n`)
  console.log('2. Login ke akun Dropbox (jika belum) dan klik "Allow" / "Izinkan".')
  console.log(`3. Browser akan redirect ke ${redirectUri}?code=... (halaman error 404 normal) — copy bagian kode setelah "code=" dari address bar.`)

  const readline = await import('node:readline')
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  const code = await new Promise((resolve) => {
    rl.question('\n4. Paste kode di sini: ', (answer) => {
      resolve(answer.trim())
    })
  })

  if (!code) {
    console.error('Kode tidak boleh kosong.')
    rl.close()
    process.exit(1)
  }

  console.log('\nMenukar kode dengan refresh token...')

  const tokenResp = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: appKey,
      client_secret: appSecret,
      redirect_uri: redirectUri,
    }),
  })

  const text = await tokenResp.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    console.error('Gagal parse respons Dropbox:', text)
    rl.close()
    process.exit(1)
  }

  if (!data.refresh_token) {
    console.error('Refresh token tidak ditemukan. Respons:', data)
    rl.close()
    process.exit(1)
  }

  const refreshToken = data.refresh_token

  const overwrite = await new Promise((resolve) => {
    rl.question(
      `\nRefresh token berhasil didapat.\nTulis ke ${basename(ENV_PATH)} sekarang? (y/N): `,
      (answer) => resolve(answer.trim().toLowerCase() === 'y')
    )
  })

  rl.close()

  if (overwrite) {
    env.DROPBOX_REFRESH_TOKEN = refreshToken
    saveEnv(env)
    console.log(`\nDROPBOX_REFRESH_TOKEN sudah ditulis ke ${basename(ENV_PATH)}.`)
  } else {
    console.log('\nIsi manual di .env:')
    console.log(`DROPBOX_REFRESH_TOKEN=${refreshToken}`)
  }

  console.log('\nSelesai. Pastikan DROPBOX_FOLDER sudah sesuai di .env jika diperlukan.')
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
