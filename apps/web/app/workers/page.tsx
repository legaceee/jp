"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "../components/header";
import Sidebar from "../components/sidebar";
import styles from "./workers.module.css";
import { getStoredUser } from "../utils/auth";
import { apiFetch, formatErrorMessage, readErrorMessage } from "../utils/api";
import { useToast } from "../components/toast-provider";

type Worker = {
  id: number;
  name: string;
  wage: number;
};

type AttendanceRecord = {
  attendanceDate: string;
  attendanceValue: 1 | 0.5 | 0;
};

type AttendanceSummary = {
  totalDays: number;
  totalSalary: number;
  records: AttendanceRecord[];
};

export const dynamic = "force-dynamic";
const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const statusLabel: Record<AttendanceRecord["attendanceValue"], string> = {
  1: "Present",
  0.5: "Half day",
  0: "Absent",
};

const formatAmount = (value: number, maximumFractionDigits = 0) =>
  new Intl.NumberFormat(undefined, {
    maximumFractionDigits,
  }).format(value);

function WorkersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const initialWorkerId = useMemo(() => {
    const param = searchParams.get("workerId");
    return param && Number.isFinite(Number(param)) ? Number(param) : null;
  }, [searchParams]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(
    initialWorkerId,
  );
  const [attendanceSummary, setAttendanceSummary] =
    useState<AttendanceSummary | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingAttendance, setIsFetchingAttendance] = useState(false);
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const { addToast } = useToast();

  const todayKey = useMemo(() => formatDateKey(new Date()), []);
  const initialStartDate = useMemo(() => {
    const param = searchParams.get("startDate");
    if (param && /^\d{4}-\d{2}-\d{2}$/.test(param)) {
      return param;
    }
    const now = new Date();
    return formatDateKey(new Date(now.getFullYear(), now.getMonth(), 1));
  }, [searchParams]);
  const initialEndDate = useMemo(() => {
    const param = searchParams.get("endDate");
    if (param && /^\d{4}-\d{2}-\d{2}$/.test(param)) {
      return param;
    }
    return todayKey;
  }, [searchParams, todayKey]);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);

  const selectedWorker = useMemo(
    () => workers.find((worker) => worker.id === selectedWorkerId) ?? null,
    [workers, selectedWorkerId],
  );

  const loadWorkers = useCallback(async () => {
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
      const list = data.workers ?? [];
      setWorkers(list);
      if (list.length > 0) {
        const fallbackId = list[0]!.id;
        setSelectedWorkerId((prev) => {
          if (prev) {
            return list.some((worker) => worker.id === prev)
              ? prev
              : fallbackId;
          }
          const paramId = searchParams.get("workerId");
          if (paramId && Number.isFinite(Number(paramId))) {
            const parsedId = Number(paramId);
            return list.some((worker) => worker.id === parsedId)
              ? parsedId
              : fallbackId;
          }
          return fallbackId;
        });
      }
    } catch (error) {
      const message = formatErrorMessage(error, "Request failed");
      setStatusMessage(message);
      addToast(message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [addToast, searchParams]);

  const loadAttendance = useCallback(
    async (workerId: number, rangeStart: string, rangeEnd: string) => {
      setIsFetchingAttendance(true);
      setStatusMessage(null);
      try {
        const query = new URLSearchParams({
          workerId: String(workerId),
          startDate: rangeStart,
          endDate: rangeEnd,
        });
        const response = await apiFetch(
          `/attendance/getattendance?${query.toString()}`,
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error(
            await readErrorMessage(response, "Unable to load attendance"),
          );
        }

        const data = (await response.json()) as {
          data: AttendanceSummary;
        };
        setAttendanceSummary(data.data);
      } catch (error) {
        setAttendanceSummary(null);
        const message = formatErrorMessage(error, "Request failed");
        setStatusMessage(message);
        addToast(message, "error");
      } finally {
        setIsFetchingAttendance(false);
      }
    },
    [addToast],
  );

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
  }, [isAuthed, loadWorkers]);

  useEffect(() => {
    if (selectedWorkerId) {
      void loadAttendance(selectedWorkerId, startDate, endDate);
    }
  }, [loadAttendance, selectedWorkerId, startDate, endDate]);

  useEffect(() => {
    const currentWorker = searchParams.get("workerId");
    const currentStart = searchParams.get("startDate");
    const currentEnd = searchParams.get("endDate");
    const matchesWorker = selectedWorkerId
      ? currentWorker === String(selectedWorkerId)
      : !currentWorker;

    if (matchesWorker && currentStart === startDate && currentEnd === endDate) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    if (selectedWorkerId) {
      params.set("workerId", String(selectedWorkerId));
    } else {
      params.delete("workerId");
    }
    params.set("startDate", startDate);
    params.set("endDate", endDate);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams, selectedWorkerId, startDate, endDate]);

  if (isAuthed === false) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center">
        <p className="text-sm text-zinc-500">Redirecting to sign in...</p>
      </div>
    );
  }

  const totalDays = attendanceSummary?.totalDays ?? 0;
  const totalSalary = attendanceSummary?.totalSalary ?? 0;
  const attendanceRecords = attendanceSummary?.records ?? [];

  return (
    <div className={styles.appShell}>
      <Sidebar activeItem="Workers" />

      <main className={styles.main}>
        <Header />

        <section className={styles.hero}>
          <div>
            <p className={styles.kicker}>Workers</p>
            <h1 className={styles.title}>Employee attendance profiles</h1>
            <p className={styles.subtitle}>
              Select a worker to review daily attendance records and total wages
              earned for the chosen period.
            </p>
          </div>
          <div className={styles.heroActions}>
            <button className={styles.secondaryButton} type="button">
              Download sheet
            </button>
            <button className={styles.primaryButton} type="button">
              Share report
            </button>
          </div>
        </section>

        <section className={styles.summaryGrid}>
          <article className={styles.summaryCard}>
            <h3>Total workers</h3>
            <p>{workers.length}</p>
            <span>Roster size</span>
          </article>
          <article className={styles.summaryCard}>
            <h3>Daily wage</h3>
            <p>{selectedWorker ? formatAmount(selectedWorker.wage) : "--"}</p>
            <span>Selected worker</span>
          </article>
          <article className={styles.summaryCard}>
            <h3>Days worked</h3>
            <p>{totalDays}</p>
            <span>In range</span>
          </article>
          <article className={styles.summaryCard}>
            <h3>Total salary</h3>
            <p>{formatAmount(totalSalary, 2)}</p>
            <span>Estimated payout</span>
          </article>
        </section>

        <section className={styles.contentGrid}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Workers list</h2>
                <p>Tap a worker to view the timeline.</p>
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Daily wage</th>
                    <th>Action</th>
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
                        <td data-label="Action">
                          <button
                            type="button"
                            className={`${styles.workerButton} ${
                              selectedWorkerId === worker.id
                                ? styles.workerButtonActive
                                : ""
                            }`}
                            onClick={() => setSelectedWorkerId(worker.id)}
                          >
                            {selectedWorkerId === worker.id
                              ? "Selected"
                              : "View"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.sideColumn}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2>Attendance range</h2>
                  <p>
                    {selectedWorker
                      ? `Worker: ${selectedWorker.name}`
                      : "Select a worker"}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <label className={styles.helperNote}>
                  Start date
                  <input
                    className={styles.dateField}
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                  />
                </label>

                <label className={styles.helperNote}>
                  End date
                  <input
                    className={styles.dateField}
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                  />
                </label>

                <p className={styles.helperNote}>
                  {isFetchingAttendance
                    ? "Loading attendance..."
                    : "Data updates automatically."}
                </p>

                {statusMessage ? (
                  <p className={styles.statusMessage}>{statusMessage}</p>
                ) : null}
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2>Attendance log</h2>
                  <p>Daily status and earned wage.</p>
                </div>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Earned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isFetchingAttendance ? (
                      <tr>
                        <td colSpan={3} className={styles.emptyState}>
                          Loading attendance...
                        </td>
                      </tr>
                    ) : attendanceRecords.length === 0 ? (
                      <tr>
                        <td colSpan={3} className={styles.emptyState}>
                          No attendance records in this range.
                        </td>
                      </tr>
                    ) : (
                      attendanceRecords.map((record) => (
                        <tr key={record.attendanceDate}>
                          <td data-label="Date">
                            {new Date(record.attendanceDate).toLocaleDateString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </td>
                          <td data-label="Status">
                            <span
                              className={`${styles.statusBadge} ${
                                record.attendanceValue === 1
                                  ? styles.statusPresent
                                  : record.attendanceValue === 0
                                    ? styles.statusAbsent
                                    : ""
                              }`}
                            >
                              {statusLabel[record.attendanceValue]}
                            </span>
                          </td>
                          <td data-label="Earned">
                            {selectedWorker
                              ? formatAmount(
                                  selectedWorker.wage * record.attendanceValue,
                                  2,
                                )
                              : "--"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <WorkersContent />
    </Suspense>
  );
}
