import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { addDaysIso, isoDate, mondayOf, toMin, weekday } from "@/lib/redriot/dates";
import { clock, minutesLabel, shortDate } from "@/lib/redriot/format";
import {
  entriesOn,
  focusElapsed,
  habitLog,
  habitScheduledOn,
  habitStreak,
  periodCount,
  proposeWeek,
  searchAll,
  statsBetween,
} from "@/lib/redriot/logic";
import { useRiot } from "@/lib/redriot/store";
import type { HabitFreq, HabitMark } from "@/lib/redriot/types";
import { ImportanceField, ReminderField, SubjectField, WeekdayField } from "./fields";
import { Button, Card, Empty, Field, ProgressBar, Sheet, controlClass } from "./ui";

export function RoutinesScreen() {
  const routines = useRiot((s) => s.data.routines);
  const addRoutine = useRiot((s) => s.addRoutine);
  const push = useRiot((s) => s.push);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("21:00");
  const [duration, setDuration] = useState("20");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [steps, setSteps] = useState("Revisar la mochila\nDejar la tarea lista");
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">Una rutina es una lista de pasos a una hora. El aviso no es una alarma del iPhone: solo llega si REDRIOT puede mostrar notificaciones.</p>
      <Button onClick={() => setOpen(true)}>Nueva rutina</Button>
      {routines.length === 0 ? <Empty title="Sin rutinas" body="Armá los pasos del cierre del día o de la mañana." /> : null}
      {routines.map((routine) => (
        <button key={routine.id} type="button" className="card p-4 text-left" onClick={() => push({ id: "detalle", kind: "rutina", entityId: routine.id })}>
          <span className="font-semibold">{routine.title}</span>
          <span className="mt-1 block text-sm text-muted">{routine.time} · {routine.durationMin} min · {routine.paused ? "En pausa" : `${routine.steps.length} pasos`}{routine.example ? " · Ejemplo" : ""}</span>
        </button>
      ))}
      <Sheet open={open} title="Nueva rutina" onClose={() => setOpen(false)}>
        <form className="flex flex-col gap-3" onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim() || !days.length) return;
          addRoutine({
            title,
            time,
            durationMin: Number(duration) || 20,
            weekdays: days,
            steps: steps.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => ({ id: crypto.randomUUID(), title: line })),
            paused: false,
            reminders: [{ id: crypto.randomUUID(), minutesBefore: 0, enabled: false }],
          });
          setTitle("");
          setOpen(false);
        }}>
          <Field label="Nombre"><input className={controlClass} value={title} onChange={(e) => setTitle(e.target.value)} required /></Field>
          <Field label="Hora"><input type="time" className={controlClass} value={time} onChange={(e) => setTime(e.target.value)} required /></Field>
          <Field label="Duración (min)"><input className={controlClass} inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} /></Field>
          <WeekdayField value={days} onChange={setDays} />
          <Field label="Pasos, uno por línea"><textarea className={`${controlClass} h-28 py-2`} value={steps} onChange={(e) => setSteps(e.target.value)} /></Field>
          <Button type="submit">Guardar rutina</Button>
        </form>
      </Sheet>
    </div>
  );
}

export function HabitsScreen() {
  const habits = useRiot((s) => s.data.habits);
  const addHabit = useRiot((s) => s.addHabit);
  const setHabitLog = useRiot((s) => s.setHabitLog);
  const push = useRiot((s) => s.push);
  const today = isoDate();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [frequency, setFrequency] = useState<HabitFreq>("diaria");
  const [target, setTarget] = useState("4");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">Los días que no corresponden no cuentan como fallo. Podés marcar hecho, omitido o no aplica.</p>
      <Button onClick={() => setOpen(true)}>Nuevo hábito</Button>
      {habits.length === 0 ? <Empty title="Sin hábitos" body="Un hábito semanal puede ser, por ejemplo, cuatro veces por semana." /> : null}
      {habits.map((habit) => {
        const period = periodCount(habit, today);
        const streak = habitStreak(habit, today);
        const log = habitLog(habit, today);
        const scheduled = habit.frequency === "semanal" || habit.frequency === "mensual" || habitScheduledOn(habit, today);
        return (
          <Card key={habit.id}>
            <button type="button" className="w-full text-left" onClick={() => push({ id: "detalle", kind: "habito", entityId: habit.id })}>
              <span className="font-semibold">{habit.title}</span>
              <span className="mt-1 block text-sm text-muted">{period.done} de {period.target} {period.label} · racha {streak}{habit.example ? " · Ejemplo" : ""}</span>
            </button>
            <ProgressBar value={period.target ? (period.done / period.target) * 100 : 0} />
            {scheduled ? (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {(["hecha", "omitida", "na"] as HabitMark[]).map((status) => (
                  <Button key={status} variant={log?.status === status ? "primary" : "soft"} onClick={() => setHabitLog(habit.id, today, log?.status === status ? null : status)}>
                    {status === "hecha" ? "Hecho" : status === "omitida" ? "Omitir" : "No aplica"}
                  </Button>
                ))}
              </div>
            ) : <p className="mt-2 text-sm text-muted">Hoy no corresponde.</p>}
          </Card>
        );
      })}
      <Sheet open={open} title="Nuevo hábito" onClose={() => setOpen(false)}>
        <form className="flex flex-col gap-3" onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim()) return;
          addHabit({
            title,
            frequency,
            target: frequency === "semanal" || frequency === "mensual" ? Number(target) || 1 : 1,
            weekdays: frequency === "personalizada" || frequency === "diaria" ? days : [],
          });
          setTitle("");
          setOpen(false);
        }}>
          <Field label="Nombre"><input className={controlClass} value={title} onChange={(e) => setTitle(e.target.value)} required /></Field>
          <Field label="Frecuencia">
            <select className={controlClass} value={frequency} onChange={(e) => setFrequency(e.target.value as HabitFreq)}>
              <option value="diaria">Diaria</option>
              <option value="semanal">Semanal</option>
              <option value="mensual">Mensual</option>
              <option value="personalizada">Días elegidos</option>
            </select>
          </Field>
          {frequency === "semanal" || frequency === "mensual" ? (
            <Field label={frequency === "semanal" ? "Veces por semana" : "Veces por mes"}>
              <input className={controlClass} inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value)} />
            </Field>
          ) : (
            <WeekdayField value={days} onChange={setDays} />
          )}
          <Button type="submit">Guardar hábito</Button>
        </form>
      </Sheet>
    </div>
  );
}

export function StudyScreen() {
  const data = useRiot((s) => s.data);
  const focusStart = useRiot((s) => s.focusStart);
  const focusPause = useRiot((s) => s.focusPause);
  const focusResume = useRiot((s) => s.focusResume);
  const focusFinish = useRiot((s) => s.focusFinish);
  const [now, setNow] = useState(() => Date.now());
  const [minutes, setMinutes] = useState(25);
  const [title, setTitle] = useState("Estudio");
  const [subjectId, setSubjectId] = useState<string | undefined>();
  const [taskId, setTaskId] = useState<string | undefined>();
  const [examId, setExamId] = useState<string | undefined>();
  const live = data.liveFocus;
  const session = data.sessions.find((item) => item.id === live?.sessionId);

  useEffect(() => {
    if (!live?.runningSince) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [live?.runningSince]);

  const elapsed = focusElapsed(live, now);
  const history = [...data.sessions].reverse().slice(0, 8);

  return (
    <div className="flex flex-col gap-4">
      <Card className="items-center py-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{session?.title ?? "Modo concentración"}</p>
        <p className="mt-2 text-6xl font-semibold tabular-nums tracking-tight">{clock(elapsed)}</p>
        <p className="mt-2 text-sm text-muted">
          {live?.runningSince ? "En curso. Las pausas no suman." : live ? "En pausa." : `Listo para ${minutes} min.`}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {!live ? <Button onClick={() => focusStart({ title, minutes, subjectId, taskId, examId })}>Empezar</Button> : null}
          {live?.runningSince ? <Button variant="soft" onClick={focusPause}>Pausar</Button> : null}
          {live && !live.runningSince ? <Button onClick={focusResume}>Reanudar</Button> : null}
          {live ? <Button variant="danger" onClick={focusFinish}>Finalizar</Button> : null}
        </div>
      </Card>
      {!live ? (
        <Card className="flex flex-col gap-3">
          <Field label="En qué te concentrás"><input className={controlClass} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <div className="grid grid-cols-4 gap-2">
            {[25, 45, 50, 15].map((value) => (
              <Button key={value} variant={minutes === value ? "primary" : "soft"} onClick={() => setMinutes(value)}>{value}</Button>
            ))}
          </div>
          <SubjectField subjects={data.subjects} value={subjectId} onChange={setSubjectId} />
          <Field label="Tarea vinculada">
            <select className={controlClass} value={taskId ?? ""} onChange={(e) => setTaskId(e.target.value || undefined)}>
              <option value="">Ninguna</option>
              {data.tasks.filter((task) => task.status === "pendiente").map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
            </select>
          </Field>
          <Field label="Examen vinculado">
            <select className={controlClass} value={examId ?? ""} onChange={(e) => setExamId(e.target.value || undefined)}>
              <option value="">Ninguno</option>
              {data.exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.title}</option>)}
            </select>
          </Field>
        </Card>
      ) : null}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Historial</h2>
        {history.length === 0 ? <p className="text-sm text-muted">Todavía no hay sesiones.</p> : history.map((item) => (
          <Card key={item.id}>
            <p className="font-semibold">{item.title}</p>
            <p className="text-sm text-muted">{shortDate(item.date)} · {item.status} · foco {minutesLabel(Math.round(item.focusSec / 60))}</p>
          </Card>
        ))}
      </section>
    </div>
  );
}

export function InboxScreen() {
  const inbox = useRiot((s) => s.data.inbox);
  const addInbox = useRiot((s) => s.addInbox);
  const convertInbox = useRiot((s) => s.convertInbox);
  const deleteInbox = useRiot((s) => s.deleteInbox);
  const updateInbox = useRiot((s) => s.updateInbox);
  const push = useRiot((s) => s.push);
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState("Idea");
  const [showArchived, setShowArchived] = useState(false);
  const items = inbox.filter((item) => (showArchived ? item.archived : !item.archived) && `${item.title} ${item.notes} ${item.category}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">Ideas sin fecha. Convertirlas no duplica si ya las pasaste a una tarea o un evento.</p>
      <form className="flex flex-col gap-2" onSubmit={(event) => {
        event.preventDefault();
        if (!title.trim()) return;
        addInbox({ title, notes, category });
        setTitle("");
        setNotes("");
      }}>
        <Field label="Pendiente"><input className={controlClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Anotá la idea" /></Field>
        <Field label="Nota"><input className={controlClass} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <Field label="Categoría"><input className={controlClass} value={category} onChange={(e) => setCategory(e.target.value)} /></Field>
        <Button type="submit">Guardar en la bandeja</Button>
      </form>
      <Field label="Buscar"><input className={controlClass} value={query} onChange={(e) => setQuery(e.target.value)} /></Field>
      <Button variant="ghost" onClick={() => setShowArchived((v) => !v)}>{showArchived ? "Ver activos" : "Ver archivados"}</Button>
      {items.length === 0 ? <Empty title="Bandeja vacía" body="Lo que todavía no tiene fecha vive acá." /> : null}
      {items.map((item) => (
        <Card key={item.id}>
          <p className="font-semibold">{item.title}</p>
          <p className="text-sm text-muted">{item.category}{item.notes ? ` · ${item.notes}` : ""}{item.example ? " · Ejemplo" : ""}</p>
          {item.convertedId ? (
            <Button className="mt-3" variant="soft" onClick={() => push({ id: "detalle", kind: item.convertedKind === "tarea" ? "tarea" : "evento", entityId: item.convertedId! })}>Abrir lo convertido</Button>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="soft" onClick={() => { const id = convertInbox(item.id, "tarea"); if (id) push({ id: "detalle", kind: "tarea", entityId: id }); }}>A tarea</Button>
              <Button variant="soft" onClick={() => { const id = convertInbox(item.id, "evento"); if (id) push({ id: "detalle", kind: "evento", entityId: id }); }}>A evento</Button>
              <Button variant="soft" onClick={() => { const id = convertInbox(item.id, "recordatorio"); if (id) push({ id: "detalle", kind: "evento", entityId: id }); }}>A recordatorio</Button>
            </div>
          )}
          <div className="mt-2 flex gap-2">
            <Button variant="ghost" onClick={() => updateInbox(item.id, { archived: !item.archived })}>{item.archived ? "Recuperar" : "Archivar"}</Button>
            <Button variant="ghost" onClick={() => deleteInbox(item.id)}>Eliminar</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function NotesScreen() {
  const notes = useRiot((s) => s.data.notes);
  const addNote = useRiot((s) => s.addNote);
  const push = useRiot((s) => s.push);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  return (
    <div className="flex flex-col gap-3">
      <Button onClick={() => setOpen(true)}>Nueva nota</Button>
      {notes.length === 0 ? <Empty title="Sin notas" body="Título, texto, categoría y etiquetas. Se pueden vincular desde el detalle." /> : null}
      {notes.map((note) => (
        <button key={note.id} type="button" className="card p-4 text-left" onClick={() => push({ id: "detalle", kind: "nota", entityId: note.id })}>
          <span className="font-semibold">{note.title || "Sin título"}</span>
          <span className="mt-1 block text-sm text-muted">{note.category || "Nota"}{note.tags.length ? ` · ${note.tags.join(", ")}` : ""}{note.example ? " · Ejemplo" : ""}</span>
        </button>
      ))}
      <Sheet open={open} title="Nueva nota" onClose={() => setOpen(false)}>
        <form className="flex flex-col gap-3" onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim() && !content.trim()) return;
          const id = addNote({ title: title || "Nota", content, category, tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean), links: [] });
          setTitle("");
          setContent("");
          setOpen(false);
          push({ id: "detalle", kind: "nota", entityId: id });
        }}>
          <Field label="Título"><input className={controlClass} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Contenido"><textarea className={`${controlClass} h-32 py-2`} value={content} onChange={(e) => setContent(e.target.value)} /></Field>
          <Field label="Categoría"><input className={controlClass} value={category} onChange={(e) => setCategory(e.target.value)} /></Field>
          <Field label="Etiquetas"><input className={controlClass} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="separadas por coma" /></Field>
          <Button type="submit">Guardar nota</Button>
        </form>
      </Sheet>
    </div>
  );
}

export function SearchScreen() {
  const data = useRiot((s) => s.data);
  const push = useRiot((s) => s.push);
  const [query, setQuery] = useState("");
  const hits = searchAll(data, query);
  return (
    <div className="flex flex-col gap-3">
      <Field label="Buscar en todo">
        <input autoFocus className={controlClass} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tareas, materias, notas…" />
      </Field>
      {query && hits.length === 0 ? <p className="text-sm text-muted">Nada coincide.</p> : null}
      {hits.map((hit) => (
        <button key={`${hit.kind}-${hit.id}`} type="button" className="card p-4 text-left" onClick={() => push({ id: "detalle", kind: hit.kind, entityId: hit.id, date: hit.date })}>
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">{hit.meta}</span>
          <span className="mt-1 block font-semibold">{hit.title}</span>
          {hit.date ? <span className="text-sm text-muted">{shortDate(hit.date)}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function TomorrowScreen() {
  const data = useRiot((s) => s.data);
  const togglePrep = useRiot((s) => s.togglePrep);
  const addPrep = useRiot((s) => s.addPrep);
  const deletePrep = useRiot((s) => s.deletePrep);
  const updateTask = useRiot((s) => s.updateTask);
  const setNight = useRiot((s) => s.setNight);
  const push = useRiot((s) => s.push);
  const today = isoDate();
  const tomorrow = addDaysIso(today, 1);
  const items = entriesOn(data, tomorrow);
  const late = data.tasks.filter((task) => task.status === "pendiente" && task.dueDate && task.dueDate < today);
  const [label, setLabel] = useState("");
  const [moveId, setMoveId] = useState<string | null>(null);
  const [moveDate, setMoveDate] = useState(tomorrow);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">Esto es {shortDate(tomorrow)}. Nada se reprograma solo.</p>
      {items.length === 0 ? <Empty title="Mañana está liviano" body="No hay clases, entregas, exámenes, eventos ni rutinas." /> : items.map((item) => (
        <button key={item.key} type="button" className="card p-4 text-left" onClick={() => push({ id: "detalle", kind: item.detail, entityId: item.id, date: tomorrow })}>
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">{item.kind}</span>
          <span className="mt-1 block font-semibold">{item.title}</span>
          <span className="text-sm text-muted">{item.start ? `${item.start} · ` : ""}{item.meta}</span>
        </button>
      ))}
      <Card>
        <p className="font-semibold">Checklist</p>
        <div className="mt-3 flex flex-col gap-2">
          {data.prep.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <button type="button" aria-pressed={item.doneOn === tomorrow} onClick={() => togglePrep(item.id, tomorrow)} className={`h-11 w-11 shrink-0 rounded-full border ${item.doneOn === tomorrow ? "border-primary bg-primary text-primary-fg" : "border-line"}`}>
                {item.doneOn === tomorrow ? "✓" : ""}
              </button>
              <span className="flex-1">{item.label}</span>
              <Button variant="ghost" onClick={() => deletePrep(item.id)}>Quitar</Button>
            </div>
          ))}
        </div>
        <form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); if (!label.trim()) return; addPrep(label); setLabel(""); }}>
          <input className={controlClass} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Mochila, materiales, tarea…" />
          <Button type="submit">Añadir</Button>
        </form>
      </Card>
      <Card>
        <p className="font-semibold">Aviso nocturno</p>
        <p className="mt-1 text-sm text-muted">Si las notificaciones están permitidas y la app está abierta, te recuerda revisar mañana. No es una alarma del sistema.</p>
        <div className="mt-3 flex gap-2">
          <input type="time" className={controlClass} value={data.preferences.nightReminder} onChange={(e) => setNight(data.preferences.nightReminderEnabled, e.target.value)} />
          <Button variant={data.preferences.nightReminderEnabled ? "primary" : "soft"} onClick={() => setNight(!data.preferences.nightReminderEnabled, data.preferences.nightReminder)}>
            {data.preferences.nightReminderEnabled ? "Activo" : "Activar"}
          </Button>
        </div>
      </Card>
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Atrasadas</h2>
        {late.length === 0 ? <p className="text-sm text-muted">No hay tareas vencidas.</p> : late.map((task) => (
          <Card key={task.id}>
            <p className="font-semibold">{task.title}</p>
            <p className="text-sm text-muted">Venció el {shortDate(task.dueDate!)}</p>
            {moveId === task.id ? (
              <form className="mt-3 flex flex-col gap-2" onSubmit={(event) => { event.preventDefault(); updateTask(task.id, { dueDate: moveDate, urgencyOverride: null }); setMoveId(null); }}>
                <input type="date" className={controlClass} value={moveDate} onChange={(e) => setMoveDate(e.target.value)} required />
                <Button type="submit">Confirmar nueva fecha</Button>
              </form>
            ) : <Button className="mt-3" variant="soft" onClick={() => setMoveId(task.id)}>Reprogramar</Button>}
          </Card>
        ))}
      </section>
    </div>
  );
}

export function WeekScreen() {
  const data = useRiot((s) => s.data);
  const addSession = useRiot((s) => s.addSession);
  const push = useRiot((s) => s.push);
  const setToast = useRiot((s) => s.setToast);
  const today = isoDate();
  const start = mondayOf(today);
  const days = Array.from({ length: 7 }, (_, i) => addDaysIso(start, i));
  const [proposal, setProposal] = useState<ReturnType<typeof proposeWeek> | null>(null);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [edits, setEdits] = useState<Record<string, { start: string; end: string }>>({});

  const organize = () => {
    const now = new Date();
    const result = proposeWeek(data, today, now.getHours() * 60 + now.getMinutes());
    setProposal(result);
    setPicked(Object.fromEntries(result.blocks.map((block) => [block.id, true])));
    setEdits(Object.fromEntries(result.blocks.map((block) => [block.id, { start: block.start, end: block.end }])));
  };

  const apply = () => {
    if (!proposal) return;
    const chosen = proposal.blocks.filter((block) => picked[block.id]);
    for (const block of chosen) {
      const startMin = toMin(edits[block.id]?.start ?? block.start);
      const endMin = toMin(edits[block.id]?.end ?? block.end);
      if (startMin == null || endMin == null || endMin <= startMin) {
        setToast("Revisá las horas de la propuesta.");
        return;
      }
      const clash = entriesOn(data, block.date).some((entry) => entry.startMin != null && entry.endMin != null && startMin < entry.endMin && entry.startMin < endMin);
      if (clash) {
        setToast(`«${block.title}» pisa otro compromiso. Cambiá la hora o desmarcalo.`);
        return;
      }
    }
    for (const block of chosen) {
      const startMin = toMin(edits[block.id].start)!;
      const endMin = toMin(edits[block.id].end)!;
      addSession({
        title: block.title,
        date: block.date,
        time: edits[block.id].start,
        plannedMin: endMin - startMin,
        subjectId: block.subjectId,
        taskId: block.taskId,
        examId: block.examId,
        status: "planificada",
      });
    }
    setProposal(null);
    setToast(chosen.length ? "Sesiones agregadas. Las tareas no se movieron." : "No se agendó nada.");
  };

  return (
    <div className="flex flex-col gap-4">
      <Button onClick={organize}>Organizar mi semana</Button>
      <p className="text-sm text-muted">La propuesta mira entregas, exámenes, clases y eventos. No toca el calendario hasta que confirmes.</p>
      {days.map((date) => {
        const items = entriesOn(data, date);
        return (
          <div key={date}>
            <p className="text-sm font-semibold">{shortDate(date)} · {["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"][weekday(date)]}</p>
            {items.length === 0 ? <p className="text-sm text-muted">Libre</p> : items.map((item) => (
              <button key={item.key} type="button" className="mt-2 block w-full text-left text-sm" onClick={() => push({ id: "detalle", kind: item.detail, entityId: item.id, date })}>
                {item.start ?? "Día"} · {item.title}
              </button>
            ))}
          </div>
        );
      })}
      {proposal ? (
        <Card className="flex flex-col gap-3">
          <p className="font-semibold">Propuesta editable</p>
          {proposal.blocks.length === 0 ? <p className="text-sm text-muted">No encontré huecos libres.</p> : null}
          {proposal.blocks.map((block) => (
            <div key={block.id} className="rounded-2xl border border-line p-3">
              <label className="flex items-start gap-2">
                <input type="checkbox" className="mt-1 size-5" checked={!!picked[block.id]} onChange={(e) => setPicked({ ...picked, [block.id]: e.target.checked })} />
                <span>
                  <span className="block font-semibold">{block.title}</span>
                  <span className="text-sm text-muted">{shortDate(block.date)}</span>
                </span>
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input type="time" className={controlClass} value={edits[block.id]?.start ?? block.start} onChange={(e) => setEdits({ ...edits, [block.id]: { ...edits[block.id], start: e.target.value } })} />
                <input type="time" className={controlClass} value={edits[block.id]?.end ?? block.end} onChange={(e) => setEdits({ ...edits, [block.id]: { ...edits[block.id], end: e.target.value } })} />
              </div>
            </div>
          ))}
          {proposal.skipped.map((item) => (
            <p key={item.title} className="text-sm text-muted">{item.title}: {item.reason}</p>
          ))}
          <Button onClick={apply}>Agendar las marcadas</Button>
        </Card>
      ) : null}
    </div>
  );
}

export function StatsScreen() {
  const data = useRiot((s) => s.data);
  const [range, setRange] = useState<"semana" | "mes">("semana");
  const today = isoDate();
  const start = range === "semana" ? mondayOf(today) : `${today.slice(0, 7)}-01`;
  const stats = useMemo(() => statsBetween(data, start, today), [data, start, today]);
  const cards = [
    ["Tareas hechas", String(stats.tasksDone)],
    ["Pendientes", String(stats.tasksPending)],
    ["Omitidas", String(stats.tasksSkipped)],
    ["Canceladas", String(stats.tasksCancelled)],
    ["A tiempo", stats.withDueDone ? `${stats.onTime} de ${stats.withDueDone}` : "Sin cierres"],
    ["Exámenes", `${stats.examsUpcoming} próximos`],
    ["Estudio", minutesLabel(stats.focusMin)],
    ["Hábitos", stats.habitScheduled ? `${stats.habitRate}%` : "Sin registros"],
    ["Rutinas", stats.routineSteps ? `${stats.routineRate}%` : "Sin registros"],
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        <Button variant={range === "semana" ? "primary" : "soft"} onClick={() => setRange("semana")}>Semana</Button>
        <Button variant={range === "mes" ? "primary" : "soft"} onClick={() => setRange("mes")}>Mes</Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {cards.map(([label, value]) => (
          <Card key={label}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
          </Card>
        ))}
      </div>
      <Card>
        <p className="mb-3 font-semibold">Tareas completadas por día</p>
        {stats.weekBars.every((bar) => bar.hechas === 0) ? <p className="mb-3 text-sm text-muted">Todavía no hay tareas completadas en este período.</p> : null}
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.weekBars}>
              <XAxis dataKey="label" stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} width={24} />
              <Tooltip cursor={{ fill: "var(--soft)" }} contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, color: "var(--fg)" }} />
              <Bar dataKey="hechas" fill="var(--primary)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <p className="text-xs text-muted">Hábitos: {stats.habitDone} de {stats.habitScheduled} marcas previstas. Rutinas: {stats.routineDone} de {stats.routineSteps} pasos. Exámenes ya pasados: {stats.examsPast}.</p>
    </div>
  );
}
