"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { AcademicYearListDto, ClassDto, ClassListDto, GradeLevelListDto, SubjectListDto } from "@oruschools/api-client";
import { Badge, Banner, Button, Card, EmptyState, SegmentedControl, TextField } from "@oruschools/shared-ui";
import { errorKey, useSession } from "@oruschools/web-auth";
import { shortDate } from "@/lib/display";
import { useLoad } from "@/lib/use-load";
import { DataTable, type Column } from "./DataTable";
import { ConfirmBox, Failed, Saved, SelectField } from "./parts";

export interface AcademicsGrants {
  create: boolean;
  /** Delete (and, for years, the activation which is an update): the role with the academics delete grant. */
  remove: boolean;
  update: boolean;
}

function ClassesTab({ grants }: { grants: AcademicsGrants }) {
  const t = useTranslations();
  const { api } = useSession();
  const [state, reload] = useLoad<ClassListDto>(api ? () => api.academicsClasses({}) : null, "classes");
  const [levels] = useLoad<GradeLevelListDto>(api && grants.create ? () => api.academicsLevels({}) : null, "levels");
  const [adding, setAdding] = useState(false);
  const [saved, setSaved] = useState(false);
  const [level, setLevel] = useState("");
  const [section, setSection] = useState("");
  const [capacity, setCapacity] = useState("40");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cap = /^\d{1,3}$/.test(capacity) ? Number(capacity) : 0;
  const columns: Column<ClassDto>[] = [
    { key: "name", header: t("peoClass"), render: (r) => r.name },
    { key: "level", header: t("peoLevel"), render: (r) => r.gradeLevel.name },
    { key: "section", header: t("peoSection"), render: (r) => r.section },
    { key: "capacity", header: t("peoCapacity"), numeric: true, render: (r) => r.capacity },
    ...(grants.remove ? [{ key: "x", header: t("hrpRemove"), hideHeader: true, render: (r: ClassDto) => <Button size="compact" variant="ghost" aria-label={`${t("hrpRemove")}: ${r.name}`} onClick={async () => { try { await api!.academicsDeleteClass({ path: { id: r.id } }); reload(); } catch (e) { setError(errorKey(e)); } }}>{t("hrpRemove")}</Button> }] : []),
  ];
  return (
    <div className="flex flex-col gap-4">
      {grants.create && !adding && <div><Button variant="primary" size="comfortable" icon="plus" onClick={() => { setAdding(true); setSaved(false); }}>{t("setAddClass")}</Button></div>}
      {saved && <Saved>{t("setClassAdded")}</Saved>}
      {adding && (
        <Card title={t("setAddClass")} headingLevel={2}>
          <form className="flex flex-wrap items-end gap-3" onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            try {
              await api!.academicsCreateClass({ body: { gradeLevelId: level, section: section.trim(), capacity: cap } });
              setAdding(false);
              setSaved(true);
              setSection("");
              reload();
            } catch (err) {
              setError(errorKey(err));
            } finally {
              setBusy(false);
            }
          }}>
            <SelectField label={t("peoLevel")} value={level} onChange={setLevel} options={[{ value: "", label: "" }, ...(levels.status === "ready" ? levels.data.items.map((l) => ({ value: l.id, label: l.name })) : [])]} />
            <TextField size="comfortable" label={t("peoSection")} hint={t("setSectionHint")} value={section} onChange={(e) => setSection(e.target.value)} />
            <TextField size="comfortable" inputMode="numeric" label={t("peoCapacity")} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
            <Button type="submit" variant="primary" size="comfortable" disabled={busy || !level || !section.trim() || cap < 1}>{t("actionSave")}</Button>
            <Button size="comfortable" onClick={() => setAdding(false)}>{t("actionCancel")}</Button>
          </form>
        </Card>
      )}
      {error && <Banner tone="danger" title={t(error)} />}
      {state.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {state.status === "error" && <Failed messageKey={state.messageKey} retry={reload} />}
      {state.status === "ready" && state.data.items.length === 0 && <Card><EmptyState title={t("peoNoClassesTitle")} headingLevel={2} /></Card>}
      {state.status === "ready" && state.data.items.length > 0 && <DataTable caption={t("navClasses")} columns={columns} rows={state.data.items} rowKey={(r) => r.id} />}
    </div>
  );
}

function SubjectsTab({ grants }: { grants: AcademicsGrants }) {
  const t = useTranslations();
  const { api } = useSession();
  const [state, reload] = useLoad<SubjectListDto>(api ? () => api.academicsSubjects({}) : null, "subjects");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      {grants.create && (
        <Card title={t("setAddSubject")} headingLevel={2}>
          <form className="flex flex-wrap items-end gap-3" onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            setSaved(false);
            try {
              await api!.academicsCreateSubject({ body: { name: name.trim(), code: code.trim() } });
              setName("");
              setCode("");
              setSaved(true);
              reload();
            } catch (err) {
              setError(errorKey(err));
            } finally {
              setBusy(false);
            }
          }}>
            <TextField size="comfortable" label={t("setSubjectName")} value={name} onChange={(e) => setName(e.target.value)} />
            <TextField size="comfortable" label={t("setSubjectCode")} value={code} onChange={(e) => setCode(e.target.value)} />
            <Button type="submit" variant="primary" size="comfortable" disabled={busy || !name.trim() || !code.trim()}>{t("setAddSubject")}</Button>
          </form>
        </Card>
      )}
      {saved && <Saved>{t("setSubjectAdded")}</Saved>}
      {error && <Banner tone="danger" title={t(error)} />}
      {state.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {state.status === "error" && <Failed messageKey={state.messageKey} retry={reload} />}
      {state.status === "ready" && state.data.items.length === 0 && <Card><EmptyState title={t("setNoSubjects")} headingLevel={2} /></Card>}
      {state.status === "ready" && state.data.items.length > 0 && (
        <DataTable
          caption={t("setTabSubjects")}
          columns={[
            { key: "name", header: t("setSubjectName"), render: (r) => r.name },
            { key: "code", header: t("setSubjectCode"), render: (r) => r.code },
            ...(grants.remove ? [{ key: "x", header: t("hrpRemove"), hideHeader: true, render: (r: { id: string; name: string }) => <Button size="compact" variant="ghost" aria-label={`${t("hrpRemove")}: ${r.name}`} onClick={async () => { try { await api!.academicsDeleteSubject({ path: { id: r.id } }); reload(); } catch (e) { setError(errorKey(e)); } }}>{t("hrpRemove")}</Button> }] : []),
          ]}
          rows={state.data.items}
          rowKey={(r) => r.id}
        />
      )}
    </div>
  );
}

function YearsTab({ grants }: { grants: AcademicsGrants }) {
  const t = useTranslations();
  const locale = useLocale();
  const { api } = useSession();
  const [state, reload] = useLoad<AcademicYearListDto>(api ? () => api.academicsYears({}) : null, "years");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [activating, setActivating] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      {grants.create && !adding && <div><Button variant="primary" size="comfortable" icon="plus" onClick={() => { setAdding(true); setSaved(false); }}>{t("setNewYear")}</Button></div>}
      {saved && <Saved>{t("setYearAdded")}</Saved>}
      {adding && (
        <Card title={t("setNewYear")} headingLevel={2}>
          <form className="flex flex-wrap items-end gap-3" onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            try {
              await api!.academicsCreateYear({ body: { name: name.trim(), startDate: start, endDate: end } });
              setAdding(false);
              setSaved(true);
              setName("");
              reload();
            } catch (err) {
              setError(errorKey(err));
            } finally {
              setBusy(false);
            }
          }}>
            <TextField size="comfortable" label={t("setTabYears")} hint={t("setYearName")} value={name} onChange={(e) => setName(e.target.value)} />
            <TextField size="comfortable" type="date" label={t("setStartDate")} value={start} onChange={(e) => setStart(e.target.value)} />
            <TextField size="comfortable" type="date" label={t("setEndDate")} value={end} onChange={(e) => setEnd(e.target.value)} />
            <Button type="submit" variant="primary" size="comfortable" disabled={busy || !name.trim() || !start || !end}>{t("actionSave")}</Button>
            <Button size="comfortable" onClick={() => setAdding(false)}>{t("actionCancel")}</Button>
          </form>
        </Card>
      )}
      {activating && (
        <ConfirmBox question={t("setConfirmActivate", { name: activating.name })}>
          <Button variant="primary" size="comfortable" disabled={busy} onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await api!.academicsActivateYear({ path: { id: activating.id } });
              setActivating(null);
              reload();
            } catch (e) {
              setError(errorKey(e));
            } finally {
              setBusy(false);
            }
          }}>{t("hrpConfirm")}</Button>
          <Button size="comfortable" onClick={() => setActivating(null)}>{t("actionCancel")}</Button>
        </ConfirmBox>
      )}
      {error && <Banner tone="danger" title={t(error)} />}
      {state.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {state.status === "error" && <Failed messageKey={state.messageKey} retry={reload} />}
      {state.status === "ready" && (
        <DataTable
          caption={t("setTabYears")}
          columns={[
            { key: "name", header: t("setTabYears"), render: (r) => r.name },
            { key: "start", header: t("setStartDate"), render: (r) => shortDate(r.startDate, locale) },
            { key: "end", header: t("setEndDate"), render: (r) => shortDate(r.endDate, locale) },
            { key: "status", header: t("reportStatus"), render: (r) => (r.status === "ACTIVE" ? <Badge tone="success">{t("statusActive")}</Badge> : grants.update ? <Button size="compact" aria-label={`${t("setMakeActive")}: ${r.name}`} onClick={() => setActivating({ id: r.id, name: r.name })}>{t("setMakeActive")}</Button> : null) },
          ]}
          rows={state.data.items}
          rowKey={(r) => r.id}
        />
      )}
    </div>
  );
}

/** Classes and subjects: the classes, the subjects, and the academic years (exactly one is active). Adding, removing and activating follow the academics grants. */
export function Classes({ grants = { create: false, remove: false, update: false } }: { grants?: AcademicsGrants }) {
  const t = useTranslations();
  const [tab, setTab] = useState("classes");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-title">{t("navClasses")}</h1>
      <SegmentedControl label={t("navClasses")} value={tab} onChange={setTab} options={[{ value: "classes", label: t("setTabClasses") }, { value: "subjects", label: t("setTabSubjects") }, { value: "years", label: t("setTabYears") }]} />
      {tab === "classes" && <ClassesTab grants={grants} />}
      {tab === "subjects" && <SubjectsTab grants={grants} />}
      {tab === "years" && <YearsTab grants={grants} />}
    </div>
  );
}
