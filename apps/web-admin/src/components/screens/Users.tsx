"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { CreatedInvitationDto, InvitationDto, InvitationListDto, MembershipDto, MembershipListDto } from "@oruschools/api-client";
import { ROLES } from "@oruschools/rbac";
import { Badge, Banner, Button, Card, EmptyState, SegmentedControl, TextField } from "@oruschools/shared-ui";
import { errorKey, useSession } from "@oruschools/web-auth";
import { roleKey } from "@/lib/nav";
import { shortDate } from "@/lib/display";
import { useLoad } from "@/lib/use-load";
import { DataTable, type Column } from "./DataTable";
import { ConfirmBox, Failed, SelectField } from "./parts";

export interface UserGrants {
  create: boolean;
  update: boolean;
  remove: boolean;
}

/** Roles an account can be made for (parents come in through admissions and guardian links, not here). */
const ACCOUNT_ROLES = ROLES.filter((r) => r !== "PARENT");
const roleOptions = (t: (k: string) => string, roles: readonly string[]) => roles.map((r) => ({ value: r, label: t(roleKey(r)) }));
type Action = { kind: "role" | "suspend" | "reactivate" | "remove"; member: MembershipDto; role?: string };

function Members({ selfId, grants }: { selfId: string; grants: UserGrants }) {
  const t = useTranslations();
  const locale = useLocale();
  const { api, port } = useSession();
  const [state, reload] = useLoad<MembershipListDto>(api ? () => api.membershipsList({}) : null, "members");
  const [action, setAction] = useState<Action | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<{ text: string; resend?: string } | null>(null);
  const [f, setF] = useState({ displayName: "", schoolRole: "STAFF", email: "", phoneNumber: "" });
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const label = (m: MembershipDto) => m.displayName ?? m.email ?? m.phoneNumber ?? "";

  const run = async (fn: () => Promise<unknown>, after?: () => void) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setAction(null);
      after?.();
      reload();
    } catch (e) {
      setError(errorKey(e));
    } finally {
      setBusy(false);
    }
  };
  const sendLink = async (email: string) => {
    try {
      await port!.sendPasswordReset(email);
      setNote({ text: t("usrLinkSent", { email }) });
    } catch {
      setNote({ text: t("usrLinkFailed"), resend: email });
    }
  };
  const confirm = () => {
    if (!action || !api) return;
    const id = action.member.userId;
    void run(() =>
      action.kind === "remove" ? api.membershipsRemove({ path: { userId: id } })
      : action.kind === "role" ? api.membershipsUpdate({ path: { userId: id }, body: { schoolRole: action.role as "STAFF" } })
      : api.membershipsUpdate({ path: { userId: id }, body: { status: action.kind === "suspend" ? "SUSPENDED" : "ACTIVE" } }),
    );
  };
  const question = action && t(action.kind === "role" ? "usrConfirmRole" : action.kind === "remove" ? "usrConfirmRemove" : "usrConfirmSuspend", { name: label(action.member), role: action.role ? t(roleKey(action.role)) : "" });

  const columns: Column<MembershipDto>[] = [
    { key: "name", header: t("usrDisplayName"), render: (m) => <>{label(m)}{m.userId === selfId && <span className="ms-2"><Badge tone="brand">{t("usrYou")}</Badge></span>}<span className="block text-caption text-text-muted" dir="ltr">{m.email ?? m.phoneNumber ?? ""}</span></> },
    { key: "role", header: t("usrRole"), render: (m) => t(roleKey(m.role)) },
    { key: "status", header: t("reportStatus"), render: (m) => <Badge tone={m.status === "ACTIVE" ? "success" : "warning"}>{t(m.status === "ACTIVE" ? "statusActive" : "statusSuspended")}</Badge> },
    { key: "since", header: t("usrSince"), render: (m) => shortDate(m.since.slice(0, 10), locale) },
    {
      key: "x", header: t("usrChangeRole"), hideHeader: true,
      render: (m) => m.userId === selfId ? null : (
        <span className="flex flex-wrap gap-2">
          {grants.update && <Button size="compact" aria-label={`${t("usrChangeRole")}: ${label(m)}`} onClick={() => setAction({ kind: "role", member: m, role: m.role })}>{t("usrChangeRole")}</Button>}
          {grants.update && <Button size="compact" aria-label={`${t(m.status === "ACTIVE" ? "actionSuspend" : "actionReactivate")}: ${label(m)}`} onClick={() => setAction({ kind: m.status === "ACTIVE" ? "suspend" : "reactivate", member: m })}>{t(m.status === "ACTIVE" ? "actionSuspend" : "actionReactivate")}</Button>}
          {grants.remove && <Button size="compact" variant="danger" aria-label={`${t("hrpRemove")}: ${label(m)}`} onClick={() => setAction({ kind: "remove", member: m })}>{t("hrpRemove")}</Button>}
        </span>
      ),
    },
  ];
  const valid = f.displayName.trim() && (f.email.trim() || f.phoneNumber.trim());
  return (
    <div className="flex flex-col gap-4">
      {grants.create && !creating && <div><Button variant="primary" size="comfortable" icon="user-plus" onClick={() => { setCreating(true); setNote(null); }}>{t("usrNewAccount")}</Button></div>}
      {note && (
        <Banner tone={note.resend ? "warning" : "success"} title={note.text} action={note.resend ? <Button size="comfortable" onClick={() => void sendLink(note.resend!)}>{t("usrSendLink")}</Button> : undefined} />
      )}
      {creating && (
        <Card title={t("usrNewAccount")} headingLevel={2}>
          <form className="flex flex-col gap-3" onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            try {
              const r = await api!.accountsCreate({ body: { displayName: f.displayName.trim(), schoolRole: f.schoolRole as "STAFF", ...(f.email.trim() ? { email: f.email.trim() } : {}), ...(f.phoneNumber.trim() ? { phoneNumber: f.phoneNumber.trim() } : {}) } });
              setCreating(false);
              setNote({ text: t("usrAccountCreated", { name: r.displayName }) });
              setF({ displayName: "", schoolRole: "STAFF", email: "", phoneNumber: "" });
              reload();
              if (r.nextStep === "SEND_SET_PASSWORD_EMAIL" && r.email) await sendLink(r.email);
            } catch (err) {
              setError(errorKey(err));
            } finally {
              setBusy(false);
            }
          }}>
            <p className="text-body text-text-muted">{t("usrAccountIntro")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField size="comfortable" label={t("usrDisplayName")} value={f.displayName} onChange={(e) => set("displayName")(e.target.value)} required />
              <SelectField label={t("usrRole")} value={f.schoolRole} onChange={set("schoolRole")} options={roleOptions(t, ACCOUNT_ROLES)} />
              <TextField size="comfortable" type="email" label={t("authEmailLabel")} value={f.email} onChange={(e) => set("email")(e.target.value)} />
              <TextField size="comfortable" type="tel" label={t("authPhoneLabel")} hint={t("authPhoneHint")} value={f.phoneNumber} onChange={(e) => set("phoneNumber")(e.target.value)} />
            </div>
            {error && <Banner tone="danger" title={t(error)} />}
            <div className="flex gap-2">
              <Button type="submit" variant="primary" size="comfortable" disabled={busy || !valid}>{t("actionSave")}</Button>
              <Button size="comfortable" onClick={() => setCreating(false)}>{t("actionCancel")}</Button>
            </div>
          </form>
        </Card>
      )}
      {action && (
        <ConfirmBox question={question!}>
          {action.kind === "role" && <SelectField label={t("usrRole")} value={action.role ?? ""} onChange={(v) => setAction({ ...action, role: v })} options={roleOptions(t, ROLES)} />}
          <Button size="comfortable" variant={action.kind === "remove" ? "danger" : "primary"} disabled={busy || (action.kind === "role" && action.role === action.member.role)} onClick={confirm}>{t("hrpConfirm")}</Button>
          <Button size="comfortable" onClick={() => setAction(null)}>{t("actionCancel")}</Button>
        </ConfirmBox>
      )}
      {error && !creating && <Banner tone="danger" title={t(error)} />}
      {state.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {state.status === "error" && <Failed messageKey={state.messageKey} retry={reload} />}
      {state.status === "ready" && <DataTable caption={t("usrTabMembers")} columns={columns} rows={state.data.items} rowKey={(m) => m.userId} />}
    </div>
  );
}

const INV_TONE: Record<string, "info" | "success" | "neutral"> = { PENDING: "info", ACCEPTED: "success", REVOKED: "neutral" };
const INV_KEY: Record<string, string> = { PENDING: "usrPending", ACCEPTED: "peoAccepted", REVOKED: "usrCancelled" };

function Invitations({ grants }: { grants: UserGrants }) {
  const t = useTranslations();
  const locale = useLocale();
  const { api } = useSession();
  const [state, reload] = useLoad<InvitationListDto>(api ? () => api.invitationsList({}) : null, "invitations");
  const [creating, setCreating] = useState(false);
  const [f, setF] = useState({ email: "", schoolRole: "TEACHER", days: "7" });
  const [made, setMade] = useState<CreatedInvitationDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const days = /^\d{1,2}$/.test(f.days) ? Number(f.days) : 0;
  const columns: Column<InvitationDto>[] = [
    { key: "who", header: t("authEmailLabel"), render: (i) => <span dir="ltr">{i.email ?? i.phoneNumber}</span> },
    { key: "role", header: t("usrRole"), render: (i) => t(roleKey(i.role)) },
    { key: "status", header: t("reportStatus"), render: (i) => <Badge tone={INV_TONE[i.status] ?? "neutral"}>{t(INV_KEY[i.status] ?? "usrPending")}</Badge> },
    { key: "exp", header: t("usrExpires"), render: (i) => shortDate(i.expiresAt.slice(0, 10), locale) },
    ...(grants.update ? [{ key: "x", header: t("usrRevoke"), hideHeader: true, render: (i: InvitationDto) => (i.status === "PENDING" ? <Button size="compact" aria-label={`${t("usrRevoke")}: ${i.email}`} onClick={async () => { try { await api!.invitationsRevoke({ path: { id: i.id } }); reload(); } catch (e) { setError(errorKey(e)); } }}>{t("usrRevoke")}</Button> : null) }] : []),
  ];
  return (
    <div className="flex flex-col gap-4">
      {grants.create && !creating && <div><Button variant="primary" size="comfortable" icon="user-plus" onClick={() => { setCreating(true); setMade(null); }}>{t("usrNewInvitation")}</Button></div>}
      {made && (
        <Card headingLevel={2}>
          <div className="flex flex-col gap-2">
            <p className="text-body text-text-muted">{t("usrInvitationCode")}</p>
            <code className="select-all break-all rounded-md bg-surface-muted px-3 py-2 text-body-lg" dir="ltr">{made.token}</code>
          </div>
        </Card>
      )}
      {creating && (
        <Card title={t("usrNewInvitation")} headingLevel={2}>
          <form className="flex flex-col gap-3" onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            try {
              setMade(await api!.invitationsCreate({ body: { email: f.email.trim(), schoolRole: f.schoolRole as "TEACHER", expiresInDays: days } }));
              setCreating(false);
              reload();
            } catch (err) {
              setError(errorKey(err));
            } finally {
              setBusy(false);
            }
          }}>
            <p className="text-body text-text-muted">{t("usrInvitationIntro")}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <TextField size="comfortable" type="email" label={t("authEmailLabel")} value={f.email} onChange={(e) => setF((p) => ({ ...p, email: e.target.value }))} required />
              <SelectField label={t("usrRole")} value={f.schoolRole} onChange={(v) => setF((p) => ({ ...p, schoolRole: v }))} options={roleOptions(t, ROLES)} />
              <TextField size="comfortable" inputMode="numeric" label={t("usrExpiresIn")} value={f.days} onChange={(e) => setF((p) => ({ ...p, days: e.target.value }))} />
            </div>
            {error && <Banner tone="danger" title={t(error)} />}
            <div className="flex gap-2">
              <Button type="submit" variant="primary" size="comfortable" disabled={busy || !f.email.trim() || days < 1 || days > 30}>{t("actionSave")}</Button>
              <Button size="comfortable" onClick={() => setCreating(false)}>{t("actionCancel")}</Button>
            </div>
          </form>
        </Card>
      )}
      {error && !creating && <Banner tone="danger" title={t(error)} />}
      {state.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {state.status === "error" && <Failed messageKey={state.messageKey} retry={reload} />}
      {state.status === "ready" && state.data.items.length === 0 && <Card><EmptyState title={t("usrNoInvitations")} headingLevel={2} /></Card>}
      {state.status === "ready" && state.data.items.length > 0 && <DataTable caption={t("usrTabInvitations")} columns={columns} rows={state.data.items} rowKey={(i) => i.id} />}
    </div>
  );
}

/** Users and roles: who can sign in to this school and as what, accounts for staff, and invitations. Only the System administrator reaches it (ADR-0007). You cannot change your own membership (the gateway refuses it, so no buttons are shown on your row). */
export function Users({ selfId, grants }: { selfId: string; grants: UserGrants }) {
  const t = useTranslations();
  const [tab, setTab] = useState("members");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-title">{t("navMemberships")}</h1>
      <SegmentedControl label={t("navMemberships")} value={tab} onChange={setTab} options={[{ value: "members", label: t("usrTabMembers") }, { value: "invitations", label: t("usrTabInvitations") }]} />
      {tab === "members" ? <Members selfId={selfId} grants={grants} /> : <Invitations grants={grants} />}
    </div>
  );
}


