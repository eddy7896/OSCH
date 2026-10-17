export class InvitationDto {
  id!: string;
  email!: string;
  phoneNumber!: string | null;
  role!: string;
  /** PENDING, ACCEPTED, REVOKED, or EXPIRED (a pending invitation past its expiry). */
  status!: string;
  expiresAt!: string;
  createdAt!: string;
  acceptedAt!: string | null;
  createdBy!: { id: string; displayName: string | null };
}

export class InvitationListDto {
  items!: InvitationDto[];
}

export class CreatedInvitationDto extends InvitationDto {
  /** The secret for the invitation link. Returned ONCE, here; it is never stored or shown again. */
  token!: string;
}

export class AcceptedInvitationDto {
  school!: { id: string; name: string };
  role!: string;
}
