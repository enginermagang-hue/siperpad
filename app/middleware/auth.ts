export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/login') return
  const session = useUserSession()
  if (!session.loggedIn.value) {
    return navigateTo('/login')
  }
  const role = String(session.user.value?.role || '')
  const adminOnly = ['/kawasan-wisata', '/jenis-retribusi', '/master/target', '/pengguna']
  if (adminOnly.some((p) => to.path.startsWith(p)) && role !== 'admin') {
    return navigateTo('/')
  }
  // Pimpinan (kepala) bersifat read-only: dashboard, laporan, pengaturan.
  // Verifikasi hanya untuk admin (bendahara penerimaan sebagai validator).
  if (role === 'kepala' && to.path.startsWith('/verifikasi')) {
    return navigateTo('/')
  }
  if (to.path.startsWith('/verifikasi')) {
    const verifAdminOnly = to.path.startsWith('/verifikasi/periode') || to.path.startsWith('/verifikasi/catatan')
    if (verifAdminOnly && role !== 'admin') {
      return navigateTo(role === 'user' ? '/verifikasi/batch' : '/')
    }
    if (role === 'user' && !to.path.startsWith('/verifikasi/batch')) {
      return navigateTo('/verifikasi/batch')
    }
    if (!['admin', 'kepala', 'user'].includes(role)) {
      return navigateTo('/')
    }
  }
})
