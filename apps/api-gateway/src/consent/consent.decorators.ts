import { SetMetadata } from '@nestjs/common';

export const CONSENT_EXEMPT = 'oru:consent-exempt';

/** A route a parent may call before consenting: only the consent routes themselves. Every other parent route is refused with CONSENT_REQUIRED until the parent has consented to the current notice. */
export const ConsentExempt = () => SetMetadata(CONSENT_EXEMPT, true);
