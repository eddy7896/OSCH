"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { NotificationListDto, PreferenceListDto } from "@oruschools/api-client";
import { Badge, Button, Checkbox, Icon } from "@oruschools/shared-ui";
import { useSession } from "@oruschools/web-auth";
import { shortDate } from "@/lib/display";

const REFRESH_MS = 60_000;

/**
 * The bell in the top bar (P3-11e): how many notifications are unread, and the inbox in a panel. Everyone has one (it is the person's own: what is addressed to them or to their
 * role). It never shows an error banner, because a notification that did not load must not get in the way of the work; the panel says so quietly.
 */
export function NotificationBell() {
  const t = useTranslations();
  const locale = useLocale();
  const { api } = useSession();
  const [data, setData] = useState<NotificationListDto | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<PreferenceListDto | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  const load = () => {
    if (!api) return;
    api.notificationsList({ query: { limit: 30 } }).then((d) => { setData(d); setFailed(false); }, () => setFailed(true));
  };
  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);
  useEffect(() => {
    if (!open || !api) return;
    load();
    api.notificationsPreferences({}).then(setPrefs, () => undefined);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    panel.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const unread = data?.unreadCount ?? 0;
  const read = async (id: string) => {
    setData((d) => (d ? { unreadCount: Math.max(0, d.unreadCount - (d.items.find((n) => n.id === id && !n.read) ? 1 : 0)), items: d.items.map((n) => (n.id === id ? { ...n, read: true } : n)) } : d));
    await api?.notificationsRead({ path: { id } }).catch(() => undefined);
  };
  const readAll = async () => {
    setData((d) => (d ? { unreadCount: 0, items: d.items.map((n) => ({ ...n, read: true })) } : d));
    await api?.notificationsReadAll({}).catch(() => undefined);
  };
  const toggle = async (category: string, enabled: boolean) => {
    setPrefs((p) => (p ? { items: p.items.map((i) => (i.category === category ? { ...i, enabled } : i)) } : p));
    await api?.notificationsSetPreference({ path: { category: category as never }, body: { enabled } }).catch(() => undefined);
    load();
  };

  return (
    <div className="relative">
      <button type="button" aria-haspopup="dialog" aria-expanded={open} aria-label={unread > 0 ? `${t("ntBell")}, ${t("ntBellUnread", { count: unread })}` : t("ntBell")} onClick={() => setOpen((o) => !o)} className="relative grid size-12 place-items-center rounded-md text-text hover:bg-surface-muted">
        <Icon name="bell" size={24} />
        {unread > 0 && <span className="absolute end-1 top-1"><Badge count={unread} label={t("ntUnread")} /></span>}
      </button>
      {open && (
        <div ref={panel} tabIndex={-1} role="dialog" aria-label={t("ntBell")} className="absolute end-0 z-20 mt-2 flex max-h-[32rem] w-[min(24rem,calc(100vw-2rem))] flex-col gap-3 overflow-y-auto rounded-lg border border-border bg-surface p-4 shadow-raised">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-body-lg font-semibold">{t("ntBell")}</h2>
            <div className="flex gap-2">
              {unread > 0 && <Button size="compact" variant="ghost" onClick={() => void readAll()}>{t("ntMarkAll")}</Button>}
              <Button size="compact" variant="ghost" onClick={() => setOpen(false)}>{t("ntClose")}</Button>
            </div>
          </div>
          {failed && !data && <p className="text-body text-text-muted">{t("ntLoadFailed")}</p>}
          {data && data.items.length === 0 && <p className="text-body text-text-muted">{t("ntEmpty")}</p>}
          {data && data.items.length > 0 && (
            <ul className="flex flex-col gap-2">
              {data.items.map((n) => (
                <li key={n.id}>
                  <button type="button" onClick={() => void read(n.id)} className={`w-full rounded-md border px-3 py-2 text-start ${n.read ? "border-border bg-surface" : "border-primary bg-primary-soft"}`}>
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-body font-semibold">{!n.read && <span className="sr-only">{t("ntUnread")}: </span>}{n.title}</span>
                      <span className="shrink-0 text-caption text-text-muted">{shortDate(n.createdAt.slice(0, 10), locale)}</span>
                    </span>
                    {n.body && <span className="mt-1 block text-body text-text-muted">{n.body}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {prefs && (
            <details className="border-t border-border pt-2">
              <summary className="min-h-12 cursor-pointer py-3 text-body font-semibold">{t("ntSettings")}</summary>
              <p className="text-caption text-text-muted">{t("ntSettingsHint")}</p>
              <div className="flex flex-col">
                {prefs.items.map((p) => <Checkbox key={p.category} label={t(`ntCat${p.category}`)} checked={p.enabled} onChange={(e) => void toggle(p.category, e.target.checked)} />)}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
