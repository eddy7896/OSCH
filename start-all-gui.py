#!/usr/bin/env python3
"""A window for start-all.sh: pick the simulator and the apps, start the whole stack, and watch the console, the build progress and
the debug logs. Standard library only (tkinter), nothing to install:

    python3 start-all-gui.py

It runs ./start-all.sh in the background with your choices as its environment variables, so the two behave the same. Stop (or closing
the window) sends it Ctrl-C, which stops the emulators, the gateway and the web apps. Local emulators only.
"""
import glob
import json
import os
import re
import signal
import subprocess
import threading
import queue
import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox

ROOT = os.path.dirname(os.path.abspath(__file__))
APPS = [("teacher", "Teacher"), ("staff", "Staff"), ("parent", "Parent"), ("driver", "Driver")]
SCRIPT = os.path.join(ROOT, "start-all.sh")
UDID_RE = re.compile(r"[0-9A-F]{8}(?:-[0-9A-F]{4}){3}-[0-9A-F]{12}")


def simulators():
    """[(label, udid)] of the available iOS simulators, booted ones first."""
    try:
        out = subprocess.run(["xcrun", "simctl", "list", "devices", "available", "-j"], capture_output=True, text=True, timeout=20).stdout
        data = json.loads(out)["devices"]
    except Exception:
        return []
    found = []
    for runtime, devices in data.items():
        if "iOS" not in runtime:
            continue
        version = runtime.split(".")[-1].replace("iOS-", "iOS ").replace("-", ".")
        for d in devices:
            found.append((d["state"] != "Booted", "%s (%s)%s" % (d["name"], version, "  [booted]" if d["state"] == "Booted" else ""), d["udid"]))
    found.sort(key=lambda x: (x[0], x[1]))
    return [(label, udid) for _, label, udid in found]


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("OruSchools: start everything")
        self.geometry("980x720")
        self.minsize(760, 540)
        self.proc = None
        self.lines = queue.Queue()
        self.log_dir = None
        self.sims = simulators()
        self.app_vars = {k: tk.BooleanVar(value=True) for k, _ in APPS}
        self.launch_var = tk.StringVar(value="teacher")
        self.keep_builds = tk.BooleanVar(value=False)
        self.no_web = tk.BooleanVar(value=False)
        self.flutter_var = tk.StringVar(value=os.environ.get("FLUTTER", ""))
        self.status = {k: tk.StringVar(value="not selected") for k, _ in APPS}
        self.stage = tk.StringVar(value="Idle")
        self._tail_pos = {}
        self._build()
        self.protocol("WM_DELETE_WINDOW", self.on_close)
        self.after(150, self.drain)
        self.after(1000, self.tail_logs)

    # ---- layout -------------------------------------------------------------------------------------------------------------
    def _build(self):
        top = ttk.Frame(self, padding=10)
        top.pack(fill="x")

        ttk.Label(top, text="Simulator").grid(row=0, column=0, sticky="w")
        self.sim_box = ttk.Combobox(top, state="readonly", width=48, values=[l for l, _ in self.sims] or ["(none found)"])
        self.sim_box.grid(row=0, column=1, columnspan=3, sticky="we", padx=6)
        if self.sims:
            self.sim_box.current(0)
        ttk.Button(top, text="Refresh", command=self.refresh_sims).grid(row=0, column=4, padx=4)

        ttk.Label(top, text="Apps").grid(row=1, column=0, sticky="w", pady=(8, 0))
        apps = ttk.Frame(top)
        apps.grid(row=1, column=1, columnspan=4, sticky="w", padx=6, pady=(8, 0))
        for k, name in APPS:
            ttk.Checkbutton(apps, text=name, variable=self.app_vars[k], command=self.sync_launch).pack(side="left", padx=(0, 14))

        ttk.Label(top, text="Open at the end").grid(row=2, column=0, sticky="w", pady=(8, 0))
        self.launch_box = ttk.Combobox(top, state="readonly", width=14, textvariable=self.launch_var, values=[k for k, _ in APPS] + ["none"])
        self.launch_box.grid(row=2, column=1, sticky="w", padx=6, pady=(8, 0))
        opts = ttk.Frame(top)
        opts.grid(row=2, column=2, columnspan=3, sticky="w", pady=(8, 0))
        ttk.Checkbutton(opts, text="Keep old builds (faster, uses disk)", variable=self.keep_builds).pack(side="left", padx=(0, 14))
        ttk.Checkbutton(opts, text="Do not open browser tabs", variable=self.no_web).pack(side="left")

        ttk.Label(top, text="Flutter (optional)").grid(row=3, column=0, sticky="w", pady=(8, 0))
        ttk.Entry(top, textvariable=self.flutter_var).grid(row=3, column=1, columnspan=3, sticky="we", padx=6, pady=(8, 0))
        ttk.Label(top, text="empty = the one on PATH").grid(row=3, column=4, sticky="w", pady=(8, 0))

        bar = ttk.Frame(top)
        bar.grid(row=4, column=0, columnspan=5, sticky="we", pady=(12, 0))
        self.start_btn = ttk.Button(bar, text="Start", command=self.start)
        self.start_btn.pack(side="left")
        self.stop_btn = ttk.Button(bar, text="Stop", command=self.stop, state="disabled")
        self.stop_btn.pack(side="left", padx=8)
        ttk.Label(bar, textvariable=self.stage, font=("Helvetica", 12, "bold")).pack(side="left", padx=12)
        top.columnconfigure(1, weight=1)
        top.columnconfigure(2, weight=1)

        prog = ttk.LabelFrame(self, text="Build progress", padding=8)
        prog.pack(fill="x", padx=10)
        self.bar = ttk.Progressbar(prog, maximum=100)
        self.bar.pack(fill="x")
        grid = ttk.Frame(prog)
        grid.pack(fill="x", pady=(6, 0))
        for i, (k, name) in enumerate(APPS):
            ttk.Label(grid, text=name, width=9).grid(row=i, column=0, sticky="w")
            ttk.Label(grid, textvariable=self.status[k]).grid(row=i, column=1, sticky="w")

        tabs = ttk.Notebook(self)
        tabs.pack(fill="both", expand=True, padx=10, pady=10)
        self.console = scrolledtext.ScrolledText(tabs, height=12, font=("Menlo", 11), state="disabled")
        tabs.add(self.console, text="Console")
        dbg = ttk.Frame(tabs)
        tabs.add(dbg, text="Debug logs")
        pick = ttk.Frame(dbg)
        pick.pack(fill="x", pady=(4, 2))
        ttk.Label(pick, text="Log").pack(side="left", padx=(4, 6))
        self.log_box = ttk.Combobox(pick, state="readonly", width=40, values=[])
        self.log_box.pack(side="left")
        self.log_box.bind("<<ComboboxSelected>>", lambda e: self.show_log())
        ttk.Button(pick, text="Open folder", command=self.open_folder).pack(side="left", padx=8)
        self.debug = scrolledtext.ScrolledText(dbg, height=12, font=("Menlo", 11), state="disabled")
        self.debug.pack(fill="both", expand=True)
        self.sync_launch()

    def refresh_sims(self):
        self.sims = simulators()
        self.sim_box["values"] = [l for l, _ in self.sims] or ["(none found)"]
        if self.sims:
            self.sim_box.current(0)

    def sync_launch(self):
        picked = [k for k, _ in APPS if self.app_vars[k].get()]
        self.launch_box["values"] = picked + ["none"]
        if self.launch_var.get() not in picked + ["none"]:
            self.launch_var.set(picked[0] if picked else "none")
        for k, _ in APPS:
            if self.proc is None:
                self.status[k].set("waiting" if self.app_vars[k].get() else "not selected")

    # ---- running ------------------------------------------------------------------------------------------------------------
    def start(self):
        picked = [k for k, _ in APPS if self.app_vars[k].get()]
        if not picked:
            messagebox.showinfo("Nothing to install", "Pick at least one app.")
            return
        if not self.sims:
            messagebox.showerror("No simulator", "No iOS simulator was found. Install one in Xcode > Settings > Platforms.")
            return
        env = dict(os.environ)
        env["APPS"] = " ".join(picked)
        env["LAUNCH"] = self.launch_var.get()
        env["SIM"] = self.sims[self.sim_box.current()][1]
        if self.keep_builds.get():
            env["KEEP_BUILDS"] = "1"
        if self.no_web.get():
            env["NO_WEB"] = "1"
        if self.flutter_var.get().strip():
            env["FLUTTER"] = self.flutter_var.get().strip()
        self.clear(self.console)
        self.clear(self.debug)
        self.log_dir = None
        self.log_box["values"] = []
        self._tail_pos = {}
        self.bar["value"] = 0
        self.picked = picked
        self.done = 0
        for k, _ in APPS:
            self.status[k].set("waiting" if k in picked else "not selected")
        self.stage.set("Starting...")
        # Its own process group, so Stop can send Ctrl-C to the script and everything it started.
        self.proc = subprocess.Popen(["bash", SCRIPT], cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1, start_new_session=True)
        self.start_btn.config(state="disabled")
        self.stop_btn.config(state="normal")
        threading.Thread(target=self.reader, daemon=True).start()

    def reader(self):
        for line in self.proc.stdout:
            self.lines.put(line)
        self.lines.put(None)

    def stop(self):
        if self.proc and self.proc.poll() is None:
            self.stage.set("Stopping...")
            try:
                os.killpg(self.proc.pid, signal.SIGINT)
            except ProcessLookupError:
                pass

    def on_close(self):
        if self.proc and self.proc.poll() is None:
            if not messagebox.askyesno("Stop everything?", "The stack is running. Closing the window stops it."):
                return
            self.stop()
            try:
                self.proc.wait(timeout=20)
            except subprocess.TimeoutExpired:
                os.killpg(self.proc.pid, signal.SIGTERM)
        self.destroy()

    # ---- output -------------------------------------------------------------------------------------------------------------
    def drain(self):
        try:
            while True:
                line = self.lines.get_nowait()
                if line is None:
                    self.finished()
                    continue
                self.append(self.console, line)
                self.parse(line)
        except queue.Empty:
            pass
        self.after(150, self.drain)

    def finished(self):
        code = self.proc.wait() if self.proc else 0
        self.stage.set("Stopped" if code in (0, 130, -2) else "Stopped (exit %s)" % code)
        self.proc = None
        self.start_btn.config(state="normal")
        self.stop_btn.config(state="disabled")

    def parse(self, line):
        s = line.strip()
        total = max(len(self.picked), 1)
        m = re.search(r"\[(\d)/3\]", s)
        if m:
            self.stage.set({"0": "Preparing Flutter", "1": "Starting the stack", "2": "Booting the simulator", "3": "Building the apps"}[m.group(1)])
        if "simulator " in s and "[2/3]" not in s:
            self.stage.set("Simulator ready")
        m = re.match(r"(teacher|staff|parent|driver): (.+)", s)
        if m:
            app, what = m.groups()
            if app in self.status:
                if what.startswith("building"):
                    self.status[app].set("building...")
                    self.stage.set("Building the %s app" % app)
                elif what.startswith("installed"):
                    self.status[app].set("installed")
                    self.done += 1
                elif what.startswith("launched"):
                    self.status[app].set("installed, opened")
                elif "FAILED" in what or "failed" in what:
                    self.status[app].set("FAILED (see Debug logs)")
                    self.done += 1
                self.bar["value"] = 100.0 * self.done / total
        if "cleared old builds" in s:
            self.stage.set("Cleared old builds")
        m = re.match(r"Logs: ([^\s]+?)\.?(?:\s|$)", s)
        if m:
            self.set_log_dir(m.group(1))
        m = re.search(r"\(log: (\S+?)/stack\.log\)", s)
        if m:
            self.set_log_dir(m.group(1))
        if s.startswith("Ready."):
            self.stage.set("Running. Sign in with the demo accounts below")
            self.bar["value"] = 100

    # ---- debug logs ---------------------------------------------------------------------------------------------------------
    def set_log_dir(self, path):
        if path != self.log_dir:
            self.log_dir = path
            self.refresh_log_list()

    def refresh_log_list(self):
        if not self.log_dir:
            return
        names = sorted(os.path.basename(p) for p in glob.glob(os.path.join(self.log_dir, "*.log")))
        if names != list(self.log_box["values"]):
            self.log_box["values"] = names
            if not self.log_box.get() and names:
                self.log_box.set("stack.log" if "stack.log" in names else names[0])
                self.show_log()

    def show_log(self):
        self.clear(self.debug)
        self._tail_pos[self.log_box.get()] = 0
        self.tail_logs(once=True)

    def tail_logs(self, once=False):
        """Appends what the selected log gained since last looked (the stack log has the emulators, gateway and web apps)."""
        self.refresh_log_list()
        name = self.log_box.get()
        if self.log_dir and name:
            path = os.path.join(self.log_dir, name)
            try:
                with open(path, "r", errors="replace") as f:
                    f.seek(self._tail_pos.get(name, 0))
                    chunk = f.read()
                    self._tail_pos[name] = f.tell()
                if chunk:
                    self.append(self.debug, chunk)
            except OSError:
                pass
        if not once:
            self.after(1000, self.tail_logs)

    def open_folder(self):
        if self.log_dir:
            subprocess.Popen(["open", self.log_dir])

    # ---- text helpers -------------------------------------------------------------------------------------------------------
    @staticmethod
    def append(widget, text):
        widget.config(state="normal")
        widget.insert("end", text)
        widget.see("end")
        widget.config(state="disabled")

    @staticmethod
    def clear(widget):
        widget.config(state="normal")
        widget.delete("1.0", "end")
        widget.config(state="disabled")


if __name__ == "__main__":
    if not os.path.exists(SCRIPT):
        raise SystemExit("start-all.sh was not found next to this file")
    App().mainloop()
