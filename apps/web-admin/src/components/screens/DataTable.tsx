import type { ReactNode } from "react";

export interface Column<R> {
  key: string;
  /** Already translated. */
  header: string;
  render: (row: R) => ReactNode;
  /** Amounts and counts: aligned to the far side, in tabular digits. */
  numeric?: boolean;
}

/**
 * A plain, accessible table in the product's tokens (rows are not links; a screen that needs a row action adds a column).
 * There is no table in the design system yet, so this is local to web-admin and flagged for the design owner.
 * Logical alignment only (text-start / text-end), so right-to-left mirrors by itself.
 */
export function DataTable<R>({ caption, columns, rows, rowKey, footer }: { caption: string; columns: Column<R>[]; rows: R[]; rowKey: (row: R) => string; footer?: ReactNode[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full border-collapse text-body">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="bg-surface-muted">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={`px-3 py-2 text-caption font-semibold text-text-muted ${c.numeric ? "text-end" : "text-start"}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-t border-border">
              {columns.map((c) => (
                <td key={c.key} className={`px-3 py-2 align-top ${c.numeric ? "text-end tabular-nums" : "text-start"}`}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer && (
          <tfoot>
            <tr className="border-t-2 border-border-strong font-semibold">
              {footer.map((cell, i) => (
                <td key={columns[i]?.key ?? i} className={`px-3 py-2 ${columns[i]?.numeric ? "text-end tabular-nums" : "text-start"}`}>
                  {cell}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
