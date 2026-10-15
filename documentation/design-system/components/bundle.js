/* @ds-bundle: {"format":4,"namespace":"Oru","components":[{"name":"Icon"},{"name":"Button"},{"name":"ActionTile"},{"name":"TextField"},{"name":"Checkbox"},{"name":"SegmentedControl"},{"name":"StatusPill"},{"name":"Badge"},{"name":"SyncStatus"},{"name":"Banner"},{"name":"Card"},{"name":"StatCard"},{"name":"ListRow"},{"name":"Avatar"},{"name":"BottomNav"},{"name":"SideNav"},{"name":"EmptyState"},{"name":"Logo"}]} */
(function () {
  var React = window.React;
  var h = React.createElement;
  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(" "); }

  /* ---------- Icon: Lucide-style 24px outline set ---------- */
  var USERS_BASE = ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", { c: [9, 7, 4] }];
  var CLOUD = "M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z";
  var ICONS = {
    check: ["M20 6 9 17l-5-5"],
    x: ["M18 6 6 18", "m6 6 12 12"],
    clock: [{ c: [12, 12, 10] }, "M12 6v6l4 2"],
    leave: ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", "M14 2v6h6", "M16 13H8", "M16 17H8"],
    medical: [{ r: [3, 3, 18, 18, 2] }, "M12 8v8", "M8 12h8"],
    halfday: [{ c: [12, 12, 10] }, "M12 2v20", "M12 7h5", "M12 12h7", "M12 17h5"],
    more: [{ c: [12, 12, 1] }, { c: [19, 12, 1] }, { c: [5, 12, 1] }],
    "chevron-right": ["m9 18 6-6-6-6"],
    "chevron-down": ["m6 9 6 6 6-6"],
    "arrow-left": ["m12 19-7-7 7-7", "M19 12H5"],
    search: [{ c: [11, 11, 8] }, "m21 21-4.3-4.3"],
    bell: ["M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9", "M10.3 21a1.94 1.94 0 0 0 3.4 0"],
    home: ["m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", "M9 22V12h6v10"],
    users: USERS_BASE.concat(["M22 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"]),
    "user-plus": USERS_BASE.concat(["M19 8v6", "M22 11h-6"]),
    "user-minus": USERS_BASE.concat(["M22 11h-6"]),
    calendar: [{ r: [3, 4, 18, 18, 2] }, "M16 2v4", "M8 2v4", "M3 10h18"],
    message: ["M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"],
    payments: [{ r: [2, 5, 20, 14, 2] }, "M2 10h20"],
    grid: [{ r: [3, 3, 7, 7, 1] }, { r: [14, 3, 7, 7, 1] }, { r: [14, 14, 7, 7, 1] }, { r: [3, 14, 7, 7, 1] }],
    cloud: [CLOUD],
    "cloud-off": [CLOUD, "m2 2 20 20"],
    upload: ["M12 13v8", "m8 17 4-4 4 4", "M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"],
    refresh: ["M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8", "M21 3v5h-5"],
    alert: [{ c: [12, 12, 10] }, "M12 8v4", "M12 16h.01"],
    "check-circle": [{ c: [12, 12, 10] }, "m9 12 2 2 4-4"],
    bus: ["M8 6v6", "M15 6v6", "M2 12h19.6", "M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3", { c: [7, 18, 2] }, "M9 18h5", { c: [16, 18, 2] }],
    "map-pin": ["M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z", { c: [12, 10, 3] }],
    phone: ["M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"],
    book: ["M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z", "M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"],
    chart: ["M12 20V10", "M18 20V4", "M6 20v-4"],
    "trend-up": ["m22 7-8.5 8.5-5-5L2 17", "M16 7h6v6"],
    "trend-down": ["m22 17-8.5-8.5-5 5L2 7", "M16 17h6v-6"],
    send: ["m22 2-7 20-4-9-9-4Z", "M22 2 11 13"],
    device: [{ r: [5, 2, 14, 20, 2] }, "M12 18h.01"],
    inbox: ["M22 12h-6l-2 3h-4l-2-3H2", "M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"],
    tasks: [{ r: [8, 2, 8, 4, 1] }, "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2", "m9 14 2 2 4-4"],
    plus: ["M12 5v14", "M5 12h14"]
  };
  function Icon(p) {
    var size = p.size || 20;
    var parts = ICONS[p.name] || ICONS.more;
    return h("svg", {
      className: cx("oru-icon", p.className), width: size, height: size, viewBox: "0 0 24 24",
      fill: "none", stroke: "currentColor", strokeWidth: p.strokeWidth || 1.9, strokeLinecap: "round", strokeLinejoin: "round",
      "aria-hidden": p.label ? undefined : true, role: p.label ? "img" : undefined, "aria-label": p.label
    }, parts.map(function (s, i) {
      if (typeof s === "string") return h("path", { key: i, d: s });
      if (s.c) return h("circle", { key: i, cx: s.c[0], cy: s.c[1], r: s.c[2] });
      return h("rect", { key: i, x: s.r[0], y: s.r[1], width: s.r[2], height: s.r[3], rx: s.r[4] });
    }));
  }
  Icon.names = Object.keys(ICONS);

  /* ---------- Button ---------- */
  function Button(p) {
    var variant = p.variant || "secondary", size = p.size || "touch";
    var iconSize = size === "driver" ? 28 : 20;
    var rest = Object.assign({}, p);
    ["variant", "size", "icon", "iconRight", "block", "children", "className"].forEach(function (k) { delete rest[k]; });
    return h("button", Object.assign({ type: "button" }, rest, {
      className: cx("oru-btn", "oru-btn--" + variant, "oru-btn--" + size, p.block && "oru-btn--block", p.className)
    }), p.icon && h(Icon, { name: p.icon, size: iconSize }), h("span", null, p.children), p.iconRight && h(Icon, { name: p.iconRight, size: iconSize }));
  }

  /* ---------- ActionTile ---------- */
  function ActionTile(p) {
    var tone = p.tone || "primary";
    return h("button", { type: "button", onClick: p.onClick, disabled: p.disabled,
      className: cx("oru-tile", "oru-tile--" + tone, p.solid && "oru-tile--solid", p.className) },
      p.icon && h(Icon, { name: p.icon, size: 32 }),
      h("span", { className: "oru-tile__title" }, p.title),
      p.description && h("span", { className: "oru-tile__desc" }, p.description));
  }

  /* ---------- TextField ---------- */
  var fid = 0;
  function TextField(p) {
    var idRef = React.useRef(null);
    if (!idRef.current) idRef.current = p.id || "oru-field-" + (++fid);
    var id = idRef.current;
    var rest = Object.assign({}, p);
    ["label", "hint", "error", "icon", "size", "className", "multiline"].forEach(function (k) { delete rest[k]; });
    var Tag = p.multiline ? "textarea" : "input";
    return h("div", { className: cx("oru-field", "oru-field--" + (p.size || "touch"), p.error && "oru-field--error", p.className) },
      p.label && h("label", { className: "oru-field__label", htmlFor: id }, p.label),
      h("div", { className: "oru-field__box" },
        p.icon && h(Icon, { name: p.icon, size: 20 }),
        h(Tag, Object.assign({ id: id, "aria-invalid": p.error ? true : undefined, "aria-describedby": (p.error || p.hint) ? id + "-msg" : undefined }, rest))),
      (p.error || p.hint) && h("p", { id: id + "-msg", className: "oru-field__msg" },
        p.error && h(Icon, { name: "alert", size: 16 }), p.error || p.hint));
  }

  /* ---------- Checkbox ---------- */
  function Checkbox(p) {
    return h("label", { className: cx("oru-check", p.className) },
      h("input", { type: "checkbox", checked: p.checked, defaultChecked: p.defaultChecked, onChange: p.onChange, disabled: p.disabled }),
      h("span", { className: "oru-check__box", "aria-hidden": true }, h(Icon, { name: "check", size: 16, strokeWidth: 3 })),
      h("span", { className: "oru-check__text" },
        h("span", { className: "oru-check__label" }, p.label),
        p.description && h("span", { className: "oru-check__desc" }, p.description)));
  }

  /* ---------- SegmentedControl ---------- */
  function SegmentedControl(p) {
    var st = React.useState(p.value != null ? p.value : (p.defaultValue != null ? p.defaultValue : p.options[0].value));
    var value = p.value != null ? p.value : st[0];
    return h("div", { role: "tablist", "aria-label": p.label, className: cx("oru-seg", "oru-seg--" + (p.size || "comfortable"), p.className) },
      p.options.map(function (o) {
        var on = o.value === value;
        return h("button", { key: o.value, type: "button", role: "tab", "aria-selected": on, className: cx("oru-seg__opt", on && "is-on"),
          onClick: function () { st[1](o.value); if (p.onChange) p.onChange(o.value); } }, o.label);
      }));
  }

  /* ---------- StatusPill (attendance) ---------- */
  var STATUS = {
    present: { label: "Present", icon: "check", tone: "success" },
    absent: { label: "Absent", icon: "x", tone: "danger" },
    late: { label: "Late", icon: "clock", tone: "warning" },
    leave: { label: "Leave", icon: "leave", tone: "info" },
    medical: { label: "Medical", icon: "medical", tone: "purple" },
    halfday: { label: "Half Day", icon: "halfday", tone: "teal" },
    excused: { label: "Excused", icon: "more", tone: "neutral" }
  };
  function StatusPill(p) {
    var s = STATUS[p.status] || STATUS.present;
    var inner = [h(Icon, { key: "i", name: s.icon, size: 18, strokeWidth: 2.4 }), h("span", { key: "l" }, p.label || s.label)];
    if (p.interactive) {
      inner.push(h(Icon, { key: "c", name: "chevron-down", size: 18, className: "oru-pill__chev" }));
      return h("button", { type: "button", onClick: p.onClick, className: cx("oru-pill", "oru-pill--btn", "oru-tone--" + s.tone, p.className),
        "aria-label": "Status: " + (p.label || s.label) + ". Change" }, inner);
    }
    return h("span", { className: cx("oru-pill", "oru-tone--" + s.tone, p.className) }, inner);
  }
  StatusPill.statuses = Object.keys(STATUS);

  /* ---------- Badge ---------- */
  function Badge(p) {
    if (p.count != null) {
      var n = p.count > 99 ? "99+" : String(p.count);
      return h("span", { className: cx("oru-count", p.className), "aria-label": p.count + " new" }, n);
    }
    return h("span", { className: cx("oru-badge", "oru-tone--" + (p.tone || "neutral"), p.className) },
      p.dot && h("span", { className: "oru-badge__dot", "aria-hidden": true }), p.children);
  }

  /* ---------- SyncStatus ---------- */
  var SYNC = {
    synced: { icon: "check-circle", tone: "success", title: "Synced" },
    saved: { icon: "device", tone: "warning", title: "Saved on device" },
    pending: { icon: "upload", tone: "warning", title: "Changes pending" },
    syncing: { icon: "refresh", tone: "info", title: "Syncing…" },
    offline: { icon: "cloud-off", tone: "neutral", title: "You're offline" },
    failed: { icon: "alert", tone: "danger", title: "Sync failed" }
  };
  function SyncStatus(p) {
    var s = SYNC[p.state] || SYNC.synced;
    var title = p.title || s.title;
    if ((p.variant || "pill") === "pill") {
      return h("span", { className: cx("oru-sync", "oru-tone--" + s.tone, p.className), role: "status" },
        h(Icon, { name: s.icon, size: 16, strokeWidth: 2.2, className: p.state === "syncing" ? "oru-spin" : "" }),
        h("span", { className: "oru-sync__title" }, title),
        p.detail && h("span", { className: "oru-sync__detail" }, p.detail));
    }
    return h("div", { className: cx("oru-syncbar", "oru-tone--" + s.tone, p.className), role: "status" },
      h("span", { className: "oru-syncbar__icon" }, h(Icon, { name: s.icon, size: 22, className: p.state === "syncing" ? "oru-spin" : "" })),
      h("div", { className: "oru-syncbar__text" }, h("strong", null, title), p.detail && h("span", null, p.detail)),
      p.actionLabel && h(Button, { variant: "secondary", size: "comfortable", icon: p.state === "failed" ? "refresh" : "upload", onClick: p.onAction }, p.actionLabel));
  }

  /* ---------- Banner ---------- */
  var BANNER_ICON = { success: "check-circle", warning: "alert", danger: "alert", info: "bell", neutral: "bell" };
  function Banner(p) {
    var tone = p.tone || "info";
    return h("div", { className: cx("oru-banner", "oru-tone--" + tone, p.className), role: tone === "danger" ? "alert" : "status" },
      h(Icon, { name: p.icon || BANNER_ICON[tone], size: 22 }),
      h("div", { className: "oru-banner__text" }, p.title && h("strong", null, p.title), p.children && h("span", null, p.children)),
      p.action);
  }

  /* ---------- Card ---------- */
  function Card(p) {
    return h("section", { className: cx("oru-card", p.tone && "oru-card--" + p.tone, p.className) },
      (p.title || p.action) && h("header", { className: "oru-card__head" },
        p.icon && h("span", { className: "oru-icontile oru-tone--brand" }, h(Icon, { name: p.icon, size: 20 })),
        h("div", { className: "oru-card__titles" }, p.title && h("h3", null, p.title), p.subtitle && h("p", null, p.subtitle)),
        p.action && h("div", { className: "oru-card__action" }, p.action)),
      p.children);
  }
  function LinkAction(p) {
    return h("button", { type: "button", className: "oru-link", onClick: p.onClick }, p.children, h(Icon, { name: "chevron-right", size: 16 }));
  }

  /* ---------- StatCard ---------- */
  function StatCard(p) {
    var up = p.trend != null && p.trend >= 0;
    return h("div", { className: cx("oru-stat", p.className) },
      p.icon && h("span", { className: "oru-icontile oru-icontile--lg oru-tone--" + (p.tone || "brand") }, h(Icon, { name: p.icon, size: 24 })),
      h("div", { className: "oru-stat__body" },
        h("span", { className: "oru-stat__label" }, p.label),
        h("span", { className: "oru-stat__value" }, p.value),
        p.sub && h("span", { className: "oru-stat__sub" }, p.sub)),
      p.trend != null && h("span", { className: cx("oru-stat__trend", up ? "is-up" : "is-down") },
        h(Icon, { name: up ? "trend-up" : "trend-down", size: 16, strokeWidth: 2.4 }),
        h("strong", null, (up ? "+" : "") + p.trend + "%"),
        p.trendLabel && h("span", null, p.trendLabel)));
  }

  /* ---------- ListRow ---------- */
  function ListRow(p) {
    var Tag = p.onClick ? "button" : "div";
    return h(Tag, { type: p.onClick ? "button" : undefined, onClick: p.onClick,
      className: cx("oru-row", "oru-row--" + (p.size || "touch"), p.onClick && "oru-row--link", p.className) },
      p.leading != null && h("span", { className: "oru-row__lead" }, p.leading),
      h("span", { className: "oru-row__main" }, h("span", { className: "oru-row__title" }, p.title), p.subtitle && h("span", { className: "oru-row__sub" }, p.subtitle)),
      p.trailing != null && h("span", { className: "oru-row__trail" }, p.trailing),
      p.onClick && !p.trailing && h(Icon, { name: "chevron-right", size: 20, className: "oru-row__chev" }));
  }

  /* ---------- Avatar ---------- */
  function initials(name) { return (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join("").toUpperCase(); }
  function Avatar(p) {
    var size = p.size || 40;
    return h("span", { className: cx("oru-avatar", p.className), style: { width: size, height: size, fontSize: Math.round(size * 0.38) }, title: p.name },
      p.src ? h("img", { src: p.src, alt: p.name || "" }) : h("span", { "aria-label": p.name }, initials(p.name)));
  }

  /* ---------- BottomNav ---------- */
  function BottomNav(p) {
    return h("nav", { className: cx("oru-bnav", p.className), "aria-label": "Main" },
      p.items.map(function (it) {
        var on = it.key === p.active;
        return h("button", { key: it.key, type: "button", className: cx("oru-bnav__item", on && "is-on"), "aria-current": on ? "page" : undefined,
          onClick: function () { if (p.onChange) p.onChange(it.key); } },
          h("span", { className: "oru-bnav__icon" }, h(Icon, { name: it.icon, size: 24 }), it.badge ? h(Badge, { count: it.badge }) : null),
          h("span", { className: "oru-bnav__label" }, it.label));
      }));
  }

  /* ---------- SideNav (Web ERP) ---------- */
  function SideNav(p) {
    return h("nav", { className: cx("oru-snav", p.className), "aria-label": "Modules" },
      h("div", { className: "oru-snav__brand" }, p.product ? h("strong", null, p.product) : h(Logo, { size: 26 }), p.school && h("span", null, p.school)),
      p.sections.map(function (sec, i) {
        return h("div", { key: i, className: "oru-snav__sec" },
          sec.title && h("span", { className: "oru-snav__title" }, sec.title),
          sec.items.map(function (it) {
            var on = it.key === p.active;
            return h("button", { key: it.key, type: "button", className: cx("oru-snav__item", on && "is-on"), "aria-current": on ? "page" : undefined,
              onClick: function () { if (p.onChange) p.onChange(it.key); } },
              h(Icon, { name: it.icon, size: 20 }), h("span", null, it.label), it.badge ? h(Badge, { count: it.badge }) : null);
          }));
      }));
  }

  /* ---------- EmptyState ---------- */
  function EmptyState(p) {
    return h("div", { className: cx("oru-empty", p.className) },
      h("span", { className: "oru-icontile oru-icontile--xl oru-tone--brand" }, h(Icon, { name: p.icon || "inbox", size: 28 })),
      h("h3", null, p.title), p.description && h("p", null, p.description), p.action);
  }


  /* ---------- Logo (mark + outlined Poppins wordmark) ---------- */
  var WORDMARK = "M2.1531914893617023 22.96737588652482Q2.1531914893617023 16.246808510638292 5.317730496453902 10.896453900709213Q8.482269503546101 5.546099290780134 13.865248226950357 2.5446808510638235Q19.248226950354614 -0.45673758865248715 25.707801418439722 -0.45673758865248715Q32.16737588652483 -0.45673758865248715 37.55035460992909 2.5446808510638235Q42.93333333333334 5.546099290780134 46.03262411347518 10.896453900709213Q49.13191489361703 16.246808510638292 49.13191489361703 22.96737588652482Q49.13191489361703 29.687943262411345 46.00000000000001 35.0709219858156Q42.868085106382985 40.45390070921986 37.51773049645391 43.45531914893617Q32.16737588652483 46.45673758865248 25.707801418439722 46.45673758865248Q19.248226950354614 46.45673758865248 13.865248226950357 43.45531914893617Q8.482269503546101 40.45390070921986 5.317730496453902 35.0709219858156Q2.1531914893617023 29.687943262411345 2.1531914893617023 22.96737588652482ZM37.778723404255324 22.96737588652482Q37.778723404255324 16.89929078014184 34.48368794326242 13.278014184397158Q31.188652482269507 9.656737588652476 25.707801418439722 9.656737588652476Q20.161702127659577 9.656737588652476 16.866666666666667 13.24539007092198Q13.57163120567376 16.834042553191484 13.57163120567376 22.96737588652482Q13.57163120567376 29.035460992907797 16.866666666666667 32.65673758865248Q20.161702127659577 36.278014184397165 25.707801418439722 36.278014184397165Q31.188652482269507 36.278014184397165 34.48368794326242 32.6241134751773Q37.778723404255324 28.970212765957445 37.778723404255324 22.96737588652482Z M77.25390070921988 9.199999999999996V21.00992907801418H74.1872340425532Q70.01134751773051 21.00992907801418 67.92340425531916 22.804255319148933Q65.83546099290781 24.598581560283684 65.83546099290781 29.100709219858153V46.0H54.67801418439718V9.591489361702124H65.83546099290781V15.6595744680851Q67.79290780141845 12.658156028368786 70.72907801418441 10.929078014184391Q73.66524822695037 9.199999999999996 77.25390070921988 9.199999999999996Z M117.90354609929079 9.591489361702124V46.0H106.74609929078017V41.04113475177305Q105.04964539007094 43.45531914893617 102.14609929078016 44.92340425531915Q99.24255319148938 46.39148936170213 95.71914893617023 46.39148936170213Q91.54326241134753 46.39148936170213 88.34609929078016 44.53191489361702Q85.14893617021278 42.672340425531914 83.3872340425532 39.148936170212764Q81.62553191489363 35.625531914893614 81.62553191489363 30.862411347517728V9.591489361702124H92.71773049645391V29.361702127659573Q92.71773049645391 33.01560283687943 94.6099290780142 35.03829787234042Q96.50212765957448 37.06099290780142 99.69929078014187 37.06099290780142Q102.96170212765959 37.06099290780142 104.85390070921989 35.03829787234042Q106.74609929078017 33.01560283687943 106.74609929078017 29.361702127659573V9.591489361702124Z M123.97163120567377 32.29787234042553H135.8468085106383Q136.10780141843972 34.84255319148936 137.6085106382979 36.180141843971626Q139.10921985815605 37.5177304964539 141.52340425531918 37.5177304964539Q144.00283687943264 37.5177304964539 145.43829787234046 36.37588652482269Q146.87375886524825 35.234042553191486 146.87375886524825 33.211347517730495Q146.87375886524825 31.514893617021272 145.73191489361704 30.405673758865245Q144.59007092198584 29.296453900709217 142.9262411347518 28.578723404255314Q141.26241134751774 27.860992907801414 138.19574468085108 26.94751773049645Q133.75886524822695 25.577304964539003 130.9531914893617 24.207092198581556Q128.14751773049647 22.83687943262411 126.12482269503548 20.16170212765957Q124.10212765957448 17.48652482269503 124.10212765957448 13.180141843971626Q124.10212765957448 6.78581560283687 128.73475177304965 3.1645390070921913Q133.36737588652483 -0.45673758865248715 140.80567375886525 -0.45673758865248715Q148.3744680851064 -0.45673758865248715 153.00709219858157 3.1645390070921913Q157.63971631205675 6.78581560283687 157.96595744680855 13.245390070921978H145.89503546099291Q145.76453900709222 11.026950354609923 144.26382978723404 9.754609929078008Q142.7631205673759 8.482269503546092 140.41418439716313 8.482269503546092Q138.39148936170216 8.482269503546092 137.1517730496454 9.558865248226944Q135.91205673758867 10.635460992907795 135.91205673758867 12.658156028368786Q135.91205673758867 14.876595744680845 138.0 16.116312056737584Q140.08794326241136 17.35602836879432 144.52482269503548 18.791489361702123Q148.96170212765958 20.292198581560278 151.73475177304965 21.662411347517725Q154.50780141843973 23.032624113475173 156.53049645390072 25.642553191489355Q158.55319148936172 28.252482269503542 158.55319148936172 32.36312056737589Q158.55319148936172 36.278014184397165 156.5631205673759 39.47517730496454Q154.57304964539009 42.672340425531914 150.78865248226953 44.56453900709219Q147.00425531914897 46.45673758865248 141.84964539007095 46.45673758865248Q136.82553191489365 46.45673758865248 132.845390070922 44.82553191489362Q128.86524822695037 43.19432624113475 126.48368794326242 39.99716312056738Q124.10212765957448 36.8 123.97163120567377 32.29787234042553Z M180.80283687943268 9.069503546099284Q187.6539007092199 9.069503546099284 192.2539007092199 12.658156028368788Q196.8539007092199 16.246808510638292 198.2893617021277 22.771631205673756H186.41418439716315Q184.913475177305 18.59574468085106 180.6070921985816 18.59574468085106Q177.54042553191493 18.59574468085106 175.71347517730499 20.977304964539Q173.88652482269507 23.358865248226948 173.88652482269507 27.79574468085106Q173.88652482269507 32.232624113475175 175.71347517730499 34.614184397163115Q177.54042553191493 36.99574468085106 180.6070921985816 36.99574468085106Q184.913475177305 36.99574468085106 186.41418439716315 32.81985815602837H198.2893617021277Q196.8539007092199 39.21418439716312 192.2212765957447 42.86808510638298Q187.58865248226954 46.52198581560284 180.80283687943268 46.52198581560284Q175.45248226950358 46.52198581560284 171.30921985815604 44.238297872340425Q167.16595744680853 41.95460992907801 164.84964539007095 37.71347517730496Q162.53333333333336 33.47234042553191 162.53333333333336 27.79574468085106Q162.53333333333336 22.11914893617021 164.84964539007095 17.87801418439716Q167.16595744680853 13.636879432624106 171.30921985815604 11.353191489361695Q175.45248226950358 9.069503546099284 180.80283687943268 9.069503546099284Z M239.78723404255322 24.729078014184395V46.0H228.69503546099293V26.22978723404255Q228.69503546099293 22.575886524822693 226.80283687943265 20.553191489361698Q224.91063829787237 18.530496453900703 221.71347517730499 18.530496453900703Q218.5163120567376 18.530496453900703 216.62411347517732 20.553191489361698Q214.73191489361704 22.575886524822693 214.73191489361704 26.22978723404255V46.0H203.57446808510642V-2.2836879432624215H214.73191489361704V14.485106382978717Q216.42836879432627 12.070921985815595 219.36453900709222 10.635460992907795Q222.3007092198582 9.199999999999996 225.95460992907803 9.199999999999996Q232.21843971631208 9.199999999999996 236.00283687943266 13.343262411347514Q239.78723404255322 17.48652482269503 239.78723404255322 24.729078014184395Z M244.6808510638298 27.79574468085106Q244.6808510638298 22.184397163120565 247.1602836879433 17.910638297872335Q249.63971631205678 13.636879432624106 253.94609929078018 11.353191489361695Q258.25248226950356 9.069503546099284 263.60283687943263 9.069503546099284Q268.95319148936176 9.069503546099284 273.25957446808513 11.353191489361695Q277.56595744680857 13.636879432624106 280.04539007092205 17.910638297872335Q282.5248226950355 22.184397163120565 282.5248226950355 27.79574468085106Q282.5248226950355 33.40709219858156 280.01276595744685 37.680851063829785Q277.5007092198582 41.95460992907801 273.1617021276596 44.238297872340425Q268.82269503546104 46.52198581560284 263.47234042553197 46.52198581560284Q258.12198581560284 46.52198581560284 253.84822695035461 44.238297872340425Q249.57446808510642 41.95460992907801 247.1276595744681 37.71347517730496Q244.6808510638298 33.47234042553191 244.6808510638298 27.79574468085106ZM271.1716312056738 27.79574468085106Q271.1716312056738 23.4241134751773 268.9858156028369 21.075177304964534Q266.8 18.726241134751767 263.60283687943263 18.726241134751767Q260.34042553191495 18.726241134751767 258.1872340425532 21.042553191489358Q256.0340425531915 23.358865248226948 256.0340425531915 27.79574468085106Q256.0340425531915 32.16737588652482 258.15460992907805 34.51631205673759Q260.2751773049646 36.86524822695036 263.47234042553197 36.86524822695036Q266.66950354609935 36.86524822695036 268.92056737588655 34.51631205673759Q271.1716312056738 32.16737588652482 271.1716312056738 27.79574468085106Z M285.5914893617022 27.79574468085106Q285.5914893617022 22.184397163120565 288.07092198581563 17.910638297872335Q290.5503546099291 13.636879432624106 294.85673758865255 11.353191489361695Q299.1631205673759 9.069503546099284 304.513475177305 9.069503546099284Q309.8638297872341 9.069503546099284 314.17021276595756 11.353191489361695Q318.47659574468094 13.636879432624106 320.95602836879436 17.910638297872335Q323.43546099290785 22.184397163120565 323.43546099290785 27.79574468085106Q323.43546099290785 33.40709219858156 320.9234042553192 37.680851063829785Q318.4113475177306 41.95460992907801 314.072340425532 44.238297872340425Q309.7333333333334 46.52198581560284 304.38297872340434 46.52198581560284Q299.0326241134752 46.52198581560284 294.758865248227 44.238297872340425Q290.48510638297876 41.95460992907801 288.0382978723405 37.71347517730496Q285.5914893617022 33.47234042553191 285.5914893617022 27.79574468085106ZM312.0822695035462 27.79574468085106Q312.0822695035462 23.4241134751773 309.8964539007093 21.075177304964534Q307.7106382978724 18.726241134751767 304.513475177305 18.726241134751767Q301.2510638297873 18.726241134751767 299.0978723404256 21.042553191489358Q296.9446808510639 23.358865248226948 296.9446808510639 27.79574468085106Q296.9446808510639 32.16737588652482 299.0652482269504 34.51631205673759Q301.18581560283695 36.86524822695036 304.38297872340434 36.86524822695036Q307.58014184397166 36.86524822695036 309.8312056737589 34.51631205673759Q312.0822695035462 32.16737588652482 312.0822695035462 27.79574468085106Z M339.8780141843973 -2.2836879432624215V46.0H328.7205673758866V-2.2836879432624215Z M345.358865248227 34.0595744680851H356.38581560283694Q356.581560283688 35.95177304964539 358.14751773049653 37.12624113475177Q359.71347517730504 38.300709219858156 361.99716312056745 38.300709219858156Q364.0851063829788 38.300709219858156 365.22695035461 37.48510638297873Q366.3687943262412 36.66950354609929 366.3687943262412 35.3645390070922Q366.3687943262412 33.79858156028369 364.7375886524824 33.048226950354604Q363.1063829787235 32.29787234042553 359.4524822695036 31.384397163120564Q355.5375886524823 30.4709219858156 352.9276595744682 29.4595744680851Q350.317730496454 28.448226950354606 348.42553191489367 26.262411347517727Q346.5333333333334 24.076595744680848 346.5333333333334 20.357446808510634Q346.5333333333334 17.22553191489361 348.2624113475178 14.648226950354603Q349.9914893617022 12.070921985815595 353.35177304964543 10.57021276595744Q356.71205673758874 9.069503546099284 361.3446808510639 9.069503546099284Q368.19574468085113 9.069503546099284 372.14326241134756 12.462411347517724Q376.09078014184405 15.855319148936164 376.6780141843972 21.46666666666666H366.3687943262412Q366.1078014184398 19.57446808510638 364.70496453900716 18.46524822695035Q363.3021276595745 17.35602836879432 361.0184397163121 17.35602836879432Q359.0609929078015 17.35602836879432 358.0170212765958 18.1063829787234Q356.9730496453901 18.85673758865248 356.9730496453901 20.16170212765957Q356.9730496453901 21.72765957446808 358.63687943262414 22.510638297872337Q360.3007092198582 23.293617021276592 363.8241134751774 24.076595744680848Q367.8695035460994 25.120567375886523 370.41418439716324 26.13191489361702Q372.958865248227 27.143262411347514 374.8836879432625 29.39432624113475Q376.80851063829795 31.645390070921984 376.8737588652483 35.42978723404255Q376.8737588652483 38.62695035460993 375.07943262411356 41.13900709219858Q373.2851063829788 43.65106382978723 369.9248226950356 45.08652482269504Q366.56453900709226 46.52198581560284 362.12765957446817 46.52198581560284Q357.3645390070923 46.52198581560284 353.6453900709221 44.890780141843976Q349.9262411347518 43.259574468085106 347.77304964539013 40.42127659574468Q345.61985815602844 37.58297872340425 345.358865248227 34.0595744680851Z";
  var LOGO_INK = { color: ["var(--primary-text)", "var(--text)"], white: ["#ffffff", "#ffffff"], ink: ["#151838", "#151838"] };
  function LogoMark(p) {
    var c = p.color;
    return h("svg", { viewBox: "7 7 50 50", width: p.size, height: p.size, "aria-hidden": true, className: "oru-logo__mark" },
      h("path", { d: "M52 32A20 20 0 1 1 32 12", fill: "none", stroke: c, strokeWidth: 10, strokeLinecap: "round" }),
      h("circle", { cx: 46.142, cy: 17.858, r: 6, fill: c }));
  }
  function Logo(p) {
    var size = p.size || 32, ink = LOGO_INK[p.tone || "color"] || LOGO_INK.color;
    var mark = h(LogoMark, { size: size, color: ink[0] });
    if (p.variant === "mark") return h("span", { className: cx("oru-logo", p.className), role: "img", "aria-label": "OruSchools" }, mark);
    var cap = size * 0.46, wmW = cap * 384 / 50;
    return h("span", { className: cx("oru-logo", p.className), role: "img", "aria-label": "OruSchools" + (p.app ? " " + p.app : ""), style: { gap: size * 0.28 } },
      mark,
      h("span", { className: "oru-logo__words" },
        h("svg", { viewBox: "-2 -2 384 50", width: wmW, height: cap * 50 / 46, "aria-hidden": true }, h("path", { d: WORDMARK, fill: ink[1] })),
        p.app && h("span", { className: "oru-logo__app", style: { fontSize: Math.max(11, size * 0.3), color: (p.tone && p.tone !== "color") ? ink[1] : undefined } }, p.app)));
  }

  window.Oru = Object.assign(window.Oru || {}, {
    Icon: Icon, Button: Button, ActionTile: ActionTile, TextField: TextField, Checkbox: Checkbox, SegmentedControl: SegmentedControl,
    StatusPill: StatusPill, Badge: Badge, SyncStatus: SyncStatus, Banner: Banner, Card: Card, LinkAction: LinkAction, StatCard: StatCard,
    ListRow: ListRow, Avatar: Avatar, BottomNav: BottomNav, SideNav: SideNav, EmptyState: EmptyState, Logo: Logo
  });
})();
