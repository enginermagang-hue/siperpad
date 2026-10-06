// ponytail: minimal helper — token refresh + list/upload ditambah saat fitur upload dipakai
import { Dropbox } from 'dropbox'

export function getDropboxClient() {
  const config = useRuntimeConfig()
  const refreshToken = (config.dropboxRefreshToken as string) || process.env.DROPBOX_REFRESH_TOKEN || ''
  const appKey = (config.dropboxAppKey as string) || process.env.DROPBOX_APP_KEY || ''
  const appSecret = (config.dropboxAppSecret as string) || process.env.DROPBOX_APP_SECRET || ''
  const folder = (config.dropboxFolder as string) || process.env.DROPBOX_FOLDER || '/siperpad'

  if (!appKey || !appSecret) throw new Error('DROPBOX_APP_KEY/SECRET belum dikonfigurasi')
  // Dropbox SDK handles refresh automatically when refreshToken is provided via fetch
  const dbx = new Dropbox({
    clientId: appKey,
    clientSecret: appSecret,
    refreshToken: refreshToken || undefined,
    fetch: globalThis.fetch as typeof fetch,
  })
  return { dbx, folder }
}
