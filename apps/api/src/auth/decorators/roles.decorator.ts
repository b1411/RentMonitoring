import { SetMetadata } from '@nestjs/common';
import type { AppRole } from '../auth.types';

export const ROLES_KEY = 'roles';

/** Restricts a route to the listed roles. RolesGuard enforces it. */
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
