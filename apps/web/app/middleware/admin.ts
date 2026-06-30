/** Gate admin-only routes. Redirects non-admins to login with a return path. */
export default defineNuxtRouteMiddleware((to) => {
  const { isAdmin } = useAuth();
  if (!isAdmin.value) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
  }
});
