import { useEffect, useState } from "react";
import { greeting, longDate, shortDate } from "@/lib/redriot/format";
import {
  conflictsOn,
  dayProgress,
  effectiveUrgency,
  entriesOn,
  habitLog,
  habitScheduledOn,
  nextClass,
  periodCount,
  priorityReason,
  subjectById,
  topThree,
  URGENCY_LABEL,
} from "@/lib/redriot/logic";
import { notificationSupport } from "@/lib/redriot/notify";
import { isoDate } from "@/lib/redriot/dates";
import { useRiot } from "@/lib/redriot/store";
import { Button, Card, Pill, ProgressBar, SwatchDot } from "./ui";

export function HomeScreen() {
  const data = useRiot((s) => s.data);
  const push = useRiot((s) => s.push);
  const openQuick = useRiot((s) => s.openQuick);
  const setTaskStatus = useRiot((s) => s.setTaskStatus);
  const setHabitLog = useRiot((s) => s.setHabitLog);
  const loadExamples = useRiot((s) => s.loadExamples);
  const setToast = useRiot((s) => s.setToast);
  const [now, setNow] = useState(() => new Date());
  const [support, setSupport] = useState({ standalone: true, supported: true });

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30000);
    setSupport(notificationSupport());
    return () => window.clearInterval(id);
  }, []);

  const today = isoDate(now);
  const progress = dayProgress(data, today);
  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const priorities = topThree(data, today);
  const upcomingClass = nextClass(data, now);
  const todayItems = entriesOn(data, today);
  const conflicts = conflictsOn(data, today);
  const tasks = data.tasks.filter((task) => task.status === "pendiente" && task.dueDate === today);
  const soonTasks = data.tasks
    .filter((task) => task.status === "pendiente" && task.dueDate && task.dueDate > today)
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
    .slice(0, 4);
  const exams = data.exams.filter((exam) => exam.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  const habitsToday = data.habits.filter((habit) => habitScheduledOn(habit, today) || habit.frequency === "semanal" || habit.frequency === "mensual");
  const routines = todayItems.filter((item) => item.kind === "rutina");
  const sessions = data.sessions.filter((session) => session.date === today);
  const empty = data.subjects.length + data.tasks.length + data.events.length + data.habits.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{greeting(now, data.preferences.displayName)}</h1>
        <p className="mt-1 text-muted">{longDate(today)}</p>
      </div>

      {!support.standalone && !data.preferences.installDismissed ? (
        <Card className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">Instalá REDRIOT</p>
            <p className="text-sm text-muted">En el iPhone, los avisos web solo llegan si la abrís desde el inicio.</p>
          </div>
          <Button variant="soft" onClick={() => push({ id: "ajustes" })}>Ver cómo</Button>
        </Card>
      ) : null}

      <Card>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Progreso de hoy</p>
            <p className="text-2xl font-semibold tabular-nums">{progress.total ? `${progress.done} de ${progress.total}` : "Sin meta hoy"}</p>
          </div>
          <p className="text-lg font-semibold tabular-nums text-primary">{percent}%</p>
        </div>
        <ProgressBar value={percent} />
      </Card>

      {conflicts.length ? (
        <Card>
          <p className="font-semibold text-primary">Horarios superpuestos</p>
          {conflicts.map((conflict) => (
            <p key={`${conflict.a}-${conflict.b}`} className="mt-1 text-sm text-muted">
              {conflict.a} choca con {conflict.b}. No moví nada.
            </p>
          ))}
        </Card>
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Hacé esto primero</h2>
        {priorities.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">Cuando cargues tareas pendientes, acá van a aparecer las tres que más conviene atender.</p>
          </Card>
        ) : (
          priorities.map((task, index) => (
            <button key={task.id} type="button" onClick={() => push({ id: "detalle", kind: "tarea", entityId: task.id })} className="card flex w-full items-start gap-3 p-4 text-left">
              <span className="mt-0.5 font-semibold tabular-nums text-primary">{index + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{task.title}</span>
                <span className="mt-1 block text-sm text-muted">{priorityReason(task, today)}</span>
              </span>
            </button>
          ))
        )}
        <button type="button" onClick={() => push({ id: "semana" })} className="text-left text-sm font-semibold text-primary">
          Ver sugerencia de la semana, sin cambiar el calendario
        </button>
      </section>

      <Card>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Próxima clase</p>
        {upcomingClass ? (
          <button type="button" className="mt-2 flex w-full items-center gap-3 text-left" onClick={() => push({ id: "detalle", kind: "clase", entityId: upcomingClass.id, date: upcomingClass.date })}>
            <SwatchDot id={upcomingClass.swatch ?? "c1"} />
            <span>
              <span className="block font-semibold">{upcomingClass.title}</span>
              <span className="text-sm text-muted">
                {upcomingClass.date === today ? "Hoy" : shortDate(upcomingClass.date)} · {upcomingClass.start}–{upcomingClass.end}
                {upcomingClass.meta ? ` · ${upcomingClass.meta}` : ""}
              </span>
            </span>
          </button>
        ) : (
          <p className="mt-2 text-sm text-muted">No hay clases cargadas en las próximas semanas.</p>
        )}
      </Card>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Horario de hoy</h2>
          <button type="button" className="text-sm font-semibold text-primary" onClick={() => push({ id: "colegio", tab: "horario" })}>Ver semana</button>
        </div>
        {todayItems.filter((item) => item.kind === "clase").length === 0 ? (
          <p className="text-sm text-muted">Hoy no hay clases en el horario.</p>
        ) : (
          todayItems.filter((item) => item.kind === "clase").map((item) => (
            <button key={item.key} type="button" onClick={() => push({ id: "detalle", kind: "clase", entityId: item.id, date: today })} className="card flex items-center justify-between p-4 text-left">
              <span>
                <span className="block font-semibold">{item.title}</span>
                <span className="text-sm text-muted">{item.muted ? item.meta : `${item.start}–${item.end} · ${item.meta}`}</span>
              </span>
              <SwatchDot id={item.swatch ?? "c1"} />
            </button>
          ))
        )}
      </section>

      <CheckList
        title="Tareas de hoy"
        empty="No tenés entregas para hoy."
        rows={tasks.map((task) => ({
          id: task.id,
          title: task.title,
          meta: `${subjectById(data, task.subjectId)?.name ?? "General"} · ${URGENCY_LABEL[effectiveUrgency(task, today)]}`,
          done: false,
          onOpen: () => push({ id: "detalle", kind: "tarea", entityId: task.id }),
          onDone: () => setTaskStatus(task.id, "hecha"),
        }))}
      />

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Próximas entregas</h2>
        {soonTasks.length === 0 ? <p className="text-sm text-muted">No hay entregas más adelante.</p> : soonTasks.map((task) => (
          <button key={task.id} type="button" className="card p-4 text-left" onClick={() => push({ id: "detalle", kind: "tarea", entityId: task.id })}>
            <span className="font-semibold">{task.title}</span>
            <span className="mt-1 block text-sm text-muted">{shortDate(task.dueDate!)} · {subjectById(data, task.subjectId)?.name ?? "Sin materia"}</span>
          </button>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Exámenes</h2>
        {exams.length === 0 ? <p className="text-sm text-muted">No hay exámenes próximos.</p> : exams.map((exam) => (
          <button key={exam.id} type="button" className="card p-4 text-left" onClick={() => push({ id: "detalle", kind: "examen", entityId: exam.id })}>
            <span className="font-semibold">{exam.title}</span>
            <span className="mt-1 block text-sm text-muted">{shortDate(exam.date)}{exam.time ? ` · ${exam.time}` : ""} · {subjectById(data, exam.subjectId)?.name ?? "General"}</span>
          </button>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Eventos de hoy</h2>
        {todayItems.filter((item) => item.kind === "evento").length === 0 ? <p className="text-sm text-muted">La agenda de hoy no tiene eventos.</p> : todayItems.filter((item) => item.kind === "evento").map((item) => (
          <button key={item.key} type="button" className="card p-4 text-left" onClick={() => push({ id: "detalle", kind: "evento", entityId: item.id, date: today })}>
            <span className="font-semibold">{item.title}</span>
            <span className="mt-1 block text-sm text-muted">{item.start ? `${item.start} · ` : ""}{item.meta}</span>
          </button>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Rutinas</h2>
        {routines.length === 0 ? <p className="text-sm text-muted">Hoy no corresponde ninguna rutina.</p> : routines.map((item) => (
          <button key={item.key} type="button" className="card flex items-center justify-between p-4 text-left" onClick={() => push({ id: "detalle", kind: "rutina", entityId: item.id })}>
            <span>
              <span className="block font-semibold">{item.title}</span>
              <span className="text-sm text-muted">{item.start} · {item.meta}</span>
            </span>
            {item.done ? <Pill active>Lista</Pill> : null}
          </button>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Hábitos</h2>
        {habitsToday.length === 0 ? <p className="text-sm text-muted">No hay hábitos para marcar.</p> : habitsToday.map((habit) => {
          const period = periodCount(habit, today);
          const log = habitLog(habit, today);
          const daily = habit.frequency === "diaria" || habit.frequency === "personalizada";
          return (
            <Card key={habit.id} className="flex items-center justify-between gap-3">
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => push({ id: "detalle", kind: "habito", entityId: habit.id })}>
                <span className="block font-semibold">{habit.title}</span>
                <span className="text-sm text-muted">{period.done} de {period.target} {period.label}</span>
              </button>
              {daily ? (
                <Button
                  variant={log?.status === "hecha" ? "primary" : "soft"}
                  onClick={() => setHabitLog(habit.id, today, log?.status === "hecha" ? null : "hecha")}
                >
                  {log?.status === "hecha" ? "Hecho" : "Listo"}
                </Button>
              ) : (
                <Button variant="soft" onClick={() => setHabitLog(habit.id, today, "hecha")}>+1</Button>
              )}
            </Card>
          );
        })}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Estudio</h2>
          <button type="button" className="text-sm font-semibold text-primary" onClick={() => push({ id: "estudio" })}>Abrir modo foco</button>
        </div>
        {data.liveFocus ? <Card><p className="font-semibold">Hay una sesión en curso.</p></Card> : null}
        {sessions.length === 0 ? <p className="text-sm text-muted">Hoy no hay sesiones cargadas.</p> : sessions.map((session) => (
          <button key={session.id} type="button" className="card p-4 text-left" onClick={() => push({ id: "detalle", kind: "sesion", entityId: session.id })}>
            <span className="font-semibold">{session.title}</span>
            <span className="mt-1 block text-sm text-muted">{session.time ? `${session.time} · ` : ""}{session.status}</span>
          </button>
        ))}
      </section>

      {empty ? (
        <Card>
          <h2 className="text-lg font-semibold">Tu día está en blanco</h2>
          <p className="mt-1 text-sm text-muted">Cargá una materia o una tarea. Si querés ver cómo se siente, hay un paquete de ejemplo marcado como tal.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => openQuick(true)}>Crear</Button>
            <Button variant="soft" onClick={() => { const ok = loadExamples(); setToast(ok ? "Ejemplos cargados. Se pueden borrar en Ajustes." : "Los ejemplos ya estaban."); }}>Cargar ejemplos</Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function CheckList({
  title,
  empty,
  rows,
}: {
  title: string;
  empty: string;
  rows: { id: string; title: string; meta: string; done: boolean; onOpen: () => void; onDone: () => void }[];
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
      {rows.length === 0 ? <p className="text-sm text-muted">{empty}</p> : rows.map((row) => (
        <Card key={row.id} className="flex items-center gap-3">
          <button type="button" aria-label={`Completar ${row.title}`} onClick={row.onDone} className="h-11 w-11 shrink-0 rounded-full border border-primary text-primary">✓</button>
          <button type="button" className="min-w-0 flex-1 text-left" onClick={row.onOpen}>
            <span className="block font-semibold">{row.title}</span>
            <span className="text-sm text-muted">{row.meta}</span>
          </button>
        </Card>
      ))}
    </section>
  );
}
