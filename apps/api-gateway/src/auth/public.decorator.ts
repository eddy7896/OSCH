import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'oru:public';
/** Opt a route out of authentication. Everything else requires a valid Firebase ID token (deny by default). */
export const Public = () => SetMetadata(IS_PUBLIC, true);
