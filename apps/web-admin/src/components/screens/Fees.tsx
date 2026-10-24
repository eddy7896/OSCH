"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { SegmentedControl } from "@oruschools/shared-ui";
import { Invoices, type FeeGrants } from "./Invoices";
import { Receipts } from "./Receipts";
import { Structures } from "./Structures";

/** Fees and payments: invoices (with payments), receipts, and the fee structures they come from. */
export function Fees({ grants }: { grants: FeeGrants }) {
  const t = useTranslations();
  const [tab, setTab] = useState("invoices");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-title">{t("navFees")}</h1>
      <SegmentedControl label={t("navFees")} value={tab} onChange={setTab} options={[{ value: "invoices", label: t("feeTabInvoices") }, { value: "receipts", label: t("feeTabReceipts") }, { value: "structures", label: t("feeTabStructures") }]} />
      {tab === "invoices" && <Invoices grants={grants} />}
      {tab === "receipts" && <Receipts />}
      {tab === "structures" && <Structures canCreate={grants.create} />}
    </div>
  );
}
