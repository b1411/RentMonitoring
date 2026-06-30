/**
 * Hydrate the session once at app start. Runs on the server so the first render
 * (nav, finance gating) already knows the role; the result transfers to the client.
 */
export default defineNuxtPlugin(async () => {
  const { user, fetchMe } = useAuth();
  if (!user.value) await fetchMe();
});
