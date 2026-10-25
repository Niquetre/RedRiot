export type Importance = "baja" | "media" | "alta";
export type Urgency = "sin-apuro" | "proxima" | "hoy" | "vencida";
export type TaskStatus = "pendiente" | "hecha" | "omitida" | "cancelada";
export type HabitFreq = "diaria" | "semanal" | "mensual" | "personalizada";
export type HabitMark = "hecha" | "omitida" | "na";
export type Swatch = "c1" | "c2" | "c3" | "c4" | "c5";
export type SchoolTab = "materias" | "horario" | "tareas" | "examenes";
export type CalMode = "mes" | "semana" | "dia";
export type DetailKind =
  | "tarea"
  | "examen"
  | "evento"
  | "rutina"
  | "habito"
  | "nota"
  | "materia"
  | "sesion"
  | "clase"
  | "pendiente";

export interface ReminderSpec {
  id: string;
  minutesBefore: number;
  enabled: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  mime: string;
  dataUrl: string;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Subject {
  id: string;
  name: string;
  teacher: string;
  color: Swatch;
  createdAt: string;
  example?: boolean;
}

export interface ClassSlot {
  id: string;
  subjectId: string;
  weekday: number;
  start: string;
  end: string;
  room: string;
  /** Si está, la clase existe solo ese día (cambio temporal). */
  onlyDate?: string;
  example?: boolean;
}

export interface ScheduleOverride {
  id: string;
  slotId: string;
  date: string;
  start?: string;
  end?: string;
  room?: string;
  cancelled?: boolean;
}

export interface Task {
  id: string;
  title: string;
  subjectId?: string;
  description: string;
  createdAt: string;
  dueDate?: string;
  dueTime?: string;
  importance: Importance;
  urgencyOverride?: Urgency | null;
  pinned?: boolean;
  status: TaskStatus;
  estimatedMin: number;
  subtasks: Subtask[];
  notes: string;
  reminders: ReminderSpec[];
  attachments: Attachment[];
  completedAt?: string;
  example?: boolean;
}

export interface Exam {
  id: string;
  title: string;
  subjectId?: string;
  date: string;
  time?: string;
  topics: string;
  notes: string;
  importance: Importance;
  reminders: ReminderSpec[];
  example?: boolean;
}

export interface Recurrence {
  freq: "daily" | "weekly" | "monthly";
  interval: number;
  until?: string;
  weekdays?: number[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  endTime?: string;
  description: string;
  category: string;
  importance: Importance;
  reminders: ReminderSpec[];
  recurrence?: Recurrence;
  seriesId?: string;
  exceptionDate?: string;
  isException?: boolean;
  cancelled?: boolean;
  example?: boolean;
}

export interface RoutineStep {
  id: string;
  title: string;
}

export interface RoutineLog {
  date: string;
  steps: Record<string, boolean>;
}

export interface Routine {
  id: string;
  title: string;
  time: string;
  durationMin: number;
  weekdays: number[];
  steps: RoutineStep[];
  paused: boolean;
  reminders: ReminderSpec[];
  logs: RoutineLog[];
  example?: boolean;
}

export interface Habit {
  id: string;
  title: string;
  frequency: HabitFreq;
  target: number;
  weekdays: number[];
  logs: { date: string; status: HabitMark }[];
  example?: boolean;
}

export interface StudySession {
  id: string;
  title: string;
  subjectId?: string;
  taskId?: string;
  examId?: string;
  date: string;
  time?: string;
  plannedMin: number;
  focusSec: number;
  status: "planificada" | "en-curso" | "pausada" | "finalizada";
  startedAt?: string;
  endedAt?: string;
  example?: boolean;
}

export interface LiveFocus {
  sessionId: string;
  accumulatedSec: number;
  runningSince: number | null;
}

export interface InboxItem {
  id: string;
  title: string;
  notes: string;
  category: string;
  createdAt: string;
  archived: boolean;
  convertedKind?: DetailKind;
  convertedId?: string;
  example?: boolean;
}

export interface NoteLink {
  kind: "tarea" | "materia" | "evento" | "examen";
  id: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  links: NoteLink[];
  createdAt: string;
  updatedAt: string;
  example?: boolean;
}

export interface PrepItem {
  id: string;
  label: string;
  doneOn?: string;
}

export interface ReminderFire {
  key: string;
  at: string;
  title: string;
  body: string;
  refKind?: DetailKind;
  refId?: string;
}

export interface Preferences {
  theme: "claro" | "oscuro";
  displayName: string;
  nightReminder: string;
  nightReminderEnabled: boolean;
  installDismissed: boolean;
}

export interface AppData {
  version: 1;
  subjects: Subject[];
  slots: ClassSlot[];
  overrides: ScheduleOverride[];
  tasks: Task[];
  exams: Exam[];
  events: CalendarEvent[];
  routines: Routine[];
  habits: Habit[];
  sessions: StudySession[];
  inbox: InboxItem[];
  notes: Note[];
  prep: PrepItem[];
  preferences: Preferences;
  reminderLog: ReminderFire[];
  liveFocus: LiveFocus | null;
}

export type RootTab = "inicio" | "colegio" | "calendario" | "mas";

export type View =
  | { id: "inicio" }
  | { id: "colegio"; tab: SchoolTab }
  | { id: "calendario"; mode: CalMode; cursor: string }
  | { id: "mas" }
  | { id: "rutinas" }
  | { id: "habitos" }
  | { id: "estudio" }
  | { id: "pendientes" }
  | { id: "estadisticas" }
  | { id: "ajustes" }
  | { id: "manana" }
  | { id: "semana" }
  | { id: "notas" }
  | { id: "buscar" }
  | { id: "detalle"; kind: DetailKind; entityId: string; date?: string };

export function emptyData(): AppData {
  return {
    version: 1,
    subjects: [],
    slots: [],
    overrides: [],
    tasks: [],
    exams: [],
    events: [],
    routines: [],
    habits: [],
    sessions: [],
    inbox: [],
    notes: [],
    prep: [],
    preferences: {
      theme: "oscuro",
      displayName: "",
      nightReminder: "21:30",
      nightReminderEnabled: false,
      installDismissed: false,
    },
    reminderLog: [],
    liveFocus: null,
  };
}

export function normalize(raw: Partial<AppData> | null | undefined): AppData {
  const base = emptyData();
  if (!raw || typeof raw !== "object") return base;
  const prefs = { ...base.preferences, ...(raw.preferences ?? {}) };
  if (prefs.theme !== "claro" && prefs.theme !== "oscuro") prefs.theme = "oscuro";
  return {
    ...base,
    ...raw,
    version: 1,
    preferences: prefs,
    subjects: raw.subjects ?? [],
    slots: raw.slots ?? [],
    overrides: raw.overrides ?? [],
    tasks: (raw.tasks ?? []).map((t) => ({
      ...t,
      subtasks: t.subtasks ?? [],
      reminders: t.reminders ?? [],
      attachments: t.attachments ?? [],
      description: t.description ?? "",
      notes: t.notes ?? "",
      estimatedMin: t.estimatedMin ?? 30,
    })),
    exams: (raw.exams ?? []).map((e) => ({ ...e, reminders: e.reminders ?? [] })),
    events: (raw.events ?? []).map((e) => ({ ...e, reminders: e.reminders ?? [] })),
    routines: (raw.routines ?? []).map((r) => ({
      ...r,
      steps: r.steps ?? [],
      logs: r.logs ?? [],
      reminders: r.reminders ?? [],
      weekdays: r.weekdays ?? [],
    })),
    habits: (raw.habits ?? []).map((h) => ({
      ...h,
      logs: h.logs ?? [],
      weekdays: h.weekdays ?? [],
    })),
    sessions: raw.sessions ?? [],
    inbox: raw.inbox ?? [],
    notes: (raw.notes ?? []).map((n) => ({ ...n, tags: n.tags ?? [], links: n.links ?? [] })),
    prep: raw.prep ?? [],
    reminderLog: raw.reminderLog ?? [],
    liveFocus: raw.liveFocus ?? null,
  };
}
