"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { DriverListDto, ManifestDto, RouteDto, RouteListDto, StudentFoundDto, VehicleDto, VehicleListDto } from "@oruschools/api-client";
import { Badge, Banner, Button, Card, EmptyState, SegmentedControl, TextField } from "@oruschools/shared-ui";
import { errorKey, useSession } from "@oruschools/web-auth";
import { ruleKey } from "@/lib/rules";
import { useLoad } from "@/lib/use-load";
import { DataTable, type Column } from "./DataTable";
import { Failed, Saved, SelectField } from "./parts";

export interface TransportGrants {
  create: boolean;
  update: boolean;
  remove: boolean;
}

const RULES: Readonly<Record<string, string>> = {
  registrationInUse: "trnPlateInUse", vehicleInUse: "trnVehicleInUse", routeNameInUse: "trnRouteNameInUse", notADriver: "trnNotADriver", noAccount: "trnNotADriver",
  vehicleFull: "trnVehicleFull", notFound: "trnStudentNotFound", notOnThisRoute: "trnStudentNotFound", duplicateStop: "trnDuplicateStop",
};
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
type Note = { tone: "saved" | "error"; text: string } | null;

/** Runs a write, shows its outcome in words and calls `then` when it worked. */
function useAct(reload: () => void) {
  const t = useTranslations();
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);
  const act = async (work: () => Promise<unknown>, done: string | ((r: unknown) => string), then?: () => void) => {
    setBusy(true);
    setNote(null);
    try {
      const r = await work();
      setNote({ tone: "saved", text: typeof done === "function" ? done(r) : t(done) });
      then?.();
      reload();
    } catch (e) {
      setNote({ tone: "error", text: t(ruleKey(e, RULES, errorKey)) });
    } finally {
      setBusy(false);
    }
  };
  return { act, note, busy, setNote };
}

const NoteView = ({ note }: { note: Note }) => (note?.tone === "saved" ? <Saved>{note.text}</Saved> : note?.tone === "error" ? <Banner tone="danger" title={note.text} /> : null);

/** Vehicles: the school's buses and vans, with their seats and whether they are in service. */
function Vehicles({ grants }: { grants: TransportGrants }) {
  const t = useTranslations();
  const { api } = useSession();
  const [state, reload] = useLoad<VehicleListDto>(api ? () => api.transportVehicles({}) : null, "vehicles");
  const { act, note, busy } = useAct(reload);
  const [plate, setPlate] = useState("");
  const [label, setLabel] = useState("");
  const [seats, setSeats] = useState("");
  const [editing, setEditing] = useState<VehicleDto | null>(null);
  const [eLabel, setELabel] = useState("");
  const [eSeats, setESeats] = useState("");
  const [eStatus, setEStatus] = useState("ACTIVE");
  const validNew = plate.trim().length >= 2 && label.trim() !== "" && Number.isInteger(Number(seats)) && Number(seats) >= 1 && Number(seats) <= 200;
  const columns: Column<VehicleDto>[] = [
    { key: "plate", header: t("trnPlate"), render: (v) => <span dir="ltr">{v.registration}</span> },
    { key: "label", header: t("lvTypeName"), render: (v) => v.label },
    { key: "seats", header: t("trnSeats"), numeric: true, render: (v) => v.capacity },
    { key: "status", header: t("attStatus"), render: (v) => <Badge tone={v.status === "ACTIVE" ? "success" : "neutral"}>{t(`trnStatus${v.status}`)}</Badge> },
    ...(grants.update || grants.remove ? [{ key: "x", header: t("actionEdit"), hideHeader: true, render: (v: VehicleDto) => (
      <span className="flex gap-2">
        {grants.update && <Button size="compact" variant="ghost" aria-label={`${t("actionEdit")}: ${v.label}`} onClick={() => { setEditing(v); setELabel(v.label); setESeats(String(v.capacity)); setEStatus(v.status); }}>{t("actionEdit")}</Button>}
        {grants.remove && <Button size="compact" variant="ghost" aria-label={`${t("trnDelete")}: ${v.label}`} disabled={busy} onClick={() => void act(() => api!.transportDeleteVehicle({ path: { id: v.id } }), "trnDelete")}>{t("trnDelete")}</Button>}
      </span>
    ) }] : []),
  ];
  return (
    <div className="flex flex-col gap-4">
      <NoteView note={note} />
      {state.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {state.status === "error" && <Failed messageKey={state.messageKey} retry={reload} />}
      {state.status === "ready" && (state.data.items.length === 0 ? <Card><EmptyState title={t("trnNoVehicles")} headingLevel={2} /></Card> : <DataTable caption={t("trnTabVehicles")} columns={columns} rows={state.data.items} rowKey={(v) => v.id} />)}
      {grants.create && (
        <Card title={t("trnAdd")} headingLevel={2}>
          <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); void act(() => api!.transportCreateVehicle({ body: { registration: plate.trim(), label: label.trim(), capacity: Number(seats) } }), "trnAdd", () => { setPlate(""); setLabel(""); setSeats(""); }); }}>
            <TextField size="comfortable" label={t("trnPlate")} dir="ltr" value={plate} onChange={(e) => setPlate(e.target.value)} />
            <TextField size="comfortable" label={t("trnVehicleName")} value={label} onChange={(e) => setLabel(e.target.value)} />
            <TextField size="comfortable" label={t("trnSeats")} inputMode="numeric" dir="ltr" value={seats} onChange={(e) => setSeats(e.target.value)} />
            <Button type="submit" variant="primary" size="comfortable" disabled={busy || !validNew}>{t("trnAdd")}</Button>
          </form>
        </Card>
      )}
      {editing && grants.update && (
        <Card title={editing.label} headingLevel={2}>
          <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); void act(() => api!.transportUpdateVehicle({ path: { id: editing.id }, body: { label: eLabel.trim(), capacity: Number(eSeats), status: eStatus as "ACTIVE" | "OUT_OF_SERVICE" } }), "actionSave", () => setEditing(null)); }}>
            <TextField size="comfortable" label={t("trnVehicleName")} value={eLabel} onChange={(e) => setELabel(e.target.value)} />
            <TextField size="comfortable" label={t("trnSeats")} inputMode="numeric" dir="ltr" value={eSeats} onChange={(e) => setESeats(e.target.value)} />
            <SelectField label={t("attStatus")} value={eStatus} onChange={setEStatus} options={[{ value: "ACTIVE", label: t("trnStatusACTIVE") }, { value: "OUT_OF_SERVICE", label: t("trnStatusOUT_OF_SERVICE") }]} />
            <Button type="submit" variant="primary" size="comfortable" disabled={busy || eLabel.trim() === "" || !(Number(eSeats) >= 1 && Number(eSeats) <= 200)}>{t("actionSave")}</Button>
            <Button size="comfortable" onClick={() => setEditing(null)}>{t("actionCancel")}</Button>
          </form>
        </Card>
      )}
    </div>
  );
}

/** One route: its details, its stops in order, who rides it, and the card that seats a student. */
function RouteDetail({ route, vehicles, drivers, grants, onChanged }: { route: RouteDto; vehicles: VehicleDto[]; drivers: DriverListDto["items"]; grants: TransportGrants; onChanged: () => void }) {
  const t = useTranslations();
  const { api } = useSession();
  const [manifest, reloadManifest] = useLoad<ManifestDto>(api ? () => api.transportManifest({ path: { id: route.id } }) : null, `manifest-${route.id}-${route.stops.map((s) => s.id).join(",")}`);
  const reloadAll = () => { onChanged(); reloadManifest(); };
  const { act, note, busy } = useAct(reloadAll);
  const [name, setName] = useState(route.name);
  const [direction, setDirection] = useState(route.direction);
  const [start, setStart] = useState(route.startTime ?? "");
  const [vehicleId, setVehicleId] = useState(route.vehicle?.id ?? "");
  const [driverId, setDriverId] = useState(route.driver?.id ?? "");
  const [stops, setStops] = useState(route.stops.map((s) => ({ name: s.name, time: s.arrivalTime ?? "" })));
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<StudentFoundDto[]>([]);
  const [student, setStudent] = useState<StudentFoundDto | null>(null);
  const [stopId, setStopId] = useState(route.stops[0]?.id ?? "");
  const move = (i: number, d: -1 | 1) => setStops((s) => { const n = [...s]; const j = i + d; if (j < 0 || j >= n.length) return s; [n[i], n[j]] = [n[j]!, n[i]!]; return n; });
  const stopsValid = stops.every((s) => s.name.trim() !== "" && (s.time === "" || TIME.test(s.time)));
  const detailsValid = name.trim() !== "" && (start === "" || TIME.test(start));
  const stopNote = (r: unknown) => { const dropped = (r as { droppedSeats?: number }).droppedSeats ?? 0; return dropped > 0 ? `${t("trnStopsSaved")} ${t("trnStopsDropped", { count: dropped })}` : t("trnStopsSaved"); };
  const search = async (text: string) => {
    setQuery(text);
    setStudent(null);
    if (text.trim().length < 2 || !api) { setFound([]); return; }
    try { setFound((await api.transportFindStudents({ query: { search: text.trim() } })).items); } catch { setFound([]); }
  };
  return (
    <Card title={route.name} headingLevel={2}>
      <div className="flex flex-col gap-5">
        <NoteView note={note} />
        <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); void act(() => api!.transportUpdateRoute({ path: { id: route.id }, body: { name: name.trim(), direction: direction as "MORNING" | "AFTERNOON", startTime: start === "" ? undefined : start, vehicleId: vehicleId === "" ? null : vehicleId, driverId: driverId === "" ? null : driverId } }), "actionSave"); }}>
          <TextField size="comfortable" label={t("trnRouteName")} value={name} disabled={!grants.update} onChange={(e) => setName(e.target.value)} />
          <SelectField label={t("trnDirection")} value={direction} onChange={setDirection} options={[{ value: "MORNING", label: t("trnMORNING") }, { value: "AFTERNOON", label: t("trnAFTERNOON") }]} />
          <TextField size="comfortable" label={t("trnStartsAt")} placeholder="07:15" dir="ltr" value={start} disabled={!grants.update} onChange={(e) => setStart(e.target.value)} />
          <SelectField label={t("trnVehicle")} value={vehicleId} onChange={setVehicleId} options={[{ value: "", label: t("trnNoneChosen") }, ...vehicles.map((v) => ({ value: v.id, label: `${v.label} (${v.registration})` }))]} />
          <SelectField label={t("trnDriver")} value={driverId} onChange={setDriverId} options={[{ value: "", label: t("trnNoneChosen") }, ...drivers.map((d) => ({ value: d.id, label: d.name }))]} />
          {grants.update && <Button type="submit" variant="primary" size="comfortable" disabled={busy || !detailsValid}>{t("actionSave")}</Button>}
          {grants.remove && <Button size="comfortable" disabled={busy} onClick={() => void act(() => api!.transportDeleteRoute({ path: { id: route.id } }), "trnDelete")}>{t("trnDelete")}</Button>}
        </form>

        <section aria-label={t("trnStops")} className="flex flex-col gap-3">
          <h3 className="text-heading">{t("trnStops")}</h3>
          {stops.map((s, i) => (
            <div key={i} className="flex flex-wrap items-end gap-3">
              <span className="w-6 text-body text-text-muted" dir="ltr">{i + 1}</span>
              <TextField size="comfortable" label={t("trnStopName")} value={s.name} disabled={!grants.update} onChange={(e) => setStops((p) => p.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <TextField size="comfortable" label={t("trnStopTime")} placeholder="07:30" dir="ltr" value={s.time} disabled={!grants.update} onChange={(e) => setStops((p) => p.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)))} />
              {grants.update && (
                <span className="flex gap-2">
                  <Button size="compact" variant="ghost" aria-label={`${t("trnMoveUp")}: ${s.name || i + 1}`} disabled={i === 0} onClick={() => move(i, -1)}>{t("trnMoveUp")}</Button>
                  <Button size="compact" variant="ghost" aria-label={`${t("trnMoveDown")}: ${s.name || i + 1}`} disabled={i === stops.length - 1} onClick={() => move(i, 1)}>{t("trnMoveDown")}</Button>
                  <Button size="compact" variant="ghost" aria-label={`${t("trnRemove")}: ${s.name || i + 1}`} onClick={() => setStops((p) => p.filter((_x, j) => j !== i))}>{t("trnRemove")}</Button>
                </span>
              )}
            </div>
          ))}
          {grants.update && (
            <div className="flex gap-3">
              <Button size="comfortable" onClick={() => setStops((p) => [...p, { name: "", time: "" }])}>{t("trnAdd")}</Button>
              <Button variant="primary" size="comfortable" disabled={busy || !stopsValid} onClick={() => void act(() => api!.transportSetStops({ path: { id: route.id }, body: { stops: stops.map((s) => ({ name: s.name.trim(), ...(s.time ? { arrivalTime: s.time } : {}) })) } }), stopNote)}>{t("trnSaveStops")}</Button>
            </div>
          )}
        </section>

        {grants.update && route.stops.length > 0 && (
          <section aria-label={t("trnSeatTitle")} className="flex flex-col gap-3">
            <h3 className="text-heading">{t("trnSeatTitle")}</h3>
            <div className="flex flex-wrap items-end gap-3">
              <TextField size="comfortable" label={t("trnFindStudent")} hint={t("trnFindHint")} value={query} onChange={(e) => void search(e.target.value)} />
              <SelectField label={t("trnChooseStop")} value={stopId} onChange={setStopId} options={route.stops.map((s) => ({ value: s.id, label: `${s.sequence}. ${s.name}` }))} />
              <Button variant="primary" size="comfortable" disabled={busy || !student || !stopId} onClick={() => void act(() => api!.transportAssign({ path: { studentId: student!.id }, body: { routeId: route.id, stopId } }), "trnSeated", () => { setStudent(null); setQuery(""); setFound([]); })}>{t("trnSeat")}</Button>
            </div>
            {found.length > 0 && (
              <ul className="flex flex-col gap-1" aria-label={t("trnFindStudent")}>
                {found.map((f) => (
                  <li key={f.id}>
                    <Button size="compact" variant={student?.id === f.id ? "primary" : "ghost"} onClick={() => setStudent(f)}>{f.name}{f.className ? `, ${f.className}` : ""} ({f.enrollmentId})</Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section aria-label={t("trnWhoRides")} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-heading">{t("trnWhoRides")}</h3>
            {manifest.status === "ready" && <span className="text-body text-text-muted">{manifest.data.capacity === null ? t("trnRiding", { assigned: manifest.data.assigned }) : t("trnSeatsTaken", { assigned: manifest.data.assigned, capacity: manifest.data.capacity })}</span>}
            <Button size="compact" onClick={() => window.print()}>{t("trnPrint")}</Button>
          </div>
          {manifest.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
          {manifest.status === "error" && <Failed messageKey={manifest.messageKey} retry={reloadManifest} />}
          {manifest.status === "ready" && manifest.data.stops.map((s) => (
            <div key={s.id}>
              <h4 className="text-body font-semibold">{s.sequence}. {s.name}{s.arrivalTime ? <span className="text-text-muted" dir="ltr"> {s.arrivalTime}</span> : null}</h4>
              {s.students.length === 0 ? <p className="text-body text-text-muted">{t("trnNobodyAtStop")}</p> : (
                <ul className="flex flex-col gap-1">
                  {s.students.map((x) => (
                    <li key={x.id} className="flex flex-wrap items-center gap-3 text-body">
                      <span>{x.name}{x.className ? `, ${x.className}` : ""}<span className="text-text-muted" dir="ltr"> ({x.enrollmentId})</span></span>
                      {grants.update && <Button size="compact" variant="ghost" aria-label={`${t("trnRemove")}: ${x.name}`} disabled={busy} onClick={() => void act(() => api!.transportUnassign({ path: { studentId: x.id, direction: route.direction as "MORNING" | "AFTERNOON" } }), "trnUnseated")}>{t("trnRemove")}</Button>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      </div>
    </Card>
  );
}

function Routes({ grants }: { grants: TransportGrants }) {
  const t = useTranslations();
  const { api } = useSession();
  const [routes, reload] = useLoad<RouteListDto>(api ? () => api.transportRoutes({}) : null, "routes");
  const [vehicles] = useLoad<VehicleListDto>(api ? () => api.transportVehicles({}) : null, "route-vehicles");
  const [drivers] = useLoad<DriverListDto>(api ? () => api.transportDrivers({}) : null, "route-drivers");
  const { act, note, busy } = useAct(reload);
  const [openId, setOpenId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [direction, setDirection] = useState("MORNING");
  const [start, setStart] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const vlist = vehicles.status === "ready" ? vehicles.data.items : [];
  const dlist = drivers.status === "ready" ? drivers.data.items : [];
  const open = routes.status === "ready" ? routes.data.items.find((r) => r.id === openId) ?? null : null;
  const columns: Column<RouteDto>[] = [
    { key: "name", header: t("trnRouteName"), render: (r) => r.name },
    { key: "dir", header: t("trnDirection"), render: (r) => t(`trn${r.direction}`) },
    { key: "start", header: t("trnStartsAt"), numeric: true, render: (r) => r.startTime ?? "" },
    { key: "vehicle", header: t("trnVehicle"), render: (r) => (r.vehicle ? `${r.vehicle.label}` : "") },
    { key: "driver", header: t("trnDriver"), render: (r) => r.driver?.name ?? "" },
    { key: "stops", header: t("trnStops"), numeric: true, render: (r) => r.stops.length },
    { key: "open", header: t("navTransport"), hideHeader: true, render: (r) => <Button size="compact" variant="ghost" aria-label={`${t("trnStops")}: ${r.name}`} onClick={() => setOpenId(r.id)}>{t("trnStops")}</Button> },
  ];
  return (
    <div className="flex flex-col gap-4">
      <NoteView note={note} />
      {routes.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {routes.status === "error" && <Failed messageKey={routes.messageKey} retry={reload} />}
      {routes.status === "ready" && (routes.data.items.length === 0 ? <Card><EmptyState title={t("trnNoRoutes")} headingLevel={2} /></Card> : <DataTable caption={t("trnTabRoutes")} columns={columns} rows={routes.data.items} rowKey={(r) => r.id} />)}
      {open && <RouteDetail key={open.id + JSON.stringify(open)} route={open} vehicles={vlist} drivers={dlist} grants={grants} onChanged={reload} />}
      {grants.create && (
        <Card title={t("trnAdd")} headingLevel={2}>
          <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); void act(() => api!.transportCreateRoute({ body: { name: name.trim(), direction: direction as "MORNING" | "AFTERNOON", ...(start ? { startTime: start } : {}), ...(vehicleId ? { vehicleId } : {}), ...(driverId ? { driverId } : {}) } }), "trnAdd", () => { setName(""); setStart(""); setVehicleId(""); setDriverId(""); }); }}>
            <TextField size="comfortable" label={t("trnRouteName")} value={name} onChange={(e) => setName(e.target.value)} />
            <SelectField label={t("trnDirection")} value={direction} onChange={setDirection} options={[{ value: "MORNING", label: t("trnMORNING") }, { value: "AFTERNOON", label: t("trnAFTERNOON") }]} />
            <TextField size="comfortable" label={t("trnStartsAt")} placeholder="07:15" dir="ltr" value={start} onChange={(e) => setStart(e.target.value)} />
            <SelectField label={t("trnVehicle")} value={vehicleId} onChange={setVehicleId} options={[{ value: "", label: t("trnNoneChosen") }, ...vlist.map((v) => ({ value: v.id, label: `${v.label} (${v.registration})` }))]} />
            <SelectField label={t("trnDriver")} value={driverId} onChange={setDriverId} options={[{ value: "", label: t("trnNoneChosen") }, ...dlist.map((d) => ({ value: d.id, label: d.name }))]} />
            <Button type="submit" variant="primary" size="comfortable" disabled={busy || name.trim() === "" || (start !== "" && !TIME.test(start))}>{t("trnAdd")}</Button>
          </form>
        </Card>
      )}
    </div>
  );
}

/** Transport in the ERP (P5-4c): the school's vehicles, its routes with their stops, who rides, and seating students. Read-only for roles without the write grants. */
export function Transport({ grants }: { grants: TransportGrants }) {
  const t = useTranslations();
  const [tab, setTab] = useState("routes");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-title">{t("navTransport")}</h1>
      <SegmentedControl label={t("trnViewLabel")} value={tab} onChange={setTab} options={[{ value: "routes", label: t("trnTabRoutes") }, { value: "vehicles", label: t("trnTabVehicles") }]} />
      {tab === "vehicles" ? <Vehicles grants={grants} /> : <Routes grants={grants} />}
    </div>
  );
}
