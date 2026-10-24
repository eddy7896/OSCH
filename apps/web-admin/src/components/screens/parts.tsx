"use client";

import type { ReactNode } from "react";
import { useId } from "react";
import { useTranslations } from "next-intl";
import { Banner, Button } from "@oruschools/shared-ui";

export function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (page: number) => void }) {
  const t = useTranslations();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-body text-text-muted">{t("webPageOf", { page, pages })}</span>
      <div className="flex gap-2">
        <Button size="comfortable" disabled={page <= 1} onClick={() => onPage(page - 1)}>{t("webPrevious")}</Button>
        <Button size="comfortable" disabled={page >= pages} onClick={() => onPage(page + 1)}>{t("webNext")}</Button>
      </div>
    </div>
  );
}

export function Failed({ messageKey, retry }: { messageKey: string; retry: () => void }) {
  const t = useTranslations();
  // Refused for this role (the screen should not have been reachable): say so plainly; trying again cannot help.
  if (messageKey === "errorForbidden") return <Banner tone="warning" title={t("errorForbidden")} />;
  return (
    <Banner tone="danger" title={t("webLoadFailed")} action={<Button size="comfortable" icon="refresh" onClick={retry}>{t("actionRetry")}</Button>}>
      {t(messageKey)}
    </Banner>
  );
}


/** A labelled native select in the product's field style (the design system has no select yet; flagged for the design owner). */
export function SelectField({ label, value, onChange, options, className }: { label: string; value: string; onChange: (value: string) => void; options: ReadonlyArray<{ value: string; label: string }>; className?: string }) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <label htmlFor={id} className="text-label text-text">{label}</label>
      <select id={id} className="min-h-10 rounded-md border border-border-strong bg-surface px-3 text-body text-text" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

/** A confirmation that something was saved: polite status, with what happened as a fact. */
export function Saved({ children }: { children: ReactNode }) {
  return <p role="status" className="rounded-md bg-success-bg px-3 py-2 text-body text-success-fg">{children}</p>;
}

/**
 * Asks before something that cannot be undone. A warning-toned block with the question and the actions under it. (Not a Banner:
 * a Banner's text styles reach into a button's label and spoil its colour, and a Banner is one line of news, not a question.)
 */
export function ConfirmBox({ question, children }: { question: string; children: ReactNode }) {
  return (
    <div role="alertdialog" aria-label={question} className="oru-tone--warning flex flex-col gap-3 rounded-lg p-4">
      <p className="text-body-lg font-semibold">{question}</p>
      <div className="flex flex-wrap items-end gap-3">{children}</div>
    </div>
  );
}
