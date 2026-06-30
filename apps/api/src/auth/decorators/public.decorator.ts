import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marks a route as open. JwtAuthGuard still parses a token if present (optional auth). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
