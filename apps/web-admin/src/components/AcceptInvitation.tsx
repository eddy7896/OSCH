"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Banner, Button, TextField } from "@oruschools/shared-ui";
import { errorKey, useSession } from "@oruschools/web-auth";
import { roleKey } from "@/lib/nav";

/** For a signed-in person who is not a member of this school yet: enter the invitation code they were given, and join. */
export function AcceptInvitation({ onJoined }: { onJoined: () => void }) {
  const t = useTranslations();
  const { api } = useSession();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState<string | null>(null);
  if (joined) return <Banner tone="success" title={t("usrJoined", { role: t(roleKey(joined)) })} />;
  if (!open) return <Button size="comfortable" variant="ghost" onClick={() => setOpen(true)}>{t("usrHaveCode")}</Button>;
  return (
    <form className="flex flex-col gap-3" onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true);
      setError(null);
      try {
        const r = await api!.invitationsAccept({ body: { token: code.trim() } });
        setJoined(r.role);
        onJoined();
      } catch (err) {
        setError(errorKey(err));
      } finally {
        setBusy(false);
      }
    }}>
      <TextField size="comfortable" label={t("usrEnterCode")} value={code} onChange={(e) => setCode(e.target.value)} dir="ltr" autoComplete="off" />
      {error && <Banner tone="danger" title={t(error)} />}
      <div><Button type="submit" variant="primary" size="comfortable" disabled={busy || !code.trim()}>{t("usrJoin")}</Button></div>
    </form>
  );
}
