#!/usr/bin/env node
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
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

function requireEnv(env, key) {
  const val = env[key] || process.env[key]
  if (!val) {
    console.error(`${key} belum diisi di file .env`)
    process.exit(1)
  }
  return val
}

async function main() {
  const env = loadEnv()

  const appKey = requireEnv(env, 'DROPBOX_APP_KEY')
  const appSecret = requireEnv(env, 'DROPBOX_APP_SECRET')
  const refreshToken = requireEnv(env, 'DROPBOX_REFRESH_TOKEN')
  const folder = (env.DROPBOX_FOLDER || '/siperpad').replace(/\/$/, '')

  const tempFile = join(__dirname, 'text.txt')
  const fileName = 'text.txt'
  const remotePath = `${folder}/${fileName}`

  console.log('\n=== Dropbox Upload Test ===\n')
  console.log(`Folder : ${folder}`)
  console.log(`File   : ${fileName}`)
  console.log(`Target : ${remotePath}\n`)

  writeFileSync(tempFile, `Siperpad upload test — ${new Date().toISOString()}\n`)
  const contents = readFileSync(tempFile)

  console.log('Menginisialisasi Dropbox client...')
  const { Dropbox } = await import('dropbox')
  const dbx = new Dropbox({
    clientId: appKey,
    clientSecret: appSecret,
    refreshToken,
    fetch: globalThis.fetch,
  })

  console.log('Mengupload file...')
  const uploadResp = await dbx.filesUpload({
    path: remotePath,
    contents,
    mode: 'overwrite',
    autorename: true,
  })

  if (uploadResp.status !== 200 || !uploadResp.result) {
    console.error('Upload gagal:', uploadResp)
    unlinkSync(tempFile)
    process.exit(1)
  }

  const meta = uploadResp.result
  console.log('Upload berhasil!')
  console.log(`  path_display : ${meta.path_display ?? remotePath}`)
  console.log(`  size         : ${meta.size} bytes`)
  console.log(`  id           : ${meta.id}`)

  console.log('\nMemverifikasi file ada di Dropbox...')
  const listResp = await dbx.filesListFolder({
    path: folder,
  })

  if (listResp.status !== 200 || !listResp.result) {
    console.error('Verifikasi gagal (filesListFolder):', listResp)
    unlinkSync(tempFile)
    process.exit(1)
  }

  const found = listResp.result.entries.find(
    (entry) => entry.name === fileName && entry['.tag'] === 'file'
  )

  if (found) {
    console.log('Verifikasi berhasil — file ditemukan:')
    console.log(`  path_display : ${found.path_display}`)
    console.log(`  size         : ${found.size} bytes`)
    console.log(`  id           : ${found.id}`)
  } else {
    console.error('File tidak ditemukan di folder setelah upload.')
    unlinkSync(tempFile)
    process.exit(1)
  }

  unlinkSync(tempFile)
  console.log('\nSelesai. File tes berhasil diupload dan terverifikasi di Dropbox.\n')
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
