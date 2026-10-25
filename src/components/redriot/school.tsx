import { useState } from "react";
import { WEEKDAY_LONG, isoDate, weekday } from "@/lib/redriot/dates";
import { shortDate } from "@/lib/redriot/format";
import { subjectById, subjectName, subjectUsage } from "@/lib/redriot/logic";
import { useRiot } from "@/lib/redriot/store";
import type { Importance, SchoolTab, Swatch, TaskStatus } from "@/lib/redriot/types";
import { ColorField, ImportanceField, ReminderField, SubjectField, WeekdayField } from "./fields";
import { Button, Card, Empty, Field, Pill, Segmented, Sheet, SwatchDot, controlClass } from "./ui";

export function SchoolScreen({ tab }: { tab: SchoolTab }) {
  const setSchoolTab = useRiot((s) => s.setSchoolTab);
  return (
    <div className="flex flex-col gap-4">
      <Segmented
        value={tab}
        onChange={setSchoolTab}
        options={[
          { id: "materias", label: "Materias" },
          { id: "horario", label: "Horario" },
          { id: "tareas", label: "Tareas" },
          { id: "examenes", label: "Exámenes" },
        ]}
      />
      {tab === "materias" ? <Subjects /> : null}
      {tab === "horario" ? <Schedule /> : null}
      {tab === "tareas" ? <Tasks /> : null}
      {tab === "examenes" ? <Exams /> : null}
    </div>
  );
}

function Subjects() {
  const subjects = useRiot((s) => s.data.subjects);
  const data = useRiot((s) => s.data);
  const addSubject = useRiot((s) => s.addSubject);
  const updateSubject = useRiot((s) => s.updateSubject);
  const deleteSubject = useRiot((s) => s.deleteSubject);
  const push = useRiot((s) => s.push);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [teacher, setTeacher] = useState("");
  const [color, setColor] = useState<Swatch>("c1");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const editing = subjects.find((s) => s.id === editId);

  const start = (id?: string) => {
    const current = subjects.find((s) => s.id === id);
    setEditId(id ?? null);
    setName(current?.name ?? "");
    setTeacher(current?.teacher ?? "");
    setColor(current?.color ?? "c1");
    setOpen(true);
  };

  return (
    <div className="flex flex-col gap-3">
      <Button onClick={() => start()}>Nueva materia</Button>
      {subjects.length === 0 ? (
        <Empty title="Sin materias" body="Agregá una materia y el nombre del profesor. El horario se vincula a esa materia." />
      ) : (
        subjects.map((subject) => (
          <Card key={subject.id} className="flex items-center gap-3">
            <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => push({ id: "detalle", kind: "materia", entityId: subject.id })}>
              <SwatchDot id={subject.color} />
              <span>
                <span className="block font-semibold">{subject.name}</span>
                <span className="text-sm text-muted">{subject.teacher || "Sin profesor"}{subject.example ? " · Ejemplo" : ""}</span>
              </span>
            </button>
            <Button variant="ghost" onClick={() => start(subject.id)}>Editar</Button>
          </Card>
        ))
      )}
      <Sheet open={open} title={editing ? "Editar materia" : "Nueva materia"} onClose={() => setOpen(false)}>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) return;
            if (editId) updateSubject(editId, { name, teacher, color });
            else addSubject({ name, teacher, color });
            setOpen(false);
          }}
        >
          <Field label="Nombre">
            <input className={controlClass} value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Profesor">
            <input className={controlClass} value={teacher} onChange={(e) => setTeacher(e.target.value)} placeholder="Nombre y apellido" />
          </Field>
          <ColorField value={color} onChange={setColor} />
          <Button type="submit">Guardar</Button>
          {editId ? (
            <Button variant="danger" onClick={() => { setOpen(false); setConfirmId(editId); }}>Eliminar materia</Button>
          ) : null}
        </form>
      </Sheet>
      <Sheet open={!!confirmId} title="Eliminar materia" onClose={() => setConfirmId(null)}>
        {confirmId ? <DeleteSubject id={confirmId} onClose={() => setConfirmId(null)} onDelete={() => { deleteSubject(confirmId); setConfirmId(null); }} usage={subjectUsage(data, confirmId)} name={subjectName(data, confirmId)} /> : null}
      </Sheet>
    </div>
  );
}

function DeleteSubject({
  name,
  usage,
  onDelete,
  onClose,
}: {
  id: string;
  name: string;
  usage: ReturnType<typeof subjectUsage>;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        Se va a borrar {name}. Las {usage.slots} clases del horario también. Las {usage.tasks} tareas, {usage.exams} exámenes y {usage.sessions} sesiones se conservan, pero quedan sin materia.
      </p>
      <Button variant="danger" onClick={onDelete}>Eliminar y conservar lo demás</Button>
      <Button variant="ghost" onClick={onClose}>Cancelar</Button>
    </div>
  );
}

function Schedule() {
  const data = useRiot((s) => s.data);
  const addSlot = useRiot((s) => s.addSlot);
  const updateSlot = useRiot((s) => s.updateSlot);
  const deleteSlot = useRiot((s) => s.deleteSlot);
  const push = useRiot((s) => s.push);
  const [day, setDay] = useState(() => weekday(isoDate()));
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | undefined>();
  const [start, setStart] = useState("07:15");
  const [end, setEnd] = useState("08:45");
  const [room, setRoom] = useState("");
  const [onlyDate, setOnlyDate] = useState("");
  const slots = data.slots
    .filter((slot) => (onlyShowing(slot, day)))
    .sort((a, b) => a.start.localeCompare(b.start));

  const startEdit = (id?: string) => {
    const slot = data.slots.find((item) => item.id === id);
    setEditId(id ?? null);
    setSubjectId(slot?.subjectId ?? data.subjects[0]?.id);
    setDay(slot && !slot.onlyDate ? slot.weekday : day);
    setStart(slot?.start ?? "07:15");
    setEnd(slot?.end ?? "08:45");
    setRoom(slot?.room ?? "");
    setOnlyDate(slot?.onlyDate ?? "");
    setOpen(true);
  };

  return (
    <div className="flex flex-col gap-3">
      <WeekdayField value={[day]} onChange={(days) => setDay(days[days.length - 1] ?? day)} />
      <Button onClick={() => startEdit()} disabled={!data.subjects.length}>Agregar clase</Button>
      {!data.subjects.length ? <p className="text-sm text-muted">Primero creá una materia. Una clase no puede quedar suelta.</p> : null}
      {slots.length === 0 ? <Empty title="Sin clases este día" body="El horario habitual se repite cada semana. Un cambio de un solo día no modifica el resto." /> : null}
      {slots.map((slot) => {
        const subject = subjectById(data, slot.subjectId);
        return (
          <Card key={slot.id}>
            <button type="button" className="w-full text-left" onClick={() => push({ id: "detalle", kind: "clase", entityId: slot.id })}>
              <span className="flex items-center gap-2 font-semibold"><SwatchDot id={subject?.color ?? "c1"} />{subject?.name ?? "Materia"}</span>
              <span className="mt-1 block text-sm text-muted">{slot.start}–{slot.end} · {slot.room || "Sin aula"} · {subject?.teacher || "Sin profesor"}</span>
              {slot.onlyDate ? <span className="mt-1 block text-xs font-semibold text-primary">Solo el {shortDate(slot.onlyDate)}</span> : null}
              {slot.example ? <span className="text-xs text-primary">Ejemplo</span> : null}
            </button>
            <div className="mt-3 flex gap-2">
              <Button variant="soft" onClick={() => startEdit(slot.id)}>Editar</Button>
              <Button variant="ghost" onClick={() => deleteSlot(slot.id)}>Quitar clase</Button>
            </div>
          </Card>
        );
      })}
      <WeeklyOverview />
      <Sheet open={open} title={editId ? "Editar clase" : "Nueva clase"} onClose={() => setOpen(false)}>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!subjectId || end <= start) return;
            const input = { subjectId, weekday: day, start, end, room: room.trim(), onlyDate: onlyDate || undefined };
            if (editId) updateSlot(editId, input);
            else addSlot(input);
            setOpen(false);
          }}
        >
          <SubjectField subjects={data.subjects} value={subjectId} allowEmpty={false} onChange={setSubjectId} />
          <p className="text-sm text-muted">Día habitual: {WEEKDAY_LONG[day]}. Cambialo con los botones de arriba antes de guardar.</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Desde"><input type="time" className={controlClass} value={start} onChange={(e) => setStart(e.target.value)} required /></Field>
            <Field label="Hasta"><input type="time" className={controlClass} value={end} onChange={(e) => setEnd(e.target.value)} required /></Field>
          </div>
          {end <= start ? <p className="text-sm text-primary">La hora de fin tiene que ser posterior.</p> : null}
          <Field label="Aula"><input className={controlClass} value={room} onChange={(e) => setRoom(e.target.value)} /></Field>
          <Field label="Solo esta fecha (opcional)">
            <input type="date" className={controlClass} value={onlyDate} onChange={(e) => setOnlyDate(e.target.value)} />
          </Field>
          <p className="text-xs text-muted">Si elegís una fecha, la clase no se repite. Quitar la clase no borra la materia.</p>
          <Button type="submit">Guardar clase</Button>
        </form>
      </Sheet>
    </div>
  );
}

function onlyShowing(slot: { weekday: number; onlyDate?: string }, day: number) {
  if (slot.onlyDate) return weekday(slot.onlyDate) === day;
  return slot.weekday === day;
}

function WeeklyOverview() {
  const data = useRiot((s) => s.data);
  return (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Semana habitual</p>
      <div className="mt-3 flex flex-col gap-3">
        {[1, 2, 3, 4, 5, 6, 0].map((day) => {
          const slots = data.slots.filter((slot) => !slot.onlyDate && slot.weekday === day).sort((a, b) => a.start.localeCompare(b.start));
          if (!slots.length && (day === 0 || day === 6)) return null;
          return (
            <div key={day}>
              <p className="text-sm font-semibold">{WEEKDAY_LONG[day]}</p>
              {slots.length === 0 ? <p className="text-sm text-muted">Libre</p> : slots.map((slot) => (
                <p key={slot.id} className="text-sm text-muted">{slot.start} {subjectName(data, slot.subjectId)}{slot.room ? ` · ${slot.room}` : ""}</p>
              ))}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function Tasks() {
  const data = useRiot((s) => s.data);
  const addTask = useRiot((s) => s.addTask);
  const setTaskStatus = useRiot((s) => s.setTaskStatus);
  const push = useRiot((s) => s.push);
  const [filter, setFilter] = useState<"pendientes" | "todas" | "hechas" | "vencidas">("pendientes");
  const [open, setOpen] = useState(false);
  const today = isoDate();
  const tasks = data.tasks.filter((task) => {
    if (task.status === "cancelada" && filter !== "todas") return false;
    if (filter === "pendientes") return task.status === "pendiente";
    if (filter === "hechas") return task.status === "hecha";
    if (filter === "vencidas") return task.status === "pendiente" && !!task.dueDate && task.dueDate < today;
    return true;
  });

  return (
    <div className="flex flex-col gap-3">
      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { id: "pendientes", label: "Pendientes" },
          { id: "vencidas", label: "Vencidas" },
          { id: "hechas", label: "Hechas" },
          { id: "todas", label: "Todas" },
        ]}
      />
      <Button onClick={() => setOpen(true)}>Nueva tarea</Button>
      {tasks.length === 0 ? <Empty title="No hay tareas en este filtro" body="Creá una con título, materia y fecha. El resto puede quedar para después." /> : null}
      {tasks.map((task) => (
        <Card key={task.id} className="flex items-center gap-3">
          {task.status === "pendiente" ? (
            <button type="button" aria-label="Completar" className="h-11 w-11 shrink-0 rounded-full border border-primary" onClick={() => setTaskStatus(task.id, "hecha")} />
          ) : (
            <button type="button" aria-label="Reabrir" className="h-11 w-11 shrink-0 rounded-full bg-primary text-primary-fg" onClick={() => setTaskStatus(task.id, "pendiente")}>✓</button>
          )}
          <button type="button" className="min-w-0 flex-1 text-left" onClick={() => push({ id: "detalle", kind: "tarea", entityId: task.id })}>
            <span className="block font-semibold">{task.title}</span>
            <span className="text-sm text-muted">
              {subjectName(data, task.subjectId)}
              {task.dueDate ? ` · ${shortDate(task.dueDate)}` : " · sin fecha"}
              {task.example ? " · Ejemplo" : ""}
              {task.status !== "pendiente" ? ` · ${task.status}` : ""}
            </span>
          </button>
        </Card>
      ))}
      <TaskForm open={open} onClose={() => setOpen(false)} onSave={(input) => { addTask(input); setOpen(false); }} />
    </div>
  );
}

export function TaskForm({
  open,
  onClose,
  onSave,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (input: {
    title: string;
    subjectId?: string;
    description: string;
    dueDate?: string;
    dueTime?: string;
    importance: Importance;
    status: TaskStatus;
    estimatedMin: number;
    notes: string;
    reminders: { id: string; minutesBefore: number; enabled: boolean }[];
    urgencyOverride?: null;
    pinned?: boolean;
  }) => void;
  initial?: {
    title: string;
    subjectId?: string;
    description: string;
    dueDate?: string;
    dueTime?: string;
    importance: Importance;
    estimatedMin: number;
    notes: string;
    reminders: { id: string; minutesBefore: number; enabled: boolean }[];
  };
}) {
  const subjects = useRiot((s) => s.data.subjects);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [subjectId, setSubjectId] = useState(initial?.subjectId);
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");
  const [dueTime, setDueTime] = useState(initial?.dueTime ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [importance, setImportance] = useState<Importance>(initial?.importance ?? "media");
  const [estimatedMin, setEstimatedMin] = useState(String(initial?.estimatedMin ?? 30));
  const [reminders, setReminders] = useState(initial?.reminders ?? []);
  const [more, setMore] = useState(false);

  return (
    <Sheet open={open} title={initial ? "Editar tarea" : "Nueva tarea"} onClose={onClose}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim()) return;
          onSave({
            title,
            subjectId,
            description,
            dueDate: dueDate || undefined,
            dueTime: dueTime || undefined,
            importance,
            status: "pendiente",
            estimatedMin: Number(estimatedMin) || 30,
            notes,
            reminders,
          });
        }}
      >
        <Field label="Título"><input className={controlClass} value={title} onChange={(e) => setTitle(e.target.value)} required /></Field>
        <SubjectField subjects={subjects} value={subjectId} onChange={setSubjectId} />
        <Field label="Entrega"><input type="date" className={controlClass} value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
        <button type="button" className="text-left text-sm font-semibold text-primary" onClick={() => setMore((v) => !v)}>{more ? "Ocultar opcionales" : "Más opciones"}</button>
        {more ? (
          <>
            <Field label="Hora"><input type="time" className={controlClass} value={dueTime} onChange={(e) => setDueTime(e.target.value)} /></Field>
            <Field label="Descripción"><textarea className={`${controlClass} h-24 py-2`} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
            <Field label="Notas"><textarea className={`${controlClass} h-20 py-2`} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
            <Field label="Minutos estimados"><input inputMode="numeric" className={controlClass} value={estimatedMin} onChange={(e) => setEstimatedMin(e.target.value)} /></Field>
            <ImportanceField value={importance} onChange={setImportance} />
            <ReminderField value={reminders} onChange={setReminders} />
          </>
        ) : null}
        <Button type="submit">Guardar tarea</Button>
      </form>
    </Sheet>
  );
}

function Exams() {
  const data = useRiot((s) => s.data);
  const addExam = useRiot((s) => s.addExam);
  const push = useRiot((s) => s.push);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState<string | undefined>();
  const [date, setDate] = useState(isoDate());
  const [time, setTime] = useState("");
  const [topics, setTopics] = useState("");
  const exams = [...data.exams].sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""));

  return (
    <div className="flex flex-col gap-3">
      <Button onClick={() => setOpen(true)}>Nuevo examen</Button>
      {exams.length === 0 ? <Empty title="Sin exámenes" body="Anotá la fecha, la materia y los temas. Después podés planear sesiones de preparación." /> : null}
      {exams.map((exam) => (
        <button key={exam.id} type="button" className="card p-4 text-left" onClick={() => push({ id: "detalle", kind: "examen", entityId: exam.id })}>
          <span className="font-semibold">{exam.title}</span>
          <span className="mt-1 block text-sm text-muted">{shortDate(exam.date)}{exam.time ? ` · ${exam.time}` : ""} · {subjectName(data, exam.subjectId)}{exam.example ? " · Ejemplo" : ""}</span>
          {exam.topics ? <span className="mt-1 block text-sm">{exam.topics}</span> : null}
        </button>
      ))}
      <Sheet open={open} title="Nuevo examen" onClose={() => setOpen(false)}>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!title.trim() || !date) return;
            addExam({ title, subjectId, date, time: time || undefined, topics, notes: "", importance: "alta", reminders: [] });
            setTitle("");
            setTopics("");
            setOpen(false);
          }}
        >
          <Field label="Nombre"><input className={controlClass} value={title} onChange={(e) => setTitle(e.target.value)} required /></Field>
          <SubjectField subjects={data.subjects} value={subjectId} onChange={setSubjectId} />
          <Field label="Fecha"><input type="date" required className={controlClass} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Hora"><input type="time" className={controlClass} value={time} onChange={(e) => setTime(e.target.value)} /></Field>
          <Field label="Temas"><textarea className={`${controlClass} h-24 py-2`} value={topics} onChange={(e) => setTopics(e.target.value)} /></Field>
          <Button type="submit">Guardar examen</Button>
        </form>
      </Sheet>
    </div>
  );
}
