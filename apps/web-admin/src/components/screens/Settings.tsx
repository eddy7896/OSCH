"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { SchoolProfileDto } from "@oruschools/api-client";
import { LOCALES } from "@oruschools/i18n";
import { Banner, Button, Card, TextField } from "@oruschools/shared-ui";
import { errorKey, useSession } from "@oruschools/web-auth";
import { useLoad } from "@/lib/use-load";
import { Failed, Saved, SelectField } from "./parts";

function Form({ profile, canEdit, onSaved }: { profile: SchoolProfileDto; canEdit: boolean; onSaved: () => void }) {
  const t = useTranslations();
  const { api } = useSession();
  const [f, setF] = useState({ name: profile.name, address: profile.address ?? "", contactPhone: profile.contactPhone ?? "", contactEmail: profile.contactEmail ?? "", primaryColor: profile.primaryColor ?? "", defaultLanguage: profile.defaultLanguage });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => { setF((p) => ({ ...p, [k]: v })); setSaved(false); };
  // Only what changed is sent (the gateway wants at least one field).
  const changes = Object.fromEntries(Object.entries(f).filter(([k, v]) => v.trim() !== "" && v.trim() !== String((profile as unknown as Record<string, string | null>)[k] ?? "")).map(([k, v]) => [k, v.trim()]));
  return (
    <Card title={t("setProfileTitle")} headingLevel={2}>
      <form className="flex flex-col gap-3" onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await api!.schoolUpdate({ body: changes });
          setSaved(true);
          onSaved();
        } catch (err) {
          setError(errorKey(err));
        } finally {
          setBusy(false);
        }
      }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField size="comfortable" label={t("saasSchoolName")} value={f.name} disabled={!canEdit} onChange={(e) => set("name")(e.target.value)} />
          <TextField size="comfortable" label={t("saasSchoolSubdomain")} value={profile.subDomain} disabled readOnly dir="ltr" />
          <TextField size="comfortable" label={t("peoAddress")} value={f.address} disabled={!canEdit} onChange={(e) => set("address")(e.target.value)} />
          <TextField size="comfortable" type="tel" label={t("authPhoneLabel")} hint={t("authPhoneHint")} value={f.contactPhone} disabled={!canEdit} onChange={(e) => set("contactPhone")(e.target.value)} />
          <TextField size="comfortable" type="email" label={t("authEmailLabel")} value={f.contactEmail} disabled={!canEdit} onChange={(e) => set("contactEmail")(e.target.value)} />
          <TextField size="comfortable" label={t("setBrandColour")} hint={t("setBrandHint")} value={f.primaryColor} disabled={!canEdit} onChange={(e) => set("primaryColor")(e.target.value)} dir="ltr" />
          <SelectField label={t("saasSchoolLanguage")} value={f.defaultLanguage} onChange={set("defaultLanguage")} options={LOCALES.map((l) => ({ value: l.code, label: l.native }))} />
        </div>
        {saved && <Saved>{t("setProfileSaved")}</Saved>}
        {error && <Banner tone="danger" title={t(error)} />}
        {canEdit && <div><Button type="submit" variant="primary" size="comfortable" disabled={busy || Object.keys(changes).length === 0}>{t("actionSave")}</Button></div>}
      </form>
    </Card>
  );
}

/** School settings: the profile (name, address, contacts, brand colour, default language). The web address cannot be changed here. Read-only for roles without the update grant. */
export function Settings({ canEdit }: { canEdit: boolean }) {
  const t = useTranslations();
  const { api } = useSession();
  const [state, reload] = useLoad<SchoolProfileDto>(api ? () => api.schoolProfile({}) : null, "profile");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-title">{t("navSettings")}</h1>
      {state.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {state.status === "error" && <Failed messageKey={state.messageKey} retry={reload} />}
      {state.status === "ready" && <Form key={JSON.stringify(state.data)} profile={state.data} canEdit={canEdit} onSaved={reload} />}
    </div>
  );
}
