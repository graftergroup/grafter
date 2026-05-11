import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ModuleGate } from "@/components/ModuleGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClipboardList, ChevronLeft, ChevronRight, Plus, Trash2, X } from "lucide-react";

interface Employee { id: string; first_name: string; last_name: string; role: string; }
interface Shift {
  id: string; employee_id: string; employee_name?: string;
  shift_date: string; start_time: string; end_time: string; role?: string; notes?: string;
}

function getMondayOfWeek(d: Date) {
  const day = d.getDay(); // 0=Sun
  const diff = (day + 6) % 7; // days since Mon
  const mon = new Date(d);
  mon.setDate(d.getDate() - diff);
  mon.setHours(0,0,0,0);
  return mon;
}
function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(d.getDate() + n);
  return r;
}
function dateKey(d: Date) { return d.toISOString().slice(0, 10); }
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function HRRotas() {
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(new Date()));
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editShift, setEditShift] = useState<Shift | null>(null);
  const [selEmpId, setSelEmpId] = useState("");
  const [selDate, setSelDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [shiftRole, setShiftRole] = useState("");
  const [saving, setSaving] = useState(false);
  const token = () => localStorage.getItem("access_token");

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const dateFrom = dateKey(weekDays[0]);
  const dateTo = dateKey(weekDays[6]);

  useEffect(() => {
    fetch("/api/hr/employees", { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : []).then(setEmployees);
  }, []);

  const loadShifts = useCallback(async () => {
    const res = await fetch(`/api/hr/shifts?date_from=${dateFrom}&date_to=${dateTo}`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (res.ok) setShifts(await res.json());
  }, [dateFrom, dateTo]);

  useEffect(() => { loadShifts(); }, [loadShifts]);

  const getShiftsFor = (empId: string, day: Date) => {
    const key = dateKey(day);
    return shifts.filter(s => s.employee_id === empId && s.shift_date.slice(0, 10) === key);
  };

  const openCreate = (empId: string, day: Date) => {
    setEditShift(null);
    setSelEmpId(empId);
    setSelDate(dateKey(day));
    setStartTime("09:00");
    setEndTime("17:00");
    setShiftRole("");
    setDialogOpen(true);
  };

  const openEdit = (s: Shift) => {
    setEditShift(s);
    setSelEmpId(s.employee_id);
    setSelDate(s.shift_date.slice(0, 10));
    setStartTime(s.start_time);
    setEndTime(s.end_time);
    setShiftRole(s.role ?? "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    if (editShift) {
      await fetch(`/api/hr/shifts/${editShift.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ start_time: startTime, end_time: endTime, role: shiftRole || null }),
      });
    } else {
      await fetch("/api/hr/shifts", {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: selEmpId, shift_date: selDate, start_time: startTime, end_time: endTime, role: shiftRole || null }),
      });
    }
    setSaving(false);
    setDialogOpen(false);
    loadShifts();
  };

  const handleDelete = async (shiftId: string) => {
    await fetch(`/api/hr/shifts/${shiftId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token()}` },
    });
    loadShifts();
  };

  const weekLabel = `${weekDays[0].getDate()} ${MONTH_NAMES[weekDays[0].getMonth()]} – ${weekDays[6].getDate()} ${MONTH_NAMES[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`;

  return (
    <AdminLayout>
      <ModuleGate slug="hr" moduleName="HR Module">
        <div className="space-y-5 animate-fade-in-up">

          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ClipboardList className="w-6 h-6" style={{ color: "hsl(var(--amber))" }} />
              Rotas &amp; Shifts
            </h1>
            <div className="flex items-center gap-2">
              <button onClick={() => setWeekStart(w => getMondayOfWeek(addDays(w, -7)))}
                className="p-2 rounded-lg nav-transition" style={{ background: "hsl(var(--sidebar-bg))", border: "1px solid hsl(var(--border))" }}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-foreground px-2">{weekLabel}</span>
              <button onClick={() => setWeekStart(w => getMondayOfWeek(addDays(w, 7)))}
                className="p-2 rounded-lg nav-transition" style={{ background: "hsl(var(--sidebar-bg))", border: "1px solid hsl(var(--border))" }}>
                <ChevronRight className="w-4 h-4" />
              </button>
              <Button size="sm" onClick={() => setWeekStart(getMondayOfWeek(new Date()))}
                variant="outline" className="text-xs">Today</Button>
            </div>
          </div>

          {/* Grid */}
          <div className="card-elevated rounded-2xl overflow-hidden">
            {/* Column headers */}
            <div className="grid border-b" style={{ gridTemplateColumns: "180px repeat(7, 1fr)", borderColor: "hsl(var(--border))" }}>
              <div className="p-3 text-xs font-semibold" style={{ color: "hsl(var(--muted-foreground))" }}>Employee</div>
              {weekDays.map((d, i) => {
                const isToday = dateKey(d) === dateKey(new Date());
                return (
                  <div key={i} className="p-3 text-center border-l" style={{ borderColor: "hsl(var(--border))" }}>
                    <p className="text-xs font-semibold" style={{ color: "hsl(var(--muted-foreground))" }}>{DAY_NAMES[i]}</p>
                    <p className="text-sm font-bold mt-0.5" style={{ color: isToday ? "hsl(var(--amber))" : "hsl(var(--foreground))" }}>
                      {d.getDate()}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Rows */}
            {employees.length === 0 && (
              <div className="p-8 text-center text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>No employees found.</div>
            )}
            {employees.map((emp, empIdx) => (
              <div key={emp.id} className="grid"
                style={{
                  gridTemplateColumns: "180px repeat(7, 1fr)",
                  borderTop: empIdx > 0 ? `1px solid hsl(var(--border))` : undefined,
                }}>
                {/* Employee label */}
                <div className="p-3 flex items-start gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: "hsl(var(--amber)/0.1)", color: "hsl(var(--amber))" }}>
                    {emp.first_name[0]}{emp.last_name[0]}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground leading-tight">{emp.first_name} {emp.last_name}</p>
                    <p className="text-[10px] capitalize" style={{ color: "hsl(var(--muted-foreground))" }}>{emp.role.replace(/_/g, " ")}</p>
                  </div>
                </div>

                {/* Day cells */}
                {weekDays.map((day, dayIdx) => {
                  const dayShifts = getShiftsFor(emp.id, day);
                  return (
                    <div key={dayIdx} className="p-1.5 border-l min-h-[70px] group relative"
                      style={{ borderColor: "hsl(var(--border))" }}>
                      {dayShifts.map(s => (
                        <div key={s.id}
                          className="rounded-md px-2 py-1 mb-1 text-xs cursor-pointer nav-transition relative group/shift"
                          style={{ background: "hsl(var(--green)/0.1)", border: "1px solid hsl(var(--green)/0.25)", color: "hsl(var(--green))" }}
                          onClick={() => openEdit(s)}>
                          <p className="font-semibold font-mono leading-tight">{s.start_time}–{s.end_time}</p>
                          {s.role && <p className="text-[10px] opacity-80 truncate">{s.role}</p>}
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                            className="absolute top-0.5 right-0.5 opacity-0 group-hover/shift:opacity-100 nav-transition p-0.5 rounded"
                            style={{ color: "hsl(var(--red))" }}>
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {/* Add button */}
                      <button onClick={() => openCreate(emp.id, day)}
                        className="w-full rounded-md text-xs py-1 opacity-0 group-hover:opacity-100 nav-transition flex items-center justify-center gap-1"
                        style={{ border: "1px dashed hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}>
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Shift dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{editShift ? "Edit Shift" : "Add Shift"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              {!editShift && (
                <div className="space-y-1.5">
                  <Label>Employee</Label>
                  <select value={selEmpId} onChange={e => setSelEmpId(e.target.value)}
                    className="w-full h-9 rounded-md border px-3 text-sm"
                    style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                  </select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={selDate} onChange={e => setSelDate(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Start</Label><Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>End</Label><Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} /></div>
              </div>
              <div className="space-y-1.5"><Label>Role (optional)</Label><Input value={shiftRole} onChange={e => setShiftRole(e.target.value)} placeholder="e.g. Technician" /></div>
              <div className="flex gap-2">
                {editShift && (
                  <Button variant="destructive" className="flex-1" onClick={() => { handleDelete(editShift.id); setDialogOpen(false); }}>
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                  </Button>
                )}
                <Button className="flex-1" onClick={handleSave} disabled={saving}
                  style={{ background: "hsl(var(--amber))", color: "hsl(222 25% 8%)" }}>
                  {saving ? "Saving…" : editShift ? "Save Changes" : "Add Shift"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </ModuleGate>
    </AdminLayout>
  );
}
