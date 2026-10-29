"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { GeofenceDto, SchoolProfileDto } from "@oruschools/api-client";
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

/** Where the school is, for the staff check-in (ADR-0014 decision 9): a point, the grounds' radius and a margin. Nothing set means nobody is asked for a reason. */
function Location({ canEdit }: { canEdit: boolean }) {
  const { api } = useSession();
  // Read with the settings grant. If that fails the form simply starts empty and saving still works.
  const [current, setCurrent] = useState<GeofenceDto | null | undefined>(undefined);
  useEffect(() => {
    if (!api) return;
    let live = true;
    Promise.resolve().then(() => api.schoolGeofence({})).then((g) => live && setCurrent(g), () => live && setCurrent(null));
    return () => { live = false; };
  }, [api]);
  return current === undefined ? null : <LocationForm initial={current} canEdit={canEdit} />;
}

function LocationForm({ initial, canEdit }: { initial: GeofenceDto | null; canEdit: boolean }) {
  const t = useTranslations();
  const { api } = useSession();
  const [current, setCurrent] = useState<GeofenceDto | null>(initial);
  const [f, setF] = useState(initial?.configured ? { lat: String(initial.lat), lng: String(initial.lng), radiusM: String(initial.radiusM), marginM: String(initial.marginM) } : { lat: "", lng: "", radiusM: "", marginM: "50" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "saved" | "error"; text: string } | null>(null);
  const num = (s: string) => (s.trim() === "" ? NaN : Number(s));
  const valid = num(f.lat) >= -90 && num(f.lat) <= 90 && num(f.lng) >= -180 && num(f.lng) <= 180 && Number.isInteger(num(f.radiusM)) && num(f.radiusM) >= 10 && num(f.radiusM) <= 2000 && (f.marginM.trim() === "" || (Number.isInteger(num(f.marginM)) && num(f.marginM) >= 0 && num(f.marginM) <= 500));
  const set = (k: keyof typeof f) => (v: string) => { setF((p) => ({ ...p, [k]: v })); setMessage(null); };
  const run = async (what: "set" | "clear") => {
    setBusy(true);
    setMessage(null);
    try {
      const g = what === "set"
        ? await api!.schoolSetGeofence({ body: { lat: num(f.lat), lng: num(f.lng), radiusM: num(f.radiusM), ...(f.marginM.trim() === "" ? {} : { marginM: num(f.marginM) }) } })
        : await api!.schoolClearGeofence({});
      setCurrent(g);
      if (what === "clear") setF({ lat: "", lng: "", radiusM: "", marginM: "50" });
      setMessage({ tone: "saved", text: t(what === "set" ? "setGeoSaved" : "setGeoCleared") });
    } catch (err) {
      setMessage({ tone: "error", text: t(errorKey(err)) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card title={t("setGeoTitle")} headingLevel={2}>
      <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); void run("set"); }}>
        <p className="text-body text-text-muted">{t("setGeoNote")}</p>
        {current && (current.configured
          ? <p className="text-body">{t("setGeoNow", { lat: String(current.lat), lng: String(current.lng), radius: String(current.radiusM), margin: String(current.marginM) })}</p>
          : <p className="text-body">{t("setGeoNone")}</p>)}
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField size="comfortable" label={t("setGeoLat")} inputMode="decimal" dir="ltr" value={f.lat} disabled={!canEdit} onChange={(e) => set("lat")(e.target.value)} />
          <TextField size="comfortable" label={t("setGeoLng")} inputMode="decimal" dir="ltr" value={f.lng} disabled={!canEdit} onChange={(e) => set("lng")(e.target.value)} />
          <TextField size="comfortable" label={t("setGeoRadius")} inputMode="numeric" dir="ltr" value={f.radiusM} disabled={!canEdit} onChange={(e) => set("radiusM")(e.target.value)} />
          <TextField size="comfortable" label={t("setGeoMargin")} inputMode="numeric" dir="ltr" value={f.marginM} disabled={!canEdit} onChange={(e) => set("marginM")(e.target.value)} />
        </div>
        {!valid && (f.lat !== "" || f.lng !== "" || f.radiusM !== "") && <p className="text-caption text-text-muted">{t("setGeoInvalid")}</p>}
        {message?.tone === "saved" && <Saved>{message.text}</Saved>}
        {message?.tone === "error" && <Banner tone="danger" title={message.text} />}
        {canEdit && (
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="primary" size="comfortable" disabled={busy || !valid}>{t("setGeoSave")}</Button>
            <Button size="comfortable" disabled={busy || current?.configured === false} onClick={() => void run("clear")}>{t("setGeoClear")}</Button>
          </div>
        )}
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
      {state.status === "ready" && <Location canEdit={canEdit} />}
    </div>
  );
}
