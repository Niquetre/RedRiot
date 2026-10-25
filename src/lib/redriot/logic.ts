import {
  addDaysIso,
  daysBetween,
  fromMin,
  isoDate,
  mondayOf,
  monthDiff,
  rangesOverlap,
  toMin,
  weekday,
} from "./dates.ts";
import type {
  AppData,
  CalendarEvent,
  ClassSlot,
  DetailKind,
  Habit,
  Importance,
  ScheduleOverride,
  Task,
  Urgency,
} from "./types.ts";

export const IMPORTANCE_LABEL: Record<Importance, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
};

export const URGENCY_LABEL: Record<Urgency, string> = {
  "sin-apuro": "Sin apuro",
  proxima: "Próxima",
  hoy: "Para hoy",
  vencida: "Vencida",
};

export function subjectName(data: AppData, id?: string): string {
  if (!id) return "Sin materia";
  return data.subjects.find((s) => s.id === id)?.name ?? "Materia eliminada";
}

export function subjectById(data: AppData, id?: string) {
  if (!id) return undefined;
  return data.subjects.find((s) => s.id === id);
}

export function computedUrgency(task: Task, today: string): Urgency {
  if (!task.dueDate) return "sin-apuro";
  if (task.dueDate < today) return "vencida";
  if (task.dueDate === today) return "hoy";
  if (task.dueDate <= addDaysIso(today, 3)) return "proxima";
  return "sin-apuro";
}

export function effectiveUrgency(task: Task, today: string): Urgency {
  return task.urgencyOverride ?? computedUrgency(task, today);
}

const IMPORTANCE_SCORE: Record<Importance, number> = { baja: 8, media: 18, alta: 32 };
const URGENCY_SCORE: Record<Urgency, number> = {
  "sin-apuro": 4,
  proxima: 16,
  hoy: 30,
  vencida: 42,
};

export function taskScore(task: Task, today: string): number {
  if (task.status !== "pendiente") return -1;
  const urgency = effectiveUrgency(task, today);
  const lengthPenalty = Math.min(task.estimatedMin || 30, 180) / 25;
  return (
    (task.pinned ? 1000 : 0) +
    IMPORTANCE_SCORE[task.importance] +
    URGENCY_SCORE[urgency] -
    lengthPenalty
  );
}

export function priorityReason(task: Task, today: string): string {
  const bits = [
    URGENCY_LABEL[effectiveUrgency(task, today)],
    `importancia ${IMPORTANCE_LABEL[task.importance].toLowerCase()}`,
  ];
  if (task.estimatedMin) bits.push(`${task.estimatedMin} min`);
  if (task.pinned) bits.unshift("La marcaste primero");
  if (task.dueDate && task.dueDate < today && task.urgencyOverride && task.urgencyOverride !== "vencida") {
    bits.push("la fecha ya pasó");
  }
  return bits.join(" · ");
}

export function topThree(data: AppData, today: string): Task[] {
  return data.tasks
    .filter((t) => t.status === "pendiente")
    .sort((a, b) => taskScore(b, today) - taskScore(a, today) || a.title.localeCompare(b.title))
    .slice(0, 3);
}

export function normText(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function findDuplicateTask(data: AppData, title: string, dueDate?: string): Task | undefined {
  const n = normText(title);
  if (!n) return undefined;
  return data.tasks.find(
    (t) => t.status !== "cancelada" && normText(t.title) === n && (t.dueDate ?? "") === (dueDate ?? ""),
  );
}

export function findDuplicateEvent(data: AppData, title: string, date: string): CalendarEvent | undefined {
  const n = normText(title);
  return data.events.find(
    (e) => !e.cancelled && !e.isException && normText(e.title) === n && e.date === date,
  );
}

function eventOccursOn(ev: CalendarEvent, date: string): boolean {
  if (ev.cancelled || ev.isException || ev.seriesId) return false;
  if (!ev.recurrence) return ev.date === date;
  if (date < ev.date) return false;
  if (ev.recurrence.until && date > ev.recurrence.until) return false;
  const interval = Math.max(1, ev.recurrence.interval || 1);
  if (ev.recurrence.freq === "daily") return daysBetween(ev.date, date) % interval === 0;
  if (ev.recurrence.freq === "weekly") {
    const days = ev.recurrence.weekdays?.length ? ev.recurrence.weekdays : [weekday(ev.date)];
    if (!days.includes(weekday(date))) return false;
    const weeks = daysBetween(mondayOf(ev.date), mondayOf(date)) / 7;
    return weeks % interval === 0;
  }
  if (date.slice(8, 10) !== ev.date.slice(8, 10)) return false;
  return monthDiff(ev.date, date) % interval === 0;
}

export function resolveEvent(data: AppData, id: string, date?: string): CalendarEvent | undefined {
  const direct = data.events.find((e) => e.id === id);
  if (!direct) return undefined;
  if (!date || direct.isException || !direct.recurrence) return direct;
  const exception = data.events.find((e) => e.seriesId === direct.id && e.exceptionDate === date);
  if (exception) return exception;
  if (!eventOccursOn(direct, date)) return direct;
  return { ...direct, date };
}

export interface AgendaEntry {
  key: string;
  kind: "clase" | "tarea" | "examen" | "evento" | "rutina" | "estudio";
  id: string;
  title: string;
  date: string;
  start?: string;
  end?: string;
  startMin: number | null;
  endMin: number | null;
  meta: string;
  done?: boolean;
  swatch?: string;
  detail: DetailKind;
  muted?: boolean;
}

function span(start?: string, fallbackDur = 50): { startMin: number | null; endMin: number | null; end?: string } {
  const startMin = toMin(start);
  if (startMin == null) return { startMin: null, endMin: null };
  return { startMin, endMin: startMin + fallbackDur, end: fromMin(startMin + fallbackDur) };
}

export function slotOnDate(
  slot: ClassSlot,
  date: string,
  overrides: ScheduleOverride[],
): { start: string; end: string; room: string; cancelled: boolean } | null {
  if (slot.onlyDate) {
    if (slot.onlyDate !== date) return null;
  } else if (weekday(date) !== slot.weekday) return null;
  const override = overrides.find((o) => o.slotId === slot.id && o.date === date);
  if (override?.cancelled) {
    return { start: slot.start, end: slot.end, room: slot.room, cancelled: true };
  }
  return {
    start: override?.start || slot.start,
    end: override?.end || slot.end,
    room: override?.room ?? slot.room,
    cancelled: false,
  };
}

export function entriesOn(data: AppData, date: string): AgendaEntry[] {
  const items: AgendaEntry[] = [];

  for (const slot of data.slots) {
    const resolved = slotOnDate(slot, date, data.overrides);
    if (!resolved) continue;
    const subject = subjectById(data, slot.subjectId);
    const startMin = toMin(resolved.start);
    const endMin = toMin(resolved.end);
    items.push({
      key: `clase:${slot.id}:${date}`,
      kind: "clase",
      id: slot.id,
      title: subject?.name ?? "Clase",
      date,
      start: resolved.start,
      end: resolved.end,
      startMin: resolved.cancelled ? null : startMin,
      endMin: resolved.cancelled ? null : endMin,
      meta: resolved.cancelled ? "Suspendida solo este día" : [subject?.teacher, resolved.room].filter(Boolean).join(" · ") || "Clase",
      swatch: subject?.color,
      detail: "clase",
      muted: resolved.cancelled,
    });
  }

  for (const task of data.tasks) {
    if (task.status === "cancelada" || task.dueDate !== date) continue;
    const timed = span(task.dueTime, 30);
    items.push({
      key: `tarea:${task.id}:${date}`,
      kind: "tarea",
      id: task.id,
      title: task.title,
      date,
      start: task.dueTime,
      end: task.dueTime ? timed.end : undefined,
      startMin: timed.startMin,
      endMin: task.dueTime ? timed.endMin : null,
      meta: subjectName(data, task.subjectId),
      done: task.status === "hecha",
      detail: "tarea",
    });
  }

  for (const exam of data.exams) {
    if (exam.date !== date) continue;
    const timed = span(exam.time, 90);
    items.push({
      key: `examen:${exam.id}`,
      kind: "examen",
      id: exam.id,
      title: exam.title,
      date,
      start: exam.time,
      end: exam.time ? timed.end : undefined,
      startMin: timed.startMin,
      endMin: exam.time ? timed.endMin : null,
      meta: subjectName(data, exam.subjectId),
      detail: "examen",
    });
  }

  for (const ev of data.events) {
    if (ev.isException || ev.seriesId) continue;
    if (!eventOccursOn(ev, date) && ev.date !== date) continue;
    if (!ev.recurrence && ev.date !== date) continue;
    const exception = data.events.find((e) => e.seriesId === ev.id && e.exceptionDate === date);
    if (exception?.cancelled) continue;
    const shown = exception ?? ev;
    const startMin = toMin(shown.time);
    const endMin = toMin(shown.endTime) ?? (startMin == null ? null : startMin + 60);
    items.push({
      key: `evento:${ev.id}:${date}`,
      kind: "evento",
      id: ev.id,
      title: shown.title,
      date,
      start: shown.time,
      end: shown.endTime,
      startMin,
      endMin,
      meta: shown.category || "Evento",
      detail: "evento",
    });
  }

  for (const routine of data.routines) {
    if (routine.paused || !routine.weekdays.includes(weekday(date))) continue;
    const startMin = toMin(routine.time);
    const endMin = startMin == null ? null : startMin + (routine.durationMin || 20);
    const log = routine.logs.find((l) => l.date === date);
    const total = routine.steps.length;
    const doneSteps = total ? routine.steps.filter((s) => log?.steps[s.id]).length : 0;
    items.push({
      key: `rutina:${routine.id}:${date}`,
      kind: "rutina",
      id: routine.id,
      title: routine.title,
      date,
      start: routine.time,
      end: endMin == null ? undefined : fromMin(endMin),
      startMin,
      endMin,
      meta: total ? `${doneSteps}/${total} pasos` : "Rutina",
      done: total > 0 && doneSteps === total,
      detail: "rutina",
    });
  }

  for (const session of data.sessions) {
    if (session.date !== date || session.status === "planificada" && !session.time) {
      if (session.date !== date) continue;
    }
    if (session.date !== date) continue;
    const startMin = toMin(session.time);
    const endMin = startMin == null ? null : startMin + (session.plannedMin || 25);
    items.push({
      key: `estudio:${session.id}`,
      kind: "estudio",
      id: session.id,
      title: session.title,
      date,
      start: session.time,
      end: endMin == null ? undefined : fromMin(endMin),
      startMin,
      endMin: session.time ? endMin : null,
      meta: session.status === "finalizada" ? "Estudio hecho" : "Estudio",
      done: session.status === "finalizada",
      detail: "sesion",
    });
  }

  return items.sort((a, b) => {
    if (a.startMin == null && b.startMin == null) return a.title.localeCompare(b.title);
    if (a.startMin == null) return -1;
    if (b.startMin == null) return 1;
    return a.startMin - b.startMin;
  });
}

export interface Conflict {
  a: string;
  b: string;
  date: string;
}

export function conflictsOn(data: AppData, date: string): Conflict[] {
  const timed = entriesOn(data, date).filter((e) => e.startMin != null && e.endMin != null && !e.done && !e.muted);
  const found: Conflict[] = [];
  for (let i = 0; i < timed.length; i++) {
    for (let j = i + 1; j < timed.length; j++) {
      const a = timed[i];
      const b = timed[j];
      if (rangesOverlap(a.startMin!, a.endMin!, b.startMin!, b.endMin!)) {
        found.push({ a: a.title, b: b.title, date });
      }
    }
  }
  return found;
}

export function nextClass(data: AppData, now = new Date()) {
  const today = isoDate(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (let i = 0; i < 21; i++) {
    const date = addDaysIso(today, i);
    const classes = entriesOn(data, date).filter((e) => e.kind === "clase");
    const upcoming = classes.find((c) => date > today || (c.endMin ?? 0) > nowMin);
    if (upcoming) return upcoming;
  }
  return null;
}

export function habitScheduledOn(habit: Habit, date: string): boolean {
  const day = weekday(date);
  if (habit.frequency === "diaria") {
    return habit.weekdays.length ? habit.weekdays.includes(day) : true;
  }
  if (habit.frequency === "personalizada") return habit.weekdays.includes(day);
  return false;
}

export function habitLog(habit: Habit, date: string) {
  return habit.logs.find((l) => l.date === date);
}

export function periodCount(habit: Habit, today: string): { done: number; target: number; label: string } {
  if (habit.frequency === "semanal") {
    const start = mondayOf(today);
    let done = 0;
    for (let i = 0; i < 7; i++) {
      const date = addDaysIso(start, i);
      if (date > today) break;
      if (habitLog(habit, date)?.status === "hecha") done++;
    }
    return { done, target: Math.max(1, habit.target || 1), label: "esta semana" };
  }
  if (habit.frequency === "mensual") {
    const prefix = today.slice(0, 7);
    const done = habit.logs.filter((l) => l.date.startsWith(prefix) && l.date <= today && l.status === "hecha").length;
    return { done, target: Math.max(1, habit.target || 1), label: "este mes" };
  }
  const mark = habitLog(habit, today);
  return {
    done: mark?.status === "hecha" ? 1 : 0,
    target: 1,
    label: "hoy",
  };
}

export function habitStreak(habit: Habit, today: string): number {
  if (habit.frequency === "semanal") {
    let cursor = mondayOf(today);
    const current = periodCount(habit, today).done;
    if (current < Math.max(1, habit.target || 1)) cursor = addDaysIso(cursor, -7);
    let streak = 0;
    for (let i = 0; i < 60; i++) {
      let done = 0;
      for (let d = 0; d < 7; d++) {
        if (habitLog(habit, addDaysIso(cursor, d))?.status === "hecha") done++;
      }
      if (done >= Math.max(1, habit.target || 1)) {
        streak++;
        cursor = addDaysIso(cursor, -7);
      } else break;
    }
    return streak;
  }
  if (habit.frequency === "mensual") {
    const target = Math.max(1, habit.target || 1);
    let y = Number(today.slice(0, 4));
    let m = Number(today.slice(5, 7));
    const countMonth = (year: number, month: number, upto?: string) =>
      habit.logs.filter((l) => {
        if (l.status !== "hecha") return false;
        const [yy, mm] = l.date.split("-");
        if (Number(yy) !== year || Number(mm) !== month) return false;
        return !upto || l.date <= upto;
      }).length;
    if (countMonth(y, m, today) < target) {
      m -= 1;
      if (m === 0) {
        m = 12;
        y -= 1;
      }
    }
    let streak = 0;
    for (let i = 0; i < 36; i++) {
      if (countMonth(y, m) >= target) {
        streak++;
        m -= 1;
        if (m === 0) {
          m = 12;
          y -= 1;
        }
      } else break;
    }
    return streak;
  }

  let cursor = today;
  if (habitScheduledOn(habit, today)) {
    const log = habitLog(habit, today);
    if (!log || (log.status !== "hecha" && log.status !== "na")) cursor = addDaysIso(today, -1);
  }
  let streak = 0;
  for (let i = 0; i < 500; i++) {
    if (!habitScheduledOn(habit, cursor)) {
      cursor = addDaysIso(cursor, -1);
      continue;
    }
    const log = habitLog(habit, cursor);
    if (log?.status === "na") {
      cursor = addDaysIso(cursor, -1);
      continue;
    }
    if (log?.status === "hecha") {
      streak++;
      cursor = addDaysIso(cursor, -1);
      continue;
    }
    break;
  }
  return streak;
}

export function dayProgress(data: AppData, date: string): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const task of data.tasks) {
    if (task.dueDate !== date || task.status === "cancelada") continue;
    total++;
    if (task.status === "hecha") done++;
  }
  for (const habit of data.habits) {
    if (!habitScheduledOn(habit, date)) continue;
    if (habitLog(habit, date)?.status === "na") continue;
    total++;
    if (habitLog(habit, date)?.status === "hecha") done++;
  }
  for (const routine of data.routines) {
    if (routine.paused || !routine.weekdays.includes(weekday(date))) continue;
    const log = routine.logs.find((l) => l.date === date);
    for (const step of routine.steps) {
      total++;
      if (log?.steps[step.id]) done++;
    }
  }
  return { done, total };
}

export interface StudyBlock {
  id: string;
  title: string;
  date: string;
  start: string;
  end: string;
  minutes: number;
  taskId?: string;
  examId?: string;
  subjectId?: string;
}

export function proposeWeek(
  data: AppData,
  today: string,
  nowMin: number,
): { blocks: StudyBlock[]; skipped: { title: string; reason: string }[] } {
  const blocks: StudyBlock[] = [];
  const skipped: { title: string; reason: string }[] = [];
  const occupied = new Map<string, { start: number; end: number }[]>();

  const takeBusy = (date: string) => {
    if (!occupied.has(date)) {
      occupied.set(
        date,
        entriesOn(data, date)
          .filter((e) => e.startMin != null && e.endMin != null)
          .map((e) => ({ start: e.startMin!, end: e.endMin! })),
      );
    }
    return occupied.get(date)!;
  };

  type Job = {
    title: string;
    minutes: number;
    score: number;
    lastDate: string;
    lastMin: number | null;
    taskId?: string;
    examId?: string;
    subjectId?: string;
  };

  const jobs: Job[] = [];
  for (const task of data.tasks) {
    if (task.status !== "pendiente") continue;
    jobs.push({
      title: task.title,
      minutes: Math.min(120, Math.max(20, task.estimatedMin || 40)),
      score: taskScore(task, today),
      lastDate: task.dueDate && task.dueDate >= today ? task.dueDate : addDaysIso(today, 6),
      lastMin: task.dueDate ? toMin(task.dueTime) : null,
      taskId: task.id,
      subjectId: task.subjectId,
    });
  }
  for (const exam of data.exams) {
    if (exam.date < today) continue;
    const has = data.sessions.some((s) => s.examId === exam.id && s.status !== "finalizada");
    if (has) continue;
    jobs.push({
      title: `Preparar: ${exam.title}`,
      minutes: 50,
      score: 70 + IMPORTANCE_SCORE[exam.importance],
      lastDate: exam.date,
      lastMin: toMin(exam.time),
      examId: exam.id,
      subjectId: exam.subjectId,
    });
  }
  jobs.sort((a, b) => b.score - a.score);

  for (const job of jobs) {
    let placed = false;
    for (let offset = 0; offset < 8 && !placed; offset++) {
      const date = addDaysIso(today, offset);
      if (date > job.lastDate) break;
      const busy = takeBusy(date);
      let cursor = 7 * 60;
      if (date === today) cursor = Math.max(cursor, Math.ceil((nowMin + 10) / 15) * 15);
      const limit = date === job.lastDate && job.lastMin != null ? Math.min(21 * 60, job.lastMin) : 21 * 60;
      while (cursor + job.minutes <= limit) {
        const end = cursor + job.minutes;
        const hit = busy.some((b) => rangesOverlap(cursor, end, b.start, b.end));
        if (!hit) {
          busy.push({ start: cursor, end });
          blocks.push({
            id: `${job.taskId ?? job.examId}-${date}-${cursor}`,
            title: job.title,
            date,
            start: fromMin(cursor),
            end: fromMin(end),
            minutes: job.minutes,
            taskId: job.taskId,
            examId: job.examId,
            subjectId: job.subjectId,
          });
          placed = true;
          break;
        }
        cursor += 15;
      }
    }
    if (!placed) skipped.push({ title: job.title, reason: "No hay un hueco libre sin pisar otro compromiso." });
  }
  return { blocks, skipped };
}

export function subjectUsage(data: AppData, id: string) {
  return {
    slots: data.slots.filter((s) => s.subjectId === id).length,
    tasks: data.tasks.filter((t) => t.subjectId === id).length,
    exams: data.exams.filter((e) => e.subjectId === id).length,
    sessions: data.sessions.filter((s) => s.subjectId === id).length,
    notes: data.notes.filter((n) => n.links.some((l) => l.kind === "materia" && l.id === id)).length,
  };
}

export interface SearchHit {
  kind: DetailKind;
  id: string;
  title: string;
  meta: string;
  date?: string;
}

export function searchAll(data: AppData, query: string): SearchHit[] {
  const q = normText(query);
  if (!q) return [];
  const hits: SearchHit[] = [];
  const has = (...parts: (string | undefined)[]) => parts.some((p) => p && normText(p).includes(q));
  for (const s of data.subjects) {
    if (has(s.name, s.teacher)) hits.push({ kind: "materia", id: s.id, title: s.name, meta: s.teacher || "Materia" });
  }
  for (const t of data.tasks) {
    if (t.status === "cancelada") continue;
    if (has(t.title, t.description, t.notes, subjectName(data, t.subjectId))) {
      hits.push({ kind: "tarea", id: t.id, title: t.title, meta: "Tarea", date: t.dueDate });
    }
  }
  for (const e of data.exams) {
    if (has(e.title, e.topics, e.notes, subjectName(data, e.subjectId))) {
      hits.push({ kind: "examen", id: e.id, title: e.title, meta: "Examen", date: e.date });
    }
  }
  for (const e of data.events) {
    if (e.cancelled || e.isException) continue;
    if (has(e.title, e.description, e.category)) {
      hits.push({ kind: "evento", id: e.id, title: e.title, meta: e.category || "Evento", date: e.date });
    }
  }
  for (const r of data.routines) {
    if (has(r.title, ...r.steps.map((s) => s.title))) hits.push({ kind: "rutina", id: r.id, title: r.title, meta: "Rutina" });
  }
  for (const h of data.habits) {
    if (has(h.title)) hits.push({ kind: "habito", id: h.id, title: h.title, meta: "Hábito" });
  }
  for (const n of data.notes) {
    if (has(n.title, n.content, n.category, n.tags.join(" "))) {
      hits.push({ kind: "nota", id: n.id, title: n.title || "Nota", meta: n.category || "Nota" });
    }
  }
  for (const i of data.inbox) {
    if (i.archived) continue;
    if (has(i.title, i.notes, i.category)) hits.push({ kind: "pendiente", id: i.id, title: i.title, meta: "Pendiente" });
  }
  for (const s of data.sessions) {
    if (has(s.title)) hits.push({ kind: "sesion", id: s.id, title: s.title, meta: "Estudio", date: s.date });
  }
  return hits.slice(0, 40);
}

export interface Notice {
  key: string;
  title: string;
  body: string;
  at: number;
  late: boolean;
  refKind?: DetailKind;
  refId?: string;
}

function pushNotice(
  out: Notice[],
  seen: Set<string>,
  logged: Set<string>,
  now: number,
  key: string,
  at: number,
  body: string,
  refKind?: DetailKind,
  refId?: string,
) {
  if (logged.has(key) || seen.has(key)) return;
  if (!Number.isFinite(at)) return;
  const age = now - at;
  if (age < 0 || age > 36 * 3_600_000) return;
  seen.add(key);
  out.push({
    key,
    title: "REDRIOT",
    body,
    at,
    late: age > 2 * 60_000,
    refKind,
    refId,
  });
}

function momentOn(date: string, time: string): number {
  const d = date.split("-").map(Number);
  const t = time.split(":").map(Number);
  return new Date(d[0], d[1] - 1, d[2], t[0] || 0, t[1] || 0, 0, 0).getTime();
}

export function dueNotices(data: AppData, now = new Date()): Notice[] {
  const out: Notice[] = [];
  const seen = new Set<string>();
  const logged = new Set(data.reminderLog.map((r) => r.key));
  const nowMs = now.getTime();
  const today = isoDate(now);

  const consider = (
    date: string | undefined,
    time: string | undefined,
    reminders: { id: string; minutesBefore: number; enabled: boolean }[],
    body: string,
    refKind: DetailKind,
    refId: string,
    active: boolean,
  ) => {
    if (!active || !date) return;
    for (const reminder of reminders) {
      if (!reminder.enabled) continue;
      const clock = time || (reminder.minutesBefore >= 1440 ? "08:00" : "");
      if (!clock) continue;
      const at = momentOn(date, clock) - reminder.minutesBefore * 60_000;
      pushNotice(out, seen, logged, nowMs, `${refKind}:${refId}:${date}:${reminder.minutesBefore}`, at, body, refKind, refId);
    }
  };

  for (const task of data.tasks) {
    consider(
      task.dueDate,
      task.dueTime,
      task.reminders,
      task.dueDate && task.dueDate > today
        ? `Mañana tenés que entregar: ${task.title}.`
        : `Revisá esta tarea: ${task.title}.`,
      "tarea",
      task.id,
      task.status === "pendiente",
    );
  }
  for (const exam of data.exams) {
    consider(
      exam.date,
      exam.time,
      exam.reminders,
      exam.date > today ? `Tu examen «${exam.title}» es pronto.` : `Hoy tenés el examen «${exam.title}».`,
      "examen",
      exam.id,
      true,
    );
  }
  for (let offset = -1; offset <= 2; offset++) {
    const date = addDaysIso(today, offset);
    for (const ev of data.events) {
      if (ev.cancelled) continue;
      const shown = ev.recurrence ? resolveEvent(data, ev.id, date) : ev;
      if (!shown || shown.cancelled) continue;
      const occurs = ev.recurrence ? eventOccursOn(ev, date) || shown.exceptionDate === date : ev.date === date;
      if (!occurs) continue;
      consider(date, shown.time, shown.reminders, `Tenés «${shown.title}» en el calendario.`, "evento", ev.id, true);
    }
    for (const routine of data.routines) {
      if (routine.paused || !routine.weekdays.includes(weekday(date))) continue;
      consider(date, routine.time, routine.reminders, `Es hora de comenzar tu rutina: ${routine.title}.`, "rutina", routine.id, true);
    }
    for (const session of data.sessions) {
      if (session.date !== date || session.status === "finalizada" || !session.time) continue;
      consider(date, session.time, [{ id: "s", minutesBefore: 0, enabled: true }], `Tenés una sesión de estudio: ${session.title}.`, "sesion", session.id, true);
    }
  }

  if (data.preferences.nightReminderEnabled && data.preferences.nightReminder) {
    const at = momentOn(today, data.preferences.nightReminder);
    pushNotice(
      out,
      seen,
      logged,
      nowMs,
      `noche:${today}`,
      at,
      "Revisá tus pendientes para mañana.",
      "tarea",
      "",
    );
  }
  return out;
}

export interface Stats {
  tasksDone: number;
  tasksPending: number;
  tasksSkipped: number;
  tasksCancelled: number;
  onTime: number;
  withDueDone: number;
  examsUpcoming: number;
  examsPast: number;
  focusMin: number;
  habitRate: number;
  habitScheduled: number;
  habitDone: number;
  routineRate: number;
  routineSteps: number;
  routineDone: number;
  weekBars: { label: string; hechas: number }[];
}

export function statsBetween(data: AppData, start: string, end: string): Stats {
  const inRange = (date?: string) => !!date && date >= start && date <= end;
  const tasksDone = data.tasks.filter((t) => t.status === "hecha" && inRange(t.completedAt?.slice(0, 10) ?? t.dueDate)).length;
  const tasksPending = data.tasks.filter((t) => t.status === "pendiente").length;
  const tasksSkipped = data.tasks.filter((t) => t.status === "omitida").length;
  const tasksCancelled = data.tasks.filter((t) => t.status === "cancelada").length;
  const doneWithDue = data.tasks.filter((t) => t.status === "hecha" && t.dueDate && t.completedAt);
  const onTime = doneWithDue.filter((t) => (t.completedAt ?? "").slice(0, 10) <= (t.dueDate ?? "")).length;
  const today = isoDate();
  let habitScheduled = 0;
  let habitDone = 0;
  let routineSteps = 0;
  let routineDone = 0;
  const weekBars: { label: string; hechas: number }[] = [];
  for (let date = start; date <= end; date = addDaysIso(date, 1)) {
    let hechas = 0;
    for (const task of data.tasks) {
      if (task.status === "hecha" && (task.completedAt ?? "").slice(0, 10) === date) hechas++;
    }
    weekBars.push({ label: date.slice(8), hechas });
    for (const habit of data.habits) {
      const period = habit.frequency === "semanal" || habit.frequency === "mensual";
      const scheduled = period || habitScheduledOn(habit, date);
      if (!scheduled) continue;
      const log = habitLog(habit, date);
      if (log?.status === "na") continue;
      habitScheduled++;
      if (log?.status === "hecha") habitDone++;
    }
    for (const routine of data.routines) {
      if (routine.paused || !routine.weekdays.includes(weekday(date))) continue;
      const log = routine.logs.find((l) => l.date === date);
      for (const step of routine.steps) {
        routineSteps++;
        if (log?.steps[step.id]) routineDone++;
      }
    }
  }
  const focusMin = Math.round(
    data.sessions
      .filter((s) => s.status === "finalizada" && inRange(s.date))
      .reduce((sum, s) => sum + s.focusSec, 0) / 60,
  );
  return {
    tasksDone,
    tasksPending,
    tasksSkipped,
    tasksCancelled,
    onTime,
    withDueDone: doneWithDue.length,
    examsUpcoming: data.exams.filter((e) => e.date >= today).length,
    examsPast: data.exams.filter((e) => e.date < today).length,
    focusMin,
    habitRate: habitScheduled ? Math.round((habitDone / habitScheduled) * 100) : 0,
    habitScheduled,
    habitDone,
    routineRate: routineSteps ? Math.round((routineDone / routineSteps) * 100) : 0,
    routineSteps,
    routineDone,
    weekBars,
  };
}

export function focusElapsed(live: AppData["liveFocus"], now = Date.now()): number {
  if (!live) return 0;
  const running = live.runningSince != null ? Math.max(0, (now - live.runningSince) / 1000) : 0;
  return Math.floor(live.accumulatedSec + running);
}
