import { create } from "zustand";
import { loadData, saveData } from "./db.ts";
import { isoDate, newId } from "./dates.ts";
import { buildExamples } from "./examples.ts";
import { focusElapsed } from "./logic.ts";
import {
  emptyData,
  normalize,
  type AppData,
  type CalendarEvent,
  type ClassSlot,
  type DetailKind,
  type Exam,
  type Habit,
  type HabitMark,
  type InboxItem,
  type Note,
  type PrepItem,
  type ReminderFire,
  type RootTab,
  type Routine,
  type ScheduleOverride,
  type StudySession,
  type Subject,
  type Task,
  type View,
} from "./types.ts";

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let allowSave = false;

function queueSave(data: AppData) {
  if (!allowSave) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void saveData(data).catch(() => {
      useRiot.setState({ saveError: "No se pudo guardar. Revisá el espacio del navegador." });
    });
  }, 180);
}

function patch(recipe: (data: AppData) => void) {
  const data = structuredClone(useRiot.getState().data);
  recipe(data);
  useRiot.setState({ data, saveError: null });
  queueSave(data);
}

function rootView(id: RootTab, today: string): View {
  if (id === "colegio") return { id: "colegio", tab: "materias" };
  if (id === "calendario") return { id: "calendario", mode: "mes", cursor: today };
  if (id === "mas") return { id: "mas" };
  return { id: "inicio" };
}

export interface Banner {
  title: string;
  body: string;
  refKind?: DetailKind;
  refId?: string;
}

interface RiotStore {
  ready: boolean;
  saveError: string | null;
  toast: string | null;
  data: AppData;
  stack: View[];
  quickOpen: boolean;
  banner: Banner | null;
  hydrate: () => Promise<void>;
  goRoot: (id: RootTab) => void;
  push: (view: View) => void;
  back: () => void;
  setSchoolTab: (tab: "materias" | "horario" | "tareas" | "examenes") => void;
  setCalendar: (patchView: Partial<Extract<View, { id: "calendario" }>>) => void;
  openQuick: (open: boolean) => void;
  setToast: (toast: string | null) => void;
  dismissBanner: () => void;
  setTheme: (theme: "claro" | "oscuro") => void;
  setDisplayName: (displayName: string) => void;
  setNight: (enabled: boolean, time: string) => void;
  dismissInstall: () => void;
  addSubject: (input: Pick<Subject, "name" | "teacher" | "color">) => string;
  updateSubject: (id: string, input: Partial<Pick<Subject, "name" | "teacher" | "color">>) => void;
  deleteSubject: (id: string) => void;
  addSlot: (input: Omit<ClassSlot, "id">) => string;
  updateSlot: (id: string, input: Partial<Omit<ClassSlot, "id">>) => void;
  deleteSlot: (id: string) => void;
  saveOverride: (input: Omit<ScheduleOverride, "id"> & { id?: string }) => void;
  addTask: (input: Omit<Task, "id" | "createdAt" | "subtasks" | "attachments"> & { subtasks?: Task["subtasks"]; attachments?: Task["attachments"] }) => string;
  updateTask: (id: string, input: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  setTaskStatus: (id: string, status: Task["status"]) => void;
  addExam: (input: Omit<Exam, "id">) => string;
  updateExam: (id: string, input: Partial<Exam>) => void;
  deleteExam: (id: string) => void;
  addEvent: (input: Omit<CalendarEvent, "id">) => string;
  updateEvent: (id: string, input: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  saveOccurrence: (masterId: string, date: string, input: Partial<CalendarEvent>, scope: "one" | "series") => void;
  removeOccurrence: (masterId: string, date: string, scope: "one" | "series") => void;
  addRoutine: (input: Omit<Routine, "id" | "logs">) => string;
  updateRoutine: (id: string, input: Partial<Routine>) => void;
  deleteRoutine: (id: string) => void;
  toggleRoutineStep: (id: string, stepId: string, date: string) => void;
  addHabit: (input: Omit<Habit, "id" | "logs">) => string;
  updateHabit: (id: string, input: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  setHabitLog: (id: string, date: string, status: HabitMark | null) => void;
  addSession: (input: Omit<StudySession, "id" | "focusSec" | "status"> & { status?: StudySession["status"]; focusSec?: number }) => string;
  updateSession: (id: string, input: Partial<StudySession>) => void;
  deleteSession: (id: string) => void;
  focusStart: (input: { title: string; minutes: number; subjectId?: string; taskId?: string; examId?: string; sessionId?: string }) => void;
  focusPause: () => void;
  focusResume: () => void;
  focusFinish: () => void;
  addInbox: (input: Pick<InboxItem, "title" | "notes" | "category">) => string;
  updateInbox: (id: string, input: Partial<InboxItem>) => void;
  deleteInbox: (id: string) => void;
  convertInbox: (id: string, kind: "tarea" | "evento" | "recordatorio") => string | null;
  addNote: (input: Omit<Note, "id" | "createdAt" | "updatedAt">) => string;
  updateNote: (id: string, input: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  addPrep: (label: string) => void;
  togglePrep: (id: string, date: string) => void;
  updatePrep: (id: string, label: string) => void;
  deletePrep: (id: string) => void;
  logFire: (entry: ReminderFire) => void;
  showBanner: (banner: Banner) => void;
  importData: (data: AppData) => void;
  loadExamples: () => boolean;
  clearExamples: () => void;
  clearAll: () => void;
}

export const useRiot = create<RiotStore>((set, get) => ({
  ready: false,
  saveError: null,
  toast: null,
  data: emptyData(),
  stack: [{ id: "inicio" }],
  quickOpen: false,
  banner: null,

  hydrate: async () => {
    const loaded = await loadData();
    const data = loaded ?? emptyData();
    allowSave = true;
    const theme = data.preferences.theme;
    document.documentElement.classList.toggle("dark", theme !== "claro");
    set({ data, ready: true });
  },

  goRoot: (id) => set({ stack: [rootView(id, isoDate())], quickOpen: false }),
  push: (view) => set({ stack: [...get().stack, view] }),
  back: () => {
    const stack = get().stack;
    set({ stack: stack.length > 1 ? stack.slice(0, -1) : [{ id: "inicio" }] });
  },
  setSchoolTab: (tab) => {
    const stack = [...get().stack];
    const top = stack[stack.length - 1];
    if (top?.id === "colegio") {
      stack[stack.length - 1] = { id: "colegio", tab };
      set({ stack });
    } else set({ stack: [...stack, { id: "colegio", tab }] });
  },
  setCalendar: (patchView) => {
    const stack = [...get().stack];
    const top = stack[stack.length - 1];
    if (top?.id === "calendario") {
      stack[stack.length - 1] = { ...top, ...patchView };
      set({ stack });
    }
  },
  openQuick: (quickOpen) => set({ quickOpen }),
  setToast: (toast) => set({ toast }),
  dismissBanner: () => set({ banner: null }),
  showBanner: (banner) => set({ banner }),

  setTheme: (theme) => {
    document.documentElement.classList.toggle("dark", theme !== "claro");
    try {
      localStorage.setItem("redriot-theme", theme);
    } catch {
      /* ignore */
    }
    patch((data) => {
      data.preferences.theme = theme;
    });
  },
  setDisplayName: (displayName) => patch((data) => {
    data.preferences.displayName = displayName;
  }),
  setNight: (enabled, time) => patch((data) => {
    data.preferences.nightReminderEnabled = enabled;
    data.preferences.nightReminder = time || "21:30";
  }),
  dismissInstall: () => patch((data) => {
    data.preferences.installDismissed = true;
  }),

  addSubject: (input) => {
    const id = newId();
    patch((data) => {
      data.subjects.push({ ...input, id, createdAt: new Date().toISOString(), name: input.name.trim(), teacher: input.teacher.trim() });
    });
    return id;
  },
  updateSubject: (id, input) => patch((data) => {
    const subject = data.subjects.find((s) => s.id === id);
    if (!subject) return;
    if (input.name != null) subject.name = input.name.trim();
    if (input.teacher != null) subject.teacher = input.teacher.trim();
    if (input.color) subject.color = input.color;
  }),
  deleteSubject: (id) => patch((data) => {
    const removed = new Set(data.slots.filter((s) => s.subjectId === id).map((s) => s.id));
    data.slots = data.slots.filter((s) => s.subjectId !== id);
    data.overrides = data.overrides.filter((o) => !removed.has(o.slotId));
    for (const task of data.tasks) if (task.subjectId === id) task.subjectId = undefined;
    for (const exam of data.exams) if (exam.subjectId === id) exam.subjectId = undefined;
    for (const session of data.sessions) if (session.subjectId === id) session.subjectId = undefined;
    for (const note of data.notes) note.links = note.links.filter((l) => !(l.kind === "materia" && l.id === id));
    data.subjects = data.subjects.filter((s) => s.id !== id);
  }),

  addSlot: (input) => {
    const id = newId();
    patch((data) => {
      data.slots.push({ ...input, id });
    });
    return id;
  },
  updateSlot: (id, input) => patch((data) => {
    const slot = data.slots.find((s) => s.id === id);
    if (slot) Object.assign(slot, input);
  }),
  deleteSlot: (id) => patch((data) => {
    data.slots = data.slots.filter((s) => s.id !== id);
    data.overrides = data.overrides.filter((o) => o.slotId !== id);
  }),
  saveOverride: (input) => patch((data) => {
    const index = data.overrides.findIndex((o) => o.slotId === input.slotId && o.date === input.date);
    const next: ScheduleOverride = {
      id: input.id ?? data.overrides[index]?.id ?? newId(),
      slotId: input.slotId,
      date: input.date,
      start: input.start,
      end: input.end,
      room: input.room,
      cancelled: input.cancelled,
    };
    if (index >= 0) data.overrides[index] = next;
    else data.overrides.push(next);
  }),

  addTask: (input) => {
    const id = newId();
    patch((data) => {
      data.tasks.push({
        ...input,
        id,
        title: input.title.trim(),
        createdAt: new Date().toISOString(),
        subtasks: input.subtasks ?? [],
        attachments: input.attachments ?? [],
        description: input.description ?? "",
        notes: input.notes ?? "",
        reminders: input.reminders ?? [],
        estimatedMin: input.estimatedMin || 30,
      });
    });
    return id;
  },
  updateTask: (id, input) => patch((data) => {
    const task = data.tasks.find((t) => t.id === id);
    if (!task) return;
    Object.assign(task, input);
    if (input.title) task.title = input.title.trim();
  }),
  deleteTask: (id) => patch((data) => {
    data.tasks = data.tasks.filter((t) => t.id !== id);
  }),
  setTaskStatus: (id, status) => patch((data) => {
    const task = data.tasks.find((t) => t.id === id);
    if (!task) return;
    task.status = status;
    if (status === "hecha") task.completedAt = isoDate();
    if (status === "pendiente") task.completedAt = undefined;
  }),

  addExam: (input) => {
    const id = newId();
    patch((data) => {
      data.exams.push({ ...input, id, title: input.title.trim() });
    });
    return id;
  },
  updateExam: (id, input) => patch((data) => {
    const exam = data.exams.find((e) => e.id === id);
    if (exam) Object.assign(exam, input, input.title ? { title: input.title.trim() } : {});
  }),
  deleteExam: (id) => patch((data) => {
    data.exams = data.exams.filter((e) => e.id !== id);
  }),

  addEvent: (input) => {
    const id = newId();
    patch((data) => {
      data.events.push({ ...input, id, title: input.title.trim() });
    });
    return id;
  },
  updateEvent: (id, input) => patch((data) => {
    const event = data.events.find((e) => e.id === id);
    if (event) Object.assign(event, input, input.title ? { title: input.title.trim() } : {});
  }),
  deleteEvent: (id) => patch((data) => {
    data.events = data.events.filter((e) => e.id !== id && e.seriesId !== id);
  }),
  saveOccurrence: (masterId, date, input, scope) => patch((data) => {
    const master = data.events.find((e) => e.id === masterId);
    if (!master) return;
    if (scope === "series" || !master.recurrence) {
      Object.assign(master, input);
      if (input.title) master.title = input.title.trim();
      return;
    }
    const existing = data.events.find((e) => e.seriesId === masterId && e.exceptionDate === date);
    if (existing) {
      Object.assign(existing, input, { recurrence: undefined, isException: true, seriesId: masterId, exceptionDate: date, date });
      return;
    }
    data.events.push({
      ...master,
      ...input,
      id: newId(),
      date,
      recurrence: undefined,
      isException: true,
      seriesId: masterId,
      exceptionDate: date,
      cancelled: false,
    });
  }),
  removeOccurrence: (masterId, date, scope) => patch((data) => {
    const master = data.events.find((e) => e.id === masterId);
    if (!master) return;
    if (scope === "series" || !master.recurrence) {
      data.events = data.events.filter((e) => e.id !== masterId && e.seriesId !== masterId);
      return;
    }
    const existing = data.events.find((e) => e.seriesId === masterId && e.exceptionDate === date);
    if (existing) {
      existing.cancelled = true;
      return;
    }
    data.events.push({
      ...master,
      id: newId(),
      date,
      recurrence: undefined,
      isException: true,
      seriesId: masterId,
      exceptionDate: date,
      cancelled: true,
    });
  }),

  addRoutine: (input) => {
    const id = newId();
    patch((data) => {
      data.routines.push({ ...input, id, title: input.title.trim(), logs: [] });
    });
    return id;
  },
  updateRoutine: (id, input) => patch((data) => {
    const routine = data.routines.find((r) => r.id === id);
    if (routine) Object.assign(routine, input);
  }),
  deleteRoutine: (id) => patch((data) => {
    data.routines = data.routines.filter((r) => r.id !== id);
  }),
  toggleRoutineStep: (id, stepId, date) => patch((data) => {
    const routine = data.routines.find((r) => r.id === id);
    if (!routine) return;
    let log = routine.logs.find((l) => l.date === date);
    if (!log) {
      log = { date, steps: {} };
      routine.logs.push(log);
    }
    log.steps[stepId] = !log.steps[stepId];
  }),

  addHabit: (input) => {
    const id = newId();
    patch((data) => {
      data.habits.push({ ...input, id, title: input.title.trim(), logs: [] });
    });
    return id;
  },
  updateHabit: (id, input) => patch((data) => {
    const habit = data.habits.find((h) => h.id === id);
    if (habit) Object.assign(habit, input);
  }),
  deleteHabit: (id) => patch((data) => {
    data.habits = data.habits.filter((h) => h.id !== id);
  }),
  setHabitLog: (id, date, status) => patch((data) => {
    const habit = data.habits.find((h) => h.id === id);
    if (!habit) return;
    habit.logs = habit.logs.filter((l) => l.date !== date);
    if (status) habit.logs.push({ date, status });
  }),

  addSession: (input) => {
    const id = newId();
    patch((data) => {
      data.sessions.push({
        focusSec: input.focusSec ?? 0,
        status: input.status ?? "planificada",
        ...input,
        id,
        title: input.title.trim(),
      });
    });
    return id;
  },
  updateSession: (id, input) => patch((data) => {
    const session = data.sessions.find((s) => s.id === id);
    if (session) Object.assign(session, input);
  }),
  deleteSession: (id) => patch((data) => {
    data.sessions = data.sessions.filter((s) => s.id !== id);
    if (data.liveFocus?.sessionId === id) data.liveFocus = null;
  }),

  focusStart: ({ title, minutes, subjectId, taskId, examId, sessionId }) => patch((data) => {
    let id = sessionId;
    if (id) {
      const session = data.sessions.find((s) => s.id === id);
      if (session) {
        session.status = "en-curso";
        session.startedAt = session.startedAt ?? new Date().toISOString();
        session.plannedMin = minutes;
      }
    } else {
      id = newId();
      data.sessions.push({
        id,
        title: title.trim() || "Estudio",
        subjectId,
        taskId,
        examId,
        date: isoDate(),
        time: new Date().toTimeString().slice(0, 5),
        plannedMin: minutes,
        focusSec: 0,
        status: "en-curso",
        startedAt: new Date().toISOString(),
      });
    }
    data.liveFocus = { sessionId: id!, accumulatedSec: data.sessions.find((s) => s.id === id)?.focusSec ?? 0, runningSince: Date.now() };
  }),
  focusPause: () => patch((data) => {
    if (!data.liveFocus?.runningSince) return;
    data.liveFocus.accumulatedSec = focusElapsed(data.liveFocus);
    data.liveFocus.runningSince = null;
    const session = data.sessions.find((s) => s.id === data.liveFocus?.sessionId);
    if (session) {
      session.status = "pausada";
      session.focusSec = data.liveFocus.accumulatedSec;
    }
  }),
  focusResume: () => patch((data) => {
    if (!data.liveFocus) return;
    data.liveFocus.runningSince = Date.now();
    const session = data.sessions.find((s) => s.id === data.liveFocus?.sessionId);
    if (session) session.status = "en-curso";
  }),
  focusFinish: () => patch((data) => {
    if (!data.liveFocus) return;
    const seconds = focusElapsed(data.liveFocus);
    const session = data.sessions.find((s) => s.id === data.liveFocus?.sessionId);
    if (session) {
      session.status = "finalizada";
      session.focusSec = seconds;
      session.endedAt = new Date().toISOString();
    }
    data.liveFocus = null;
  }),

  addInbox: (input) => {
    const id = newId();
    patch((data) => {
      data.inbox.push({
        id,
        title: input.title.trim(),
        notes: input.notes,
        category: input.category,
        createdAt: new Date().toISOString(),
        archived: false,
      });
    });
    return id;
  },
  updateInbox: (id, input) => patch((data) => {
    const item = data.inbox.find((i) => i.id === id);
    if (item) Object.assign(item, input);
  }),
  deleteInbox: (id) => patch((data) => {
    data.inbox = data.inbox.filter((i) => i.id !== id);
  }),
  convertInbox: (id, kind) => {
    const item = get().data.inbox.find((i) => i.id === id);
    if (!item || item.convertedId) return item?.convertedId ?? null;
    const created = newId();
    patch((data) => {
      const current = data.inbox.find((i) => i.id === id);
      if (!current || current.convertedId) return;
      if (kind === "tarea") {
        data.tasks.push({
          id: created,
          title: current.title,
          description: current.notes,
          createdAt: new Date().toISOString(),
          importance: "media",
          status: "pendiente",
          estimatedMin: 30,
          subtasks: [],
          notes: current.notes,
          reminders: [],
          attachments: [],
        });
        current.convertedKind = "tarea";
      } else {
        data.events.push({
          id: created,
          title: current.title,
          date: isoDate(),
          description: current.notes,
          category: kind === "recordatorio" ? "Recordatorio" : "Personal",
          importance: "media",
          reminders: kind === "recordatorio" ? [{ id: newId(), minutesBefore: 0, enabled: true }] : [],
        });
        current.convertedKind = "evento";
      }
      current.convertedId = created;
      current.archived = true;
    });
    return created;
  },

  addNote: (input) => {
    const id = newId();
    const now = new Date().toISOString();
    patch((data) => {
      data.notes.push({ ...input, id, title: input.title.trim(), createdAt: now, updatedAt: now });
    });
    return id;
  },
  updateNote: (id, input) => patch((data) => {
    const note = data.notes.find((n) => n.id === id);
    if (note) Object.assign(note, input, { updatedAt: new Date().toISOString() });
  }),
  deleteNote: (id) => patch((data) => {
    data.notes = data.notes.filter((n) => n.id !== id);
  }),

  addPrep: (label) => patch((data) => {
    data.prep.push({ id: newId(), label: label.trim() });
  }),
  togglePrep: (id, date) => patch((data) => {
    const item = data.prep.find((p) => p.id === id);
    if (!item) return;
    item.doneOn = item.doneOn === date ? undefined : date;
  }),
  updatePrep: (id, label) => patch((data) => {
    const item = data.prep.find((p) => p.id === id);
    if (item) item.label = label.trim();
  }),
  deletePrep: (id) => patch((data) => {
    data.prep = data.prep.filter((p) => p.id !== id);
  }),

  logFire: (entry) => patch((data) => {
    if (data.reminderLog.some((r) => r.key === entry.key)) return;
    data.reminderLog.push(entry);
    if (data.reminderLog.length > 200) data.reminderLog = data.reminderLog.slice(-200);
  }),

  importData: (incoming) => {
    const data = normalize(incoming);
    allowSave = true;
    document.documentElement.classList.toggle("dark", data.preferences.theme !== "claro");
    set({ data, saveError: null, stack: [{ id: "inicio" }] });
    queueSave(data);
  },
  loadExamples: () => {
    if (get().data.subjects.some((s) => s.example) || get().data.tasks.some((t) => t.example)) return false;
    const examples = buildExamples(isoDate());
    patch((data) => {
      data.subjects.push(...examples.subjects);
      data.slots.push(...examples.slots);
      data.tasks.push(...examples.tasks);
      data.exams.push(...examples.exams);
      data.events.push(...examples.events);
      data.routines.push(...examples.routines);
      data.habits.push(...examples.habits);
      data.inbox.push(...examples.inbox);
      data.notes.push(...examples.notes);
    });
    return true;
  },
  clearExamples: () => patch((data) => {
    const subjectIds = new Set(data.subjects.filter((s) => s.example).map((s) => s.id));
    const slotIds = new Set(data.slots.filter((s) => s.example || subjectIds.has(s.subjectId)).map((s) => s.id));
    data.subjects = data.subjects.filter((s) => !s.example);
    data.slots = data.slots.filter((s) => !slotIds.has(s.id));
    data.overrides = data.overrides.filter((o) => !slotIds.has(o.slotId));
    data.tasks = data.tasks.filter((t) => !t.example);
    data.exams = data.exams.filter((e) => !e.example);
    data.events = data.events.filter((e) => !e.example);
    data.routines = data.routines.filter((r) => !r.example);
    data.habits = data.habits.filter((h) => !h.example);
    data.sessions = data.sessions.filter((s) => !s.example);
    data.inbox = data.inbox.filter((i) => !i.example);
    data.notes = data.notes.filter((n) => !n.example);
  }),
  clearAll: () => {
    const theme = get().data.preferences.theme;
    const data = emptyData();
    data.preferences.theme = theme;
    allowSave = true;
    set({ data, stack: [{ id: "inicio" }], banner: null });
    queueSave(data);
  },
}));
