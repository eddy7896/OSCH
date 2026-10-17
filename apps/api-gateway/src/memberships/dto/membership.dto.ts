export class MembershipDto {
  userId!: string;
  email!: string;
  displayName!: string | null;
  phoneNumber!: string | null;
  /** One of the 14 school roles (packages/rbac). */
  role!: string;
  /** ACTIVE or SUSPENDED. A suspended member keeps the row but is refused everywhere. */
  status!: string;
  since!: string;
}

export class MembershipListDto {
  items!: MembershipDto[];
}
