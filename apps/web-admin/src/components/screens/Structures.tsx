"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { FeeStructureDto, FeeStructureListDto, GradeLevelListDto } from "@oruschools/api-client";
import { Banner, Button, Card, EmptyState, TextField } from "@oruschools/shared-ui";
import { errorKey, useSession } from "@oruschools/web-auth";
import { rupees, rupeesToMinor, shortDate, todayIso } from "@/lib/display";
import { useLoad } from "@/lib/use-load";
import { Failed, Saved, SelectField } from "./parts";

interface Row { label: string; amount: string; due: string }
const blank = (): Row => ({ label: "", amount: "", due: todayIso() });

function AddFee({ structureId, onDone, onCancel }: { structureId: string; onDone: () => void; onCancel: () => void }) {
  const t = useTranslations();
  const { api } = useSession();
  const [name, setName] = useState("");
  const [rows, setRows] = useState<Row[]>([blank()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (i: number, k: keyof Row, v: string) => setRows((p) => p.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const parsed = rows.map((r) => ({ ...r, minor: rupeesToMinor(r.amount) }));
  const valid = name.trim() && parsed.every((r) => r.minor && r.due);
  return (
    <form className="flex flex-col gap-3" onSubmit={async (e) => {
      e.preventDefault();
      if (!valid) return;
      setBusy(true);
      setError(null);
      try {
        await api!.feesCreateItem({ path: { id: structureId }, body: { name: name.trim(), instalments: parsed.map((r) => ({ ...(r.label.trim() ? { label: r.label.trim() } : {}), amountMinor: r.minor!, dueDate: r.due })) } });
        onDone();
      } catch (err) {
        setError(errorKey(err));
      } finally {
        setBusy(false);
      }
    }}>
      <TextField size="comfortable" label={t("feeFeeName")} value={name} onChange={(e) => setName(e.target.value)} />
      <p className="text-label">{t("feeInstalments")}</p>
      {rows.map((r, i) => (
        <div key={i} className="grid gap-3 sm:grid-cols-3">
          <TextField size="comfortable" label={t("feeInstalmentLabel")} value={r.label} onChange={(e) => set(i, "label", e.target.value)} />
          <TextField size="comfortable" inputMode="decimal" label={t("hrpAmount")} value={r.amount} onChange={(e) => set(i, "amount", e.target.value)} />
          <TextField size="comfortable" type="date" label={t("reportDueDate")} value={r.due} onChange={(e) => set(i, "due", e.target.value)} />
        </div>
      ))}
      <div><Button size="comfortable" onClick={() => setRows((p) => [...p, blank()])}>{t("feeAddInstalment")}</Button></div>
      {error && <Banner tone="danger" title={t(error)} />}
      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="comfortable" disabled={busy || !valid}>{t("actionSave")}</Button>
        <Button size="comfortable" onClick={onCancel}>{t("actionCancel")}</Button>
      </div>
    </form>
  );
}

function Structure({ s, canCreate, onChanged }: { s: FeeStructureDto; canCreate: boolean; onChanged: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  return (
    <Card title={s.name} subtitle={`${s.gradeLevel.name}, ${s.academicYear.name}`} headingLevel={2}>
      <div className="flex flex-col gap-4">
        {s.items.length === 0 && <p className="text-body text-text-muted">{t("feeNoItems")}</p>}
        {s.items.map((item) => (
          <div key={item.id}>
            <div className="flex justify-between gap-3 text-body font-semibold"><span>{item.name}</span><span className="tabular-nums">{rupees(item.totalMinor, locale)}</span></div>
            <ul className="mt-1 flex flex-col gap-1 text-caption text-text-muted">
              {item.instalments.map((i) => (
                <li key={i.id} className="flex justify-between gap-3"><span>{i.label ?? i.sequence}, {shortDate(i.dueDate, locale)}</span><span className="tabular-nums">{rupees(i.amountMinor, locale)}</span></li>
              ))}
            </ul>
          </div>
        ))}
        {s.items.length > 0 && <div className="flex justify-between gap-3 border-t border-border pt-2 text-body font-semibold"><span>{t("feeStructureTotal")}</span><span className="tabular-nums">{rupees(s.totalMinor, locale)}</span></div>}
        {added && <Saved>{t("feeFeeAdded")}</Saved>}
        {canCreate && !adding && <div><Button size="comfortable" onClick={() => { setAdding(true); setAdded(false); }}>{t("feeAddFee")}</Button></div>}
        {adding && <AddFee structureId={s.id} onCancel={() => setAdding(false)} onDone={() => { setAdding(false); setAdded(true); onChanged(); }} />}
      </div>
    </Card>
  );
}

/** The fee structures tab: what each class level pays (fees and their instalments), and for roles that may create, a new structure and new fees. */
export function Structures({ canCreate }: { canCreate: boolean }) {
  const t = useTranslations();
  const { api } = useSession();
  const [state, reload] = useLoad<FeeStructureListDto>(api ? () => api.feesStructures({}) : null, "structures");
  const [levels] = useLoad<GradeLevelListDto>(api && canCreate ? () => api.academicsLevels({}) : null, "levels");
  const [adding, setAdding] = useState(false);
  const [level, setLevel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      {canCreate && !adding && <div><Button variant="primary" size="comfortable" icon="plus" onClick={() => { setAdding(true); setCreated(false); }}>{t("feeNewStructure")}</Button></div>}
      {created && <Saved>{t("feeStructureCreated")}</Saved>}
      {adding && (
        <Card title={t("feeNewStructure")} headingLevel={2}>
          <form className="flex flex-wrap items-end gap-3" onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            try {
              await api!.feesCreateStructure({ body: { gradeLevelId: level } });
              setAdding(false);
              setCreated(true);
              reload();
            } catch (err) {
              setError(errorKey(err));
            } finally {
              setBusy(false);
            }
          }}>
            <SelectField label={t("peoLevel")} value={level} onChange={setLevel} options={[{ value: "", label: "" }, ...(levels.status === "ready" ? levels.data.items.map((l) => ({ value: l.id, label: l.name })) : [])]} />
            <Button type="submit" variant="primary" size="comfortable" disabled={busy || !level}>{t("actionSave")}</Button>
            <Button size="comfortable" onClick={() => setAdding(false)}>{t("actionCancel")}</Button>
          </form>
          {error && <div className="mt-3"><Banner tone="danger" title={t(error)} /></div>}
        </Card>
      )}
      {state.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {state.status === "error" && <Failed messageKey={state.messageKey} retry={reload} />}
      {state.status === "ready" && state.data.items.length === 0 && <Card><EmptyState title={t("feeNoStructuresTitle")} headingLevel={2} /></Card>}
      {state.status === "ready" && state.data.items.map((s) => <Structure key={s.id} s={s} canCreate={canCreate} onChanged={reload} />)}
    </div>
  );
}
