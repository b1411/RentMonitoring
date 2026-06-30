/** Shared auth shapes. Role union mirrors the Prisma `Role` enum (schema.prisma). */
export type AppRole = 'ADMIN' | 'MANAGER' | 'VIEWER';

/** What the JWT strategy resolves and attaches to `request.user`. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: AppRole;
}

/** Signed JWT body. `sub` is the user id (RFC 7519). */
export interface JwtPayload {
  sub: string;
  email: string;
  role: AppRole;
}
