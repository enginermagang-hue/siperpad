export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/login') return
  const session = useUserSession()
  if (!session.loggedIn.value) {
    return navigateTo('/login')
  }
  if (session.user.value?.role !== 'admin' && to.path.startsWith('/master-data')) {
    return navigateTo('/')
  }
  if (session.user.value?.role !== 'verifikator' && to.path.startsWith('/verifikasi')) {
    return navigateTo('/')
  }
})
