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
  // Verifikasi (realisasi diajukan, kunci periode, catatan temuan, audit) hanya admin.
  if (to.path.startsWith('/verifikasi') && role !== 'admin') {
    return navigateTo('/')
  }
  if (!['admin', 'kepala', 'user'].includes(role)) {
    return navigateTo('/')
  }
})