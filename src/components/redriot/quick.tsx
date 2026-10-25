import { useState } from "react";
import { isoDate } from "@/lib/redriot/dates";
import { findDuplicateEvent, findDuplicateTask } from "@/lib/redriot/logic";
import { useRiot } from "@/lib/redriot/store";
import type { HabitFreq } from "@/lib/redriot/types";
import { SubjectField } from "./fields";
import { Button, Card, Field, Sheet, controlClass } from "./ui";

const KINDS = [
  ["tarea", "Tarea"],
  ["evento", "Evento"],
  ["recordatorio", "Recordatorio"],
  ["examen", "Examen"],
  ["habito", "Hábito"],
  ["rutina", "Rutina"],
  ["nota", "Nota"],
] as const;

type Kind = (typeof KINDS)[number][0];

export function QuickSheet() {
  const open = useRiot((s) => s.quickOpen);
  const openQuick = useRiot((s) => s.openQuick);
  const data = useRiot((s) => s.data);
  const addTask = useRiot((s) => s.addTask);
  const addEvent = useRiot((s) => s.addEvent);
  const addExam = useRiot((s) => s.addExam);
  const addHabit = useRiot((s) => s.addHabit);
  const addRoutine = useRiot((s) => s.addRoutine);
  const addNote = useRiot((s) => s.addNote);
  const push = useRiot((s) => s.push);
  const setToast = useRiot((s) => s.setToast);
  const [kind, setKind] = useState<Kind | null>(null);
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState<string | undefined>();
  const [date, setDate] = useState(isoDate());
  const [time, setTime] = useState("");
  const [dup, setDup] = useState(false);

  const reset = () => {
    setKind(null);
    setTitle("");
    setSubjectId(undefined);
    setDate(isoDate());
    setTime("");
    setDup(false);
  };

  const close = () => {
    openQuick(false);
    reset();
  };

  const save = (force = false) => {
    if (!kind || !title.trim()) return;
    if (kind === "tarea") {
      if (!force && findDuplicateTask(data, title, date)) {
        setDup(true);
        return;
      }
      const id = addTask({
        title,
        subjectId,
        description: "",
        dueDate: date,
        dueTime: time || undefined,
        importance: "media",
        status: "pendiente",
        estimatedMin: 30,
        notes: "",
        reminders: [],
      });
      push({ id: "detalle", kind: "tarea", entityId: id });
    } else if (kind === "evento" || kind === "recordatorio") {
      if (!force && findDuplicateEvent(data, title, date)) {
        setDup(true);
        return;
      }
      const id = addEvent({
        title,
        date,
        time: time || undefined,
        description: "",
        category: kind === "recordatorio" ? "Recordatorio" : "Personal",
        importance: "media",
        reminders: time ? [{ id: crypto.randomUUID(), minutesBefore: 0, enabled: true }] : [],
      });
      push({ id: "detalle", kind: "evento", entityId: id, date });
    } else if (kind === "examen") {
      const id = addExam({ title, subjectId, date, time: time || undefined, topics: "", notes: "", importance: "alta", reminders: [] });
      push({ id: "detalle", kind: "examen", entityId: id });
    } else if (kind === "habito") {
      addHabit({ title, frequency: "diaria" satisfies HabitFreq, target: 1, weekdays: [] });
    } else if (kind === "rutina") {
      addRoutine({ title, time: time || "21:00", durationMin: 20, weekdays: [1, 2, 3, 4, 5], steps: [{ id: crypto.randomUUID(), title: "Primer paso" }], paused: false, reminders: [] });
    } else {
      const id = addNote({ title, content: "", category: "", tags: [], links: subjectId ? [{ kind: "materia", id: subjectId }] : [] });
      push({ id: "detalle", kind: "nota", entityId: id });
    }
    setToast("Guardado.");
    close();
  };

  return (
    <Sheet open={open} title="Crear" onClose={close}>
      {!kind ? (
        <div className="grid grid-cols-2 gap-2">
          {KINDS.map(([id, label]) => (
            <Button key={id} variant="soft" onClick={() => setKind(id)}>{label}</Button>
          ))}
        </div>
      ) : (
        <form className="flex flex-col gap-3" onSubmit={(event) => { event.preventDefault(); save(false); }}>
          <Field label="Título"><input className={controlClass} value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus /></Field>
          {kind === "tarea" || kind === "examen" || kind === "nota" ? <SubjectField subjects={data.subjects} value={subjectId} onChange={setSubjectId} /> : null}
          {kind !== "habito" && kind !== "nota" ? <Field label={kind === "rutina" ? "Hora" : "Fecha"}>{kind === "rutina" ? <input type="time" className={controlClass} value={time} onChange={(e) => setTime(e.target.value)} /> : <input type="date" className={controlClass} value={date} onChange={(e) => setDate(e.target.value)} required />}</Field> : null}
          {kind === "tarea" || kind === "evento" || kind === "recordatorio" || kind === "examen" ? (
            <Field label="Hora (opcional)"><input type="time" className={controlClass} value={time} onChange={(e) => setTime(e.target.value)} /></Field>
          ) : null}
          {dup ? (
            <Card>
              <p className="text-sm">Ya existe uno igual. No lo dupliqué.</p>
              <Button className="mt-3" onClick={() => save(true)}>Crear igual</Button>
            </Card>
          ) : null}
          <Button type="submit">Guardar</Button>
          <Button variant="ghost" onClick={() => setKind(null)}>Elegir otro</Button>
        </form>
      )}
    </Sheet>
  );
}
