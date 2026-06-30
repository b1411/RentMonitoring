/** $fetch instance bound to the NestJS API base (ТЗ §1: native $fetch, no axios). */
export function useApi() {
  const { apiBase } = useRuntimeConfig().public;
  const token = useCookie<string | null>('rm_token');

  return $fetch.create({
    baseURL: apiBase,
    onRequest({ options }) {
      if (token.value) {
        options.headers.set('Authorization', `Bearer ${token.value}`);
      }
    },
    onResponseError({ response }) {
      // Drop a stale/expired token so the UI falls back to the guest view.
      if (response.status === 401) token.value = null;
    },
  });
}
