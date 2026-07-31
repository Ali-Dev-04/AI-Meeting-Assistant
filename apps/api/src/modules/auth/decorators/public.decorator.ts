import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';

/** Mark a route or controller as not requiring authentication. */
export const Public = () => SetMetadata(IS_PUBLIC, true);
