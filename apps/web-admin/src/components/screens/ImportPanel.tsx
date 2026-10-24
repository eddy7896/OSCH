"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { ImportReportDto, ImportResultDto } from "@oruschools/api-client";
import { Banner, Button, Card } from "@oruschools/shared-ui";
import { errorKey, useSession } from "@oruschools/web-auth";
import { Saved } from "./parts";

/** The most a person may import in one file is bounded by the gateway (1 MB); a bigger file is refused there with a clear error. */
const MAX_PROBLEMS_SHOWN = 20;

/**
 * Bulk import from a CSV file for students or staff. The file is checked first (a dry run that writes nothing), the person sees what is
 * wrong or that it is ready, and only then can they import. The gateway refuses a file with any problem and a file already imported.
 */
export function ImportPanel({ kind, onDone, onCancel }: { kind: "students" | "staff"; onDone: () => void; onCancel: () => void }) {
  const t = useTranslations();
  const { api } = useSession();
  const [csv, setCsv] = useState<string | null>(null);
  const [report, setReport] = useState<ImportReportDto | null>(null);
  const [result, setResult] = useState<ImportResultDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = async () => {
    if (csv === null) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setReport(kind === "students" ? await api!.importsStudentsDryRun({ body: { csv } }) : await api!.importsStaffDryRun({ body: { csv } }));
    } catch (e) {
      setError(errorKey(e));
    } finally {
      setBusy(false);
    }
  };
  const run = async () => {
    if (csv === null) return;
    setBusy(true);
    setError(null);
    try {
      const r = kind === "students" ? await api!.importsStudents({ body: { csv } }) : await api!.importsStaff({ body: { csv } });
      setResult(r);
      setReport(null);
      onDone();
    } catch (e) {
      setError(errorKey(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card title={t("setImport")} headingLevel={2}>
      <div className="flex flex-col gap-3">
        <p className="text-body text-text-muted">{t("setImportIntro")}</p>
        <div className="flex flex-col gap-2">
          <label htmlFor={`csv-${kind}`} className="text-label">{t("setChooseFile")}</label>
          <input
            id={`csv-${kind}`}
            type="file"
            accept=".csv,text/csv"
            className="text-body"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              setReport(null);
              setResult(null);
              setCsv(file ? await file.text() : null);
            }}
          />
        </div>
        {error && <Banner tone="danger" title={t(error)} />}
        {report && (
          <div className="flex flex-col gap-2">
            <Banner tone={report.canImport ? "success" : "warning"} title={t("setCheckResult", { valid: report.validRows, total: report.totalRows, errors: report.errorRows })} />
            {report.alreadyImported && <Banner tone="warning" title={t("setAlreadyImported")} />}
            {report.columns.missingRequired.length > 0 && <p className="text-body text-danger-fg">{t("setMissingColumns", { names: report.columns.missingRequired.join(", ") })}</p>}
            {report.problems.length > 0 && (
              <ul className="flex flex-col gap-1 text-body">
                {report.problems.slice(0, MAX_PROBLEMS_SHOWN).map((p, i) => (
                  <li key={i}>{t("setProblemLine", { row: p.row, column: p.column ?? "", rule: p.rule })}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {result && (
          <div className="flex flex-col gap-2">
            <Saved>{t("setImportDone", { count: result.createdCount })}</Saved>
            {result.failedCount > 0 && <Banner tone="warning" title={t("setImportFailed", { count: result.failedCount })} />}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {report?.canImport && !report.alreadyImported ? (
            <Button variant="primary" size="comfortable" disabled={busy} onClick={() => void run()}>{t("setImportNow", { count: report.validRows })}</Button>
          ) : (
            <Button variant="primary" size="comfortable" disabled={busy || csv === null} onClick={() => void check()}>{t("setCheckFile")}</Button>
          )}
          <Button size="comfortable" onClick={onCancel}>{t("actionCancel")}</Button>
        </div>
      </div>
    </Card>
  );
}
