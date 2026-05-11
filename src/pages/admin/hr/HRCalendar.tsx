import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ModuleGate } from "@/components/ModuleGate";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaveEntry {
  id: string; employee_name?: string; leave_type: string;
  start_date: string; end_date: string; days: number; status: string;
}
interface ShiftEntry {
  id: string; employee_name?: string; shift_date: string;
  start_time: string; end_time: string; role?: string;
}

const LEAVE_COLORS: Record<string, string> = {
  annual: "var(--blue)", sick: "var(--red)", unpaid: "var(--amber)", other: "var(--muted-foreground)",
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  // 0=Sun…6=Sat, convert to Mon=0
  return (new Date(year, month, 1).getDay() + 6) % 7;
}
function dateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function parseDate(s: string) { return new Date(s); }

export default function HRCalendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [leave, setLeave] = useState<LeaveEntry[]>([]);
  const [shifts, setShifts] = useState<ShiftEntry[]>([]);
  const [show, setShow] = useState<"both" | "leave" | "shifts">("both");
  const [selected, setSelected] = useState<string | null>(null);
  const token = () => localStorage.getItem("access_token");

  useEffect(() => {
    const firstDay = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDayNum = getDaysInMonth(year, month);
    const lastDay = `${year}-${String(month + 1).padStart(2, "0")}-${lastDayNum}`;

    fetch(`/api/hr/leave`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : []).then(setLeave);
    fetch(`/api/hr/shifts?date_from=${firstDay}&date_to=${lastDay}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : []).then(setShifts);
  }, [year, month]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Build a map: date string → events
  const eventMap: Record<string, { leaves: LeaveEntry[]; shifts: ShiftEntry[] }> = {};

  if (show !== "shifts") {
    leave.filter(l => l.status === "approved").forEach(l => {
      const start = parseDate(l.start_date);
      const end = parseDate(l.end_date);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        if (!eventMap[key]) eventMap[key] = { leaves: [], shifts: [] };
        eventMap[key].leaves.push(l);
      }
    });
  }
  if (show !== "leave") {
    shifts.forEach(s => {
      const key = s.shift_date.slice(0, 10);
      if (!eventMap[key]) eventMap[key] = { leaves: [], shifts: [] };
      eventMap[key].shifts.push(s);
    });
  }

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else { setMonth(m => m - 1); } };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else { setMonth(m => m + 1); } };

  const selectedEvents = selected ? eventMap[selected] : null;

  return (
    <AdminLayout>
      <ModuleGate slug="hr" moduleName="HR Module">
        <div className="space-y-5 animate-fade-in-up">

          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <CalendarDays className="w-6 h-6" style={{ color: "hsl(var(--amber))" }} />
              HR Calendar
            </h1>
            {/* Toggle */}
            <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: "hsl(var(--sidebar-bg))", border: "1px solid hsl(var(--border))" }}>
              {(["both", "leave", "shifts"] as const).map((opt) => (
                <button key={opt} onClick={() => setShow(opt)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium nav-transition capitalize"
                  style={show === opt
                    ? { background: "hsl(var(--amber)/0.12)", color: "hsl(var(--amber))", border: "1px solid hsl(var(--amber)/0.25)" }
                    : { color: "hsl(var(--muted-foreground))", border: "1px solid transparent" }}>
                  {opt === "both" ? "All" : opt === "leave" ? "Leave" : "Shifts"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            {/* Calendar */}
            <div className="card-elevated rounded-2xl p-5 flex-1">
              {/* Nav */}
              <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="p-1.5 rounded-lg nav-transition hover:bg-muted"><ChevronLeft className="w-4 h-4" /></button>
                <h2 className="text-base font-semibold">{MONTHS[month]} {year}</h2>
                <button onClick={nextMonth} className="p-1.5 rounded-lg nav-transition hover:bg-muted"><ChevronRight className="w-4 h-4" /></button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-1">
                {DAYS.map(d => (
                  <div key={d} className="text-center text-xs font-semibold pb-2" style={{ color: "hsl(var(--muted-foreground))" }}>{d}</div>
                ))}
              </div>

              {/* Cells */}
              <div className="grid grid-cols-7 gap-0.5">
                {/* Empty cells before first day */}
                {[...Array(firstDay)].map((_, i) => <div key={`e-${i}`} />)}
                {/* Day cells */}
                {[...Array(daysInMonth)].map((_, i) => {
                  const day = i + 1;
                  const key = dateStr(year, month, day);
                  const events = eventMap[key];
                  const isToday = key === today.toISOString().slice(0, 10);
                  const isSelected = key === selected;

                  return (
                    <button
                      key={day}
                      onClick={() => setSelected(isSelected ? null : key)}
                      className={cn(
                        "min-h-[56px] p-1 rounded-lg text-left nav-transition flex flex-col",
                        isSelected ? "ring-2" : ""
                      )}
                      style={{
                        background: isSelected ? "hsl(var(--amber)/0.08)" : events ? "hsl(var(--sidebar-bg))" : "transparent",
                        ringColor: isSelected ? "hsl(var(--amber))" : undefined,
                        border: isSelected ? "1px solid hsl(var(--amber)/0.4)" : "1px solid transparent",
                      }}
                    >
                      <span className={cn("text-xs font-medium w-6 h-6 rounded-full flex items-center justify-center mb-0.5",
                        isToday ? "text-primary-foreground" : "")}
                        style={isToday ? { background: "hsl(var(--amber))", color: "hsl(222 25% 8%)" } : { color: "hsl(var(--foreground))" }}>
                        {day}
                      </span>
                      {/* Event pills */}
                      <div className="space-y-0.5 w-full overflow-hidden">
                        {events?.leaves.slice(0, 2).map((l, idx) => (
                          <div key={idx} className="text-[10px] rounded px-1 truncate font-medium"
                            style={{ background: `hsl(var(${LEAVE_COLORS[l.leave_type]})/0.15)`, color: `hsl(var(${LEAVE_COLORS[l.leave_type]}))` }}>
                            {l.employee_name?.split(" ")[0]}
                          </div>
                        ))}
                        {events?.shifts.slice(0, 1).map((s, idx) => (
                          <div key={idx} className="text-[10px] rounded px-1 truncate font-medium"
                            style={{ background: "hsl(var(--green)/0.12)", color: "hsl(var(--green))" }}>
                            {s.employee_name?.split(" ")[0]} {s.start_time}
                          </div>
                        ))}
                        {events && (events.leaves.length + events.shifts.length) > 3 && (
                          <div className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>+{events.leaves.length + events.shifts.length - 3} more</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Side panel */}
            {selected && (
              <div className="card-elevated rounded-2xl p-5 w-72 flex-shrink-0">
                <h3 className="font-semibold text-sm mb-3">
                  {new Date(selected).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}
                </h3>
                {!selectedEvents || (selectedEvents.leaves.length === 0 && selectedEvents.shifts.length === 0) ? (
                  <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>No events.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedEvents.leaves.map((l) => (
                      <div key={l.id} className="rounded-lg p-3" style={{ background: `hsl(var(${LEAVE_COLORS[l.leave_type]})/0.08)`, border: `1px solid hsl(var(${LEAVE_COLORS[l.leave_type]})/0.2)` }}>
                        <p className="text-xs font-semibold capitalize" style={{ color: `hsl(var(${LEAVE_COLORS[l.leave_type]}))` }}>{l.leave_type} Leave</p>
                        <p className="text-sm mt-0.5">{l.employee_name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>{l.days} day{l.days !== 1 ? "s" : ""}</p>
                      </div>
                    ))}
                    {selectedEvents.shifts.map((s) => (
                      <div key={s.id} className="rounded-lg p-3" style={{ background: "hsl(var(--green)/0.08)", border: "1px solid hsl(var(--green)/0.2)" }}>
                        <p className="text-xs font-semibold" style={{ color: "hsl(var(--green))" }}>Shift</p>
                        <p className="text-sm mt-0.5">{s.employee_name}</p>
                        <p className="text-xs mt-0.5 font-mono" style={{ color: "hsl(var(--muted-foreground))" }}>{s.start_time} – {s.end_time}{s.role ? ` · ${s.role}` : ""}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </ModuleGate>
    </AdminLayout>
  );
}
