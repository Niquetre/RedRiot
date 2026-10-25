import { useState } from "react";
import { isoDate, newId, WEEKDAY_LONG } from "@/lib/redriot/dates";
import { shortDate } from "@/lib/redriot/format";
import {
  effectiveUrgency,
  habitStreak,
  periodCount,
  priorityReason,
  resolveEvent,
  subjectById,
  subjectName,
  URGENCY_LABEL,
} from "@/lib/redriot/logic";
import { useRiot } from "@/lib/redriot/store";
import type { DetailKind, Importance, ReminderSpec, TaskStatus, Urgency } from "@/lib/redriot/types";
import { ImportanceField, ReminderField, SubjectField, UrgencyField, WeekdayField } from "./fields";
import { Button, Card, Empty, Field, Pill, controlClass } from "./ui";

const MAX_FILE = 350_000;

export function DetailScreen({ kind, entityId, date }: { kind: DetailKind; entityId: string; date?: string }) {
  const data = useRiot((s) => s.data);
  if (kind === "tarea") return <TaskDetail id={entityId} />;
  if (kind === "examen") return <ExamDetail id={entityId} />;
  if (kind === "evento") return <EventDetail id={entityId} date={date} />;
  if (kind === "rutina") return <RoutineDetail id={entityId} />;
  if (kind === "habito") return <HabitDetail id={entityId} />;
  if (kind === "nota") return <NoteDetail id={entityId} />;
  if (kind === "materia") return <SubjectDetail id={entityId} />;
  if (kind === "clase") return <ClassDetail id={entityId} date={date ?? isoDate()} />;
  if (kind === "sesion") return <SessionDetail id={entityId} />;
  if (kind === "pendiente") {
    const item = data.inbox.find((entry) => entry.id === entityId);
    if (!item) return <Empty title="No está" body="Ese pendiente ya no existe." />;
    return <Card><p className="font-semibold">{item.title}</p><p className="mt-2 text-sm text-muted">{item.notes || "Sin nota"}</p></Card>;
  }
  return null;
}

function TaskDetail({ id }: { id: string }) {
  const task = useRiot((s) => s.data.tasks.find((item) => item.id === id));
  const data = useRiot((s) => s.data);
  const updateTask = useRiot((s) => s.updateTask);
  const deleteTask = useRiot((s) => s.deleteTask);
  const setTaskStatus = useRiot((s) => s.setTaskStatus);
  const back = useRiot((s) => s.back);
  const today = isoDate();
  if (!task) return <Empty title="Tarea eliminada" body="Volvé atrás." />;
  const setStatus = (status: TaskStatus) => setTaskStatus(task.id, status);
  return (
    <div className="flex flex-col gap-3">
      {task.example ? <Pill active>Ejemplo</Pill> : null}
      <Field label="Título"><input className={controlClass} value={task.title} onChange={(e) => updateTask(task.id, { title: e.target.value })} /></Field>
      <SubjectField subjects={data.subjects} value={task.subjectId} onChange={(subjectId) => updateTask(task.id, { subjectId })} />
      <div className="grid grid-cols-2 gap-2">
        <Field label="Entrega"><input type="date" className={controlClass} value={task.dueDate ?? ""} onChange={(e) => updateTask(task.id, { dueDate: e.target.value || undefined })} /></Field>
        <Field label="Hora"><input type="time" className={controlClass} value={task.dueTime ?? ""} onChange={(e) => updateTask(task.id, { dueTime: e.target.value || undefined })} /></Field>
      </div>
      <ImportanceField value={task.importance} onChange={(importance: Importance) => updateTask(task.id, { importance })} />
      <UrgencyField value={task.urgencyOverride ?? ""} onChange={(value: Urgency | "") => updateTask(task.id, { urgencyOverride: value || null })} />
      <p className="text-sm text-muted">Ahora: {URGENCY_LABEL[effectiveUrgency(task, today)]}. {priorityReason(task, today)}</p>
      <Button variant={task.pinned ? "primary" : "soft"} onClick={() => updateTask(task.id, { pinned: !task.pinned })}>{task.pinned ? "Priorizada" : "Priorizar a mano"}</Button>
      <Field label="Minutos estimados"><input className={controlClass} inputMode="numeric" value={String(task.estimatedMin)} onChange={(e) => updateTask(task.id, { estimatedMin: Number(e.target.value) || 0 })} /></Field>
      <Field label="Descripción"><textarea className={`${controlClass} h-24 py-2`} value={task.description} onChange={(e) => updateTask(task.id, { description: e.target.value })} /></Field>
      <Field label="Notas"><textarea className={`${controlClass} h-20 py-2`} value={task.notes} onChange={(e) => updateTask(task.id, { notes: e.target.value })} /></Field>
      <ReminderField value={task.reminders} onChange={(reminders: ReminderSpec[]) => updateTask(task.id, { reminders })} />
      <div>
        <p className="mb-2 text-sm font-medium">Subtareas</p>
        {task.subtasks.map((sub) => (
          <label key={sub.id} className="mb-2 flex items-center gap-2">
            <input type="checkbox" className="size-5" checked={sub.done} onChange={() => updateTask(task.id, { subtasks: task.subtasks.map((item) => item.id === sub.id ? { ...item, done: !item.done } : item) })} />
            <input className={controlClass} value={sub.title} onChange={(e) => updateTask(task.id, { subtasks: task.subtasks.map((item) => item.id === sub.id ? { ...item, title: e.target.value } : item) })} />
          </label>
        ))}
        <Button variant="soft" onClick={() => updateTask(task.id, { subtasks: [...task.subtasks, { id: newId(), title: "Nuevo paso", done: false }] })}>Agregar subtarea</Button>
      </div>
      <Attachments taskId={task.id} />
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => setStatus(task.status === "hecha" ? "pendiente" : "hecha")}>{task.status === "hecha" ? "Reabrir" : "Completar"}</Button>
        <Button variant="soft" onClick={() => setStatus("omitida")}>Omitir</Button>
        <Button variant="ghost" onClick={() => setStatus("cancelada")}>Cancelar tarea</Button>
        <Button variant="danger" onClick={() => { deleteTask(task.id); back(); }}>Eliminar</Button>
      </div>
      <p className="text-xs text-muted">Completar o borrar cancela los avisos que todavía no salieron. Un aviso ya mostrado no se puede retirar de la pantalla de bloqueo.</p>
    </div>
  );
}

function Attachments({ taskId }: { taskId: string }) {
  const task = useRiot((s) => s.data.tasks.find((item) => item.id === taskId));
  const updateTask = useRiot((s) => s.updateTask);
  const [error, setError] = useState("");
  if (!task) return null;
  return (
    <div>
      <p className="mb-2 text-sm font-medium">Adjuntos en este iPhone</p>
      {task.attachments.map((file) => (
        <div key={file.id} className="mb-2 flex items-center justify-between gap-2">
          <a className="truncate text-sm font-semibold text-primary" href={file.dataUrl} download={file.name}>{file.name}</a>
          <Button variant="ghost" onClick={() => updateTask(taskId, { attachments: task.attachments.filter((item) => item.id !== file.id) })}>Quitar</Button>
        </div>
      ))}
      <input
        type="file"
        className="text-sm"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          if (file.size > MAX_FILE) {
            setError("Supera 350 KB. Guardamos solo archivos chicos para no perderlos sin conexión.");
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = String(reader.result ?? "");
            updateTask(taskId, { attachments: [...task.attachments, { id: newId(), name: file.name, mime: file.type, dataUrl }] });
            setError("");
          };
          reader.readAsDataURL(file);
        }}
      />
      {error ? <p className="mt-1 text-sm text-primary">{error}</p> : <p className="mt-1 text-xs text-muted">No se suben a ningún servidor.</p>}
    </div>
  );
}

function ExamDetail({ id }: { id: string }) {
  const exam = useRiot((s) => s.data.exams.find((item) => item.id === id));
  const data = useRiot((s) => s.data);
  const updateExam = useRiot((s) => s.updateExam);
  const deleteExam = useRiot((s) => s.deleteExam);
  const focusStart = useRiot((s) => s.focusStart);
  const push = useRiot((s) => s.push);
  const back = useRiot((s) => s.back);
  if (!exam) return <Empty title="Examen eliminado" body="Volvé atrás." />;
  const sessions = data.sessions.filter((session) => session.examId === exam.id);
  return (
    <div className="flex flex-col gap-3">
      <Field label="Nombre"><input className={controlClass} value={exam.title} onChange={(e) => updateExam(exam.id, { title: e.target.value })} /></Field>
      <SubjectField subjects={data.subjects} value={exam.subjectId} onChange={(subjectId) => updateExam(exam.id, { subjectId })} />
      <div className="grid grid-cols-2 gap-2">
        <Field label="Fecha"><input type="date" className={controlClass} value={exam.date} onChange={(e) => updateExam(exam.id, { date: e.target.value })} /></Field>
        <Field label="Hora"><input type="time" className={controlClass} value={exam.time ?? ""} onChange={(e) => updateExam(exam.id, { time: e.target.value || undefined })} /></Field>
      </div>
      <Field label="Temas"><textarea className={`${controlClass} h-24 py-2`} value={exam.topics} onChange={(e) => updateExam(exam.id, { topics: e.target.value })} /></Field>
      <Field label="Notas"><textarea className={`${controlClass} h-20 py-2`} value={exam.notes} onChange={(e) => updateExam(exam.id, { notes: e.target.value })} /></Field>
      <ImportanceField value={exam.importance} onChange={(importance) => updateExam(exam.id, { importance })} />
      <ReminderField value={exam.reminders} onChange={(reminders) => updateExam(exam.id, { reminders })} />
      <p className="text-sm font-semibold">Preparación</p>
      {sessions.length === 0 ? <p className="text-sm text-muted">Todavía no hay sesiones vinculadas.</p> : sessions.map((session) => (
        <button key={session.id} type="button" className="text-left text-sm font-semibold text-primary" onClick={() => push({ id: "detalle", kind: "sesion", entityId: session.id })}>{session.title} · {shortDate(session.date)}</button>
      ))}
      <Button onClick={() => { focusStart({ title: `Preparar: ${exam.title}`, minutes: 45, subjectId: exam.subjectId, examId: exam.id }); push({ id: "estudio" }); }}>Estudiar ahora</Button>
      <Button variant="danger" onClick={() => { deleteExam(exam.id); back(); }}>Eliminar examen</Button>
    </div>
  );
}

function EventDetail({ id, date }: { id: string; date?: string }) {
  const data = useRiot((s) => s.data);
  const saveOccurrence = useRiot((s) => s.saveOccurrence);
  const removeOccurrence = useRiot((s) => s.removeOccurrence);
  const back = useRiot((s) => s.back);
  const master = data.events.find((event) => event.id === id);
  const event = resolveEvent(data, id, date);
  const [scope, setScope] = useState<"one" | "series">("one");
  if (!master || !event) return <Empty title="Evento eliminado" body="Volvé atrás." />;
  const when = date ?? event.date;
  const recurring = !!master.recurrence && !master.isException;
  const write = (input: Partial<typeof event>) => saveOccurrence(master.id, when, input, recurring ? scope : "series");
  return (
    <div className="flex flex-col gap-3">
      {recurring ? (
        <div className="grid grid-cols-2 gap-2">
          <Button variant={scope === "one" ? "primary" : "soft"} onClick={() => setScope("one")}>Solo esta fecha</Button>
          <Button variant={scope === "series" ? "primary" : "soft"} onClick={() => setScope("series")}>Toda la serie</Button>
        </div>
      ) : null}
      {event.cancelled ? <p className="text-sm text-primary">Esta fecha está cancelada.</p> : null}
      <Field label="Nombre"><input className={controlClass} value={event.title} onChange={(e) => write({ title: e.target.value })} /></Field>
      <Field label="Fecha"><input type="date" className={controlClass} value={scope === "series" ? master.date : when} onChange={(e) => write({ date: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Hora"><input type="time" className={controlClass} value={event.time ?? ""} onChange={(e) => write({ time: e.target.value || undefined })} /></Field>
        <Field label="Hasta"><input type="time" className={controlClass} value={event.endTime ?? ""} onChange={(e) => write({ endTime: e.target.value || undefined })} /></Field>
      </div>
      <Field label="Descripción"><textarea className={`${controlClass} h-20 py-2`} value={event.description} onChange={(e) => write({ description: e.target.value })} /></Field>
      <Field label="Categoría"><input className={controlClass} value={event.category} onChange={(e) => write({ category: e.target.value })} /></Field>
      <ImportanceField value={event.importance} onChange={(importance) => write({ importance })} />
      <ReminderField value={event.reminders} onChange={(reminders) => write({ reminders })} />
      <Button variant="danger" onClick={() => { removeOccurrence(master.id, when, recurring ? scope : "series"); back(); }}>
        {recurring && scope === "one" ? "Quitar solo esta fecha" : "Eliminar"}
      </Button>
    </div>
  );
}

function RoutineDetail({ id }: { id: string }) {
  const routine = useRiot((s) => s.data.routines.find((item) => item.id === id));
  const updateRoutine = useRiot((s) => s.updateRoutine);
  const deleteRoutine = useRiot((s) => s.deleteRoutine);
  const toggleRoutineStep = useRiot((s) => s.toggleRoutineStep);
  const back = useRiot((s) => s.back);
  const today = isoDate();
  if (!routine) return <Empty title="Rutina eliminada" body="Volvé atrás." />;
  const log = routine.logs.find((item) => item.date === today);
  return (
    <div className="flex flex-col gap-3">
      <Field label="Nombre"><input className={controlClass} value={routine.title} onChange={(e) => updateRoutine(routine.id, { title: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Hora"><input type="time" className={controlClass} value={routine.time} onChange={(e) => updateRoutine(routine.id, { time: e.target.value })} /></Field>
        <Field label="Duración"><input className={controlClass} inputMode="numeric" value={String(routine.durationMin)} onChange={(e) => updateRoutine(routine.id, { durationMin: Number(e.target.value) || 0 })} /></Field>
      </div>
      <WeekdayField value={routine.weekdays} onChange={(weekdays) => updateRoutine(routine.id, { weekdays })} />
      <Button variant={routine.paused ? "primary" : "soft"} onClick={() => updateRoutine(routine.id, { paused: !routine.paused })}>{routine.paused ? "Reanudar rutina" : "Pausar rutina"}</Button>
      <ReminderField value={routine.reminders} onChange={(reminders) => updateRoutine(routine.id, { reminders })} />
      <p className="text-sm font-semibold">Pasos de hoy</p>
      {routine.steps.map((step) => (
        <label key={step.id} className="flex items-center gap-2">
          <input type="checkbox" className="size-5" checked={!!log?.steps[step.id]} onChange={() => toggleRoutineStep(routine.id, step.id, today)} />
          <input className={controlClass} value={step.title} onChange={(e) => updateRoutine(routine.id, { steps: routine.steps.map((item) => item.id === step.id ? { ...item, title: e.target.value } : item) })} />
        </label>
      ))}
      <Button variant="soft" onClick={() => updateRoutine(routine.id, { steps: [...routine.steps, { id: newId(), title: "Nuevo paso" }] })}>Agregar paso</Button>
      <Button variant="danger" onClick={() => { deleteRoutine(routine.id); back(); }}>Eliminar rutina</Button>
    </div>
  );
}

function HabitDetail({ id }: { id: string }) {
  const habit = useRiot((s) => s.data.habits.find((item) => item.id === id));
  const updateHabit = useRiot((s) => s.updateHabit);
  const deleteHabit = useRiot((s) => s.deleteHabit);
  const back = useRiot((s) => s.back);
  const today = isoDate();
  if (!habit) return <Empty title="Hábito eliminado" body="Volvé atrás." />;
  const recent = [...habit.logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  return (
    <div className="flex flex-col gap-3">
      <Field label="Nombre"><input className={controlClass} value={habit.title} onChange={(e) => updateHabit(habit.id, { title: e.target.value })} /></Field>
      <p className="text-sm text-muted">{habit.frequency} · {periodCount(habit, today).done}/{periodCount(habit, today).target} · racha {habitStreak(habit, today)}</p>
      {(habit.frequency === "semanal" || habit.frequency === "mensual") ? (
        <Field label="Objetivo"><input className={controlClass} inputMode="numeric" value={String(habit.target)} onChange={(e) => updateHabit(habit.id, { target: Number(e.target.value) || 1 })} /></Field>
      ) : <WeekdayField value={habit.weekdays} onChange={(weekdays) => updateHabit(habit.id, { weekdays })} />}
      <p className="text-sm font-semibold">Historial</p>
      {recent.length === 0 ? <p className="text-sm text-muted">Sin marcas todavía.</p> : recent.map((log) => (
        <p key={log.date} className="text-sm">{shortDate(log.date)} · {log.status === "hecha" ? "hecha" : log.status === "omitida" ? "omitida" : "no aplica"}</p>
      ))}
      <Button variant="danger" onClick={() => { deleteHabit(habit.id); back(); }}>Eliminar hábito</Button>
    </div>
  );
}

function NoteDetail({ id }: { id: string }) {
  const note = useRiot((s) => s.data.notes.find((item) => item.id === id));
  const data = useRiot((s) => s.data);
  const updateNote = useRiot((s) => s.updateNote);
  const deleteNote = useRiot((s) => s.deleteNote);
  const back = useRiot((s) => s.back);
  if (!note) return <Empty title="Nota eliminada" body="Volvé atrás." />;
  return (
    <div className="flex flex-col gap-3">
      <Field label="Título"><input className={controlClass} value={note.title} onChange={(e) => updateNote(note.id, { title: e.target.value })} /></Field>
      <Field label="Contenido"><textarea className={`${controlClass} h-40 py-2`} value={note.content} onChange={(e) => updateNote(note.id, { content: e.target.value })} /></Field>
      <Field label="Categoría"><input className={controlClass} value={note.category} onChange={(e) => updateNote(note.id, { category: e.target.value })} /></Field>
      <Field label="Etiquetas"><input className={controlClass} value={note.tags.join(", ")} onChange={(e) => updateNote(note.id, { tags: e.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} /></Field>
      <Field label="Vincular materia">
        <select className={controlClass} value={note.links.find((link) => link.kind === "materia")?.id ?? ""} onChange={(e) => {
          const rest = note.links.filter((link) => link.kind !== "materia");
          updateNote(note.id, { links: e.target.value ? [...rest, { kind: "materia", id: e.target.value }] : rest });
        }}>
          <option value="">Ninguna</option>
          {data.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
        </select>
      </Field>
      <Field label="Vincular tarea">
        <select className={controlClass} value={note.links.find((link) => link.kind === "tarea")?.id ?? ""} onChange={(e) => {
          const rest = note.links.filter((link) => link.kind !== "tarea");
          updateNote(note.id, { links: e.target.value ? [...rest, { kind: "tarea", id: e.target.value }] : rest });
        }}>
          <option value="">Ninguna</option>
          {data.tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
        </select>
      </Field>
      <Button variant="danger" onClick={() => { deleteNote(note.id); back(); }}>Eliminar nota</Button>
    </div>
  );
}

function SubjectDetail({ id }: { id: string }) {
  const subject = useRiot((s) => s.data.subjects.find((item) => item.id === id));
  const data = useRiot((s) => s.data);
  if (!subject) return <Empty title="Materia eliminada" body="Volvé atrás." />;
  const classes = data.slots.filter((slot) => slot.subjectId === id);
  return (
    <div className="flex flex-col gap-3">
      <Card>
        <p className="text-lg font-semibold">{subject.name}</p>
        <p className="text-sm text-muted">{subject.teacher || "Sin profesor"}</p>
      </Card>
      {classes.map((slot) => (
        <p key={slot.id} className="text-sm">{slot.onlyDate ? shortDate(slot.onlyDate) : WEEKDAY_LONG[slot.weekday]} · {slot.start}–{slot.end} · {slot.room || "Sin aula"}</p>
      ))}
      <p className="text-sm text-muted">Para renombrar o cambiar al profesor, usá Editar en Colegio. El nombre nuevo aparece en el horario y en las tareas porque están vinculadas.</p>
    </div>
  );
}

function ClassDetail({ id, date }: { id: string; date: string }) {
  const slot = useRiot((s) => s.data.slots.find((item) => item.id === id));
  const data = useRiot((s) => s.data);
  const saveOverride = useRiot((s) => s.saveOverride);
  const deleteSlot = useRiot((s) => s.deleteSlot);
  const addSlot = useRiot((s) => s.addSlot);
  const back = useRiot((s) => s.back);
  const [when, setWhen] = useState(date);
  const [start, setStart] = useState(slot?.start ?? "");
  const [end, setEnd] = useState(slot?.end ?? "");
  const [room, setRoom] = useState(slot?.room ?? "");
  const [moveTo, setMoveTo] = useState("");
  if (!slot) return <Empty title="Clase eliminada" body="La materia sigue existiendo." />;
  const subject = subjectById(data, slot.subjectId);
  return (
    <div className="flex flex-col gap-3">
      <Card>
        <p className="text-lg font-semibold">{subject?.name ?? "Clase"}</p>
        <p className="text-sm text-muted">{subject?.teacher || "Sin profesor"} · {slot.onlyDate ? `solo ${shortDate(slot.onlyDate)}` : WEEKDAY_LONG[slot.weekday]} · {slot.start}–{slot.end}</p>
      </Card>
      <p className="text-sm font-semibold">Cambio solo de un día</p>
      <Field label="Fecha"><input type="date" className={controlClass} value={when} onChange={(e) => setWhen(e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Desde"><input type="time" className={controlClass} value={start} onChange={(e) => setStart(e.target.value)} /></Field>
        <Field label="Hasta"><input type="time" className={controlClass} value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
      </div>
      <Field label="Aula"><input className={controlClass} value={room} onChange={(e) => setRoom(e.target.value)} /></Field>
      <Button onClick={() => saveOverride({ slotId: slot.id, date: when, start, end, room, cancelled: false })}>Guardar este día</Button>
      <Button variant="soft" onClick={() => saveOverride({ slotId: slot.id, date: when, cancelled: true })}>Suspender este día</Button>
      <Field label="Mover este día a">
        <input type="date" className={controlClass} value={moveTo} onChange={(e) => setMoveTo(e.target.value)} />
      </Field>
      <Button variant="soft" onClick={() => {
        if (!moveTo || !slot.subjectId) return;
        saveOverride({ slotId: slot.id, date: when, cancelled: true });
        addSlot({ subjectId: slot.subjectId, weekday: slot.weekday, start: slot.start, end: slot.end, room: slot.room, onlyDate: moveTo });
        setMoveTo("");
      }}>Confirmar el traslado</Button>
      <p className="text-xs text-muted">El horario habitual queda igual. Quitar la clase no elimina la materia.</p>
      <Button variant="danger" onClick={() => { deleteSlot(slot.id); back(); }}>Quitar esta clase</Button>
    </div>
  );
}

function SessionDetail({ id }: { id: string }) {
  const session = useRiot((s) => s.data.sessions.find((item) => item.id === id));
  const data = useRiot((s) => s.data);
  const deleteSession = useRiot((s) => s.deleteSession);
  const focusStart = useRiot((s) => s.focusStart);
  const push = useRiot((s) => s.push);
  const back = useRiot((s) => s.back);
  if (!session) return <Empty title="Sesión eliminada" body="Volvé atrás." />;
  return (
    <Card>
      <p className="text-lg font-semibold">{session.title}</p>
      <p className="mt-1 text-sm text-muted">{shortDate(session.date)}{session.time ? ` · ${session.time}` : ""} · {session.plannedMin} min · {session.status}</p>
      <p className="mt-1 text-sm text-muted">{subjectName(data, session.subjectId)} · foco real {Math.round(session.focusSec / 60)} min</p>
      {session.status !== "finalizada" ? <Button className="mt-3" onClick={() => { focusStart({ title: session.title, minutes: session.plannedMin, subjectId: session.subjectId, taskId: session.taskId, examId: session.examId, sessionId: session.id }); push({ id: "estudio" }); }}>Empezar</Button> : null}
      <Button className="mt-2" variant="danger" onClick={() => { deleteSession(session.id); back(); }}>Eliminar sesión</Button>
    </Card>
  );
}
