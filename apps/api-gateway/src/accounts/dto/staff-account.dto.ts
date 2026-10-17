export class StaffAccountDto {
  userId!: string;
  displayName!: string;
  email!: string | null;
  phoneNumber!: string | null;
  role!: string;
  status!: string;
  /** How the person signs in: EMAIL (sets a password through an emailed link), PHONE (one-time code), or BOTH. */
  signIn!: string;
  /**
   * SEND_SET_PASSWORD_EMAIL: the client must now ask Firebase to email the person their set-password link
   * (`sendPasswordResetEmail(auth, email)`); the link is never returned to the admin. NONE for phone-only accounts.
   */
  nextStep!: 'SEND_SET_PASSWORD_EMAIL' | 'NONE';
}
