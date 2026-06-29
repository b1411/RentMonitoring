/** $fetch instance bound to the NestJS API base (ТЗ §1: native $fetch, no axios). */
export function useApi() {
  const { apiBase } = useRuntimeConfig().public;
  return $fetch.create({ baseURL: apiBase });
}
