"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "../components/header";
import Sidebar from "../components/sidebar";
import styles from "./attendance.module.css";
import { getStoredUser } from "../utils/auth";
import { apiFetch, formatErrorMessage, readErrorMessage } from "../utils/api";
import { useToast } from "../components/toast-provider";

type AttendanceStatus = "present" | "absent" | "half-day";

type Worker = {
  id: number;
  name: string;
  wage: number;
};

const statusLabels: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  "half-day": "Half day",
};

const formatAmount = (value: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const buildDefaultAttendance = (
  list: Worker[],
  defaultStatus: AttendanceStatus = "absent",
) =>
  list.reduce(
    (acc, worker) => {
      acc[worker.id] = defaultStatus;
      return acc;
    },
    {} as Record<number, AttendanceStatus>,
  );

const getMonthGrid = (year: number, month: number) => {
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const startDay = (firstOfMonth.getDay() + 6) % 7;
  const totalDays = lastOfMonth.getDate();

  const days: Array<{ date: Date; inMonth: boolean; isToday: boolean }> = [];
  for (let i = 0; i < startDay; i += 1) {
    const date = new Date(year, month, i - startDay + 1);
    days.push({ date, inMonth: false, isToday: false });
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(year, month, day);
    const now = new Date();
    const isToday =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();
    days.push({ date, inMonth: true, isToday });
  }

  while (days.length % 7 !== 0) {
    const date = new Date(
      year,
      month + 1,
      days.length - totalDays - startDay + 1,
    );
    days.push({ date, inMonth: false, isToday: false });
  }

  return days;
};

export default function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const todayKey = useMemo(() => formatDateKey(new Date()), []);

  const initialDate = useMemo(() => {
    const param = searchParams.get("date");
    return param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : todayKey;
  }, [searchParams, todayKey]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [attendanceByDate, setAttendanceByDate] = useState<
    Record<string, Record<number, AttendanceStatus>>
  >({});
  const [form, setForm] = useState({ name: "", wage: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const { addToast } = useToast();

  const selectedDateObj = useMemo(
    () => parseDateKey(selectedDate),
    [selectedDate],
  );

  const monthGrid = useMemo(
    () =>
      getMonthGrid(selectedDateObj.getFullYear(), selectedDateObj.getMonth()),
    [selectedDateObj],
  );

  const dayAttendance = useMemo(() => {
    return (
      attendanceByDate[selectedDate] ??
      buildDefaultAttendance(workers, "absent")
    );
  }, [attendanceByDate, selectedDate, workers]);

  const summary = useMemo(() => {
    const counts = { present: 0, absent: 0, "half-day": 0 } as Record<
      AttendanceStatus,
      number
    >;
    workers.forEach((worker) => {
      const status = dayAttendance[worker.id] ?? "absent";
      counts[status] += 1;
    });
    return counts;
  }, [workers, dayAttendance]);

  const handleStatusChange = (workerId: number, status: AttendanceStatus) => {
    setAttendanceByDate((prev) => ({
      ...prev,
      [selectedDate]: {
        ...(prev[selectedDate] ?? buildDefaultAttendance(workers, "absent")),
        [workerId]: status,
      },
    }));
  };

  const attendanceValueToStatus = (value: number): AttendanceStatus => {
    if (value === 1) return "present";
    if (value === 0.5) return "half-day";
    return "absent";
  };

  const loadAttendanceForDate = async (dateKey: string) => {
    if (workers.length === 0) {
      return;
    }

    try {
      const response = await apiFetch(`/attendance/by-date?date=${dateKey}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Unable to load attendance for date",
          ),
        );
      }
      const data = (await response.json()) as {
        records: Array<{ workerId: number; attendanceValue: number }>;
      };
      const baseline = buildDefaultAttendance(workers, "absent");
      data.records.forEach((record) => {
        baseline[record.workerId] = attendanceValueToStatus(
          record.attendanceValue,
        );
      });
      setAttendanceByDate((prev) => ({
        ...prev,
        [dateKey]: baseline,
      }));
    } catch (error) {
      addToast(formatErrorMessage(error, "Request failed"), "error");
    }
  };

  const loadWorkers = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const response = await apiFetch("/worker/workers", {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Unable to load workers"),
        );
      }
      const data = (await response.json()) as { workers: Worker[] };
      setWorkers(data.workers ?? []);
    } catch (error) {
      const message = formatErrorMessage(error, "Request failed");
      setStatusMessage(message);
      addToast(message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      setIsAuthed(false);
      router.replace("/");
      return;
    }

    setIsAuthed(true);
  }, [router]);

  useEffect(() => {
    if (isAuthed) {
      void loadWorkers();
    }
  }, [isAuthed]);

  useEffect(() => {
    if (isAuthed) {
      void loadAttendanceForDate(selectedDate);
    }
  }, [isAuthed, selectedDate, workers]);

  useEffect(() => {
    const current = searchParams.get("date");
    if (current === selectedDate) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("date", selectedDate);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams, selectedDate]);

  const handleAddWorker = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const wageValue = Number.parseFloat(form.wage);
    if (!form.name.trim() || Number.isNaN(wageValue) || wageValue <= 0) {
      return;
    }

    const createWorker = async () => {
      setStatusMessage(null);
      try {
        const response = await apiFetch("/worker/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            wage: wageValue,
            isActive: true,
          }),
        });
        if (!response.ok) {
          throw new Error(
            await readErrorMessage(response, "Unable to add worker"),
          );
        }
        setForm({ name: "", wage: "" });
        setStatusMessage("Worker added");
        addToast("Worker added", "success");
        await loadWorkers();
      } catch (error) {
        const message = formatErrorMessage(error, "Request failed");
        setStatusMessage(message);
        addToast(message, "error");
      }
    };

    void createWorker();
  };

  const statusToValue: Record<AttendanceStatus, 1 | 0.5 | 0> = {
    present: 1,
    "half-day": 0.5,
    absent: 0,
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const items = workers.map((worker) => ({
        workerId: worker.id,
        attendanceValue: statusToValue[dayAttendance[worker.id] ?? "absent"],
      }));

      if (items.length === 0) {
        setStatusMessage("No workers to update");
        addToast("No workers to update", "error");
        setIsSaving(false);
        return;
      }

      const responses = await Promise.all(
        items.map((item) =>
          apiFetch("/attendance/editattendance", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workerId: item.workerId,
              attendanceDate: selectedDate,
              attendanceValue: item.attendanceValue,
            }),
          }),
        ),
      );

      if (responses.some((response) => !response.ok)) {
        throw new Error("Unable to update attendance");
      }

      setLastSaved(`Saved at ${new Date().toLocaleTimeString()}`);
      setStatusMessage("Attendance updated");
      addToast("Attendance updated", "success");
    } catch (error) {
      const message = formatErrorMessage(error, "Request failed");
      setStatusMessage(message);
      addToast(message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isAuthed === false) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center">
        <p className="text-sm text-zinc-500">Redirecting to sign in...</p>
      </div>
    );
  }

  return (
    <div className={styles.appShell}>
      <Sidebar activeItem="Attendance" />

      <main className={styles.main}>
        <Header />

        <section className={styles.hero}>
          <div>
            <p className={styles.kicker}>Attendance</p>
            <h1 className={styles.title}>Daily attendance overview</h1>
            <p className={styles.subtitle}>
              Review the roster, confirm attendance status, and update wages in
              a single workspace.
            </p>
          </div>
          <div className={styles.heroActions}>
            <button className={styles.primaryButton} type="button">
              Export report
            </button>
            <button className={styles.secondaryButton} type="button">
              Payroll sync
            </button>
          </div>
        </section>

        <section className={styles.summaryGrid}>
          <article className={styles.summaryCard}>
            <h3>Present</h3>
            <p>{summary.present}</p>
            <span>On-site today</span>
          </article>
          <article className={styles.summaryCard}>
            <h3>Absent</h3>
            <p>{summary.absent}</p>
            <span>Needs follow-up</span>
          </article>
          <article className={styles.summaryCard}>
            <h3>Half day</h3>
            <p>{summary["half-day"]}</p>
            <span>Leaving early</span>
          </article>
          <article className={styles.summaryCard}>
            <h3>Roster size</h3>
            <p>{workers.length}</p>
            <span>Active workers</span>
          </article>
        </section>

        <section className={styles.contentGrid}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Attendance log</h2>
                <p>
                  For{" "}
                  {selectedDateObj.toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div className={styles.panelActions}>
                <button className={styles.ghostButton} type="button">
                  Filters
                </button>
                <button
                  className={styles.primaryButton}
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Update attendance"}
                </button>
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Daily wage</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={3} className={styles.emptyState}>
                        Loading workers...
                      </td>
                    </tr>
                  ) : workers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className={styles.emptyState}>
                        No workers yet. Add one to get started.
                      </td>
                    </tr>
                  ) : (
                    workers.map((worker) => (
                      <tr key={worker.id}>
                        <td data-label="Name">
                          <div className={styles.workerCell}>
                            <span className={styles.workerAvatar}>
                              {worker.name
                                .split(" ")
                                .map((chunk) => chunk[0])
                                .join("")}
                            </span>
                            <div>
                              <p>{worker.name}</p>
                              <span>#{worker.id}</span>
                            </div>
                          </div>
                        </td>
                        <td data-label="Daily wage">
                          {formatAmount(worker.wage)}
                        </td>
                        <td data-label="Status">
                          <select
                            className={styles.statusSelect}
                            value={dayAttendance[worker.id] ?? "absent"}
                            onChange={(event) =>
                              handleStatusChange(
                                worker.id,
                                event.target.value as AttendanceStatus,
                              )
                            }
                          >
                            {Object.entries(statusLabels).map(
                              ([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ),
                            )}
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {lastSaved ? <p className={styles.savedNote}>{lastSaved}</p> : null}
            {statusMessage ? (
              <p className={styles.statusMessage}>{statusMessage}</p>
            ) : null}
          </div>

          <aside className={styles.sideColumn}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2>Calendar</h2>
                  <p>Pick a day to review attendance.</p>
                </div>
                <input
                  className={styles.datePicker}
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                />
              </div>

              <div className={styles.calendar}>
                <div className={styles.calendarHeader}>
                  <h3>
                    {selectedDateObj.toLocaleDateString(undefined, {
                      month: "long",
                      year: "numeric",
                    })}
                  </h3>
                </div>
                <div className={styles.calendarGrid}>
                  {weekDays.map((day) => (
                    <span key={day} className={styles.calendarWeekday}>
                      {day}
                    </span>
                  ))}
                  {monthGrid.map((item) => {
                    const key = formatDateKey(item.date);
                    const isSelected = key === selectedDate;
                    return (
                      <button
                        key={key}
                        className={`${styles.calendarDay} ${
                          item.inMonth ? styles.inMonth : styles.outMonth
                        } ${isSelected ? styles.selectedDay : ""} ${
                          item.isToday ? styles.today : ""
                        }`}
                        type="button"
                        onClick={() => setSelectedDate(key)}
                      >
                        {item.date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2>Add worker</h2>
                  <p>Only name and wage are required.</p>
                </div>
              </div>
              <form className={styles.form} onSubmit={handleAddWorker}>
                <label className={styles.field}>
                  Full name
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    placeholder="Worker name"
                  />
                </label>
                <label className={styles.field}>
                  Wage (daily)
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.wage}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, wage: event.target.value }))
                    }
                    placeholder="0"
                  />
                </label>
                <button className={styles.primaryButton} type="submit">
                  Add worker
                </button>
              </form>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
