import type { AuthUser, LoginResponse } from '~/types';

/** Auth state shared across the app: cookie-backed JWT + reactive user. */
export function useAuth() {
  const token = useCookie<string | null>('rm_token', {
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'lax',
    path: '/',
  });
  const user = useState<AuthUser | null>('auth_user', () => null);
  const api = useApi();

  const isAuthenticated = computed(() => Boolean(user.value));
  const isAdmin = computed(() => user.value?.role === 'ADMIN');
  // Any signed-in role may see financials; guests see occupancy only.
  const canViewFinance = computed(() => Boolean(user.value));

  async function login(email: string, password: string): Promise<AuthUser> {
    const res = await api<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    token.value = res.token;
    user.value = res.user;
    return res.user;
  }

  /** Hydrate the user from a stored token; clears both on failure. */
  async function fetchMe(): Promise<void> {
    if (!token.value) {
      user.value = null;
      return;
    }
    try {
      user.value = await api<AuthUser>('/auth/me');
    } catch {
      token.value = null;
      user.value = null;
    }
  }

  function logout(): void {
    token.value = null;
    user.value = null;
  }

  return {
    token,
    user,
    isAuthenticated,
    isAdmin,
    canViewFinance,
    login,
    fetchMe,
    logout,
  };
}
