import { useMemo, useState } from "react";
import { addDaysIso, isoDate, mondayOf, weekday } from "@/lib/redriot/dates";
import { WEEKDAY_SHORT } from "@/lib/redriot/dates";
import { shortDate } from "@/lib/redriot/format";
import { conflictsOn, entriesOn, findDuplicateEvent } from "@/lib/redriot/logic";
import { useRiot } from "@/lib/redriot/store";
import type { CalMode, Importance, Recurrence } from "@/lib/redriot/types";
import { ImportanceField, ReminderField, WeekdayField } from "./fields";
import { Button, Card, Field, Segmented, Sheet, controlClass } from "./ui";

export function CalendarScreen({ mode, cursor }: { mode: CalMode; cursor: string }) {
  const setCalendar = useRiot((s) => s.setCalendar);
  const data = useRiot((s) => s.data);
  const push = useRiot((s) => s.push);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const days = useMemo(() => {
    if (mode === "dia") return [cursor];
    if (mode === "semana") {
      const start = mondayOf(cursor);
      return Array.from({ length: 7 }, (_, i) => addDaysIso(start, i));
    }
    const first = `${cursor.slice(0, 7)}-01`;
    const start = addDaysIso(first, -((weekday(first) + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => addDaysIso(start, i));
  }, [mode, cursor]);

  const rawMonth = new Date(Number(cursor.slice(0, 4)), Number(cursor.slice(5, 7)) - 1, 1).toLocaleDateString("es", {
    month: "long",
    year: "numeric",
  });
  const monthLabel = rawMonth.charAt(0).toUpperCase() + rawMonth.slice(1);

  const shift = (dir: number) => {
    if (mode === "mes") {
      const d = new Date(Number(cursor.slice(0, 4)), Number(cursor.slice(5, 7)) - 1 + dir, 1);
      setCalendar({ cursor: isoDate(d) });
    } else if (mode === "semana") setCalendar({ cursor: addDaysIso(cursor, dir * 7) });
    else setCalendar({ cursor: addDaysIso(cursor, dir) });
  };

  const searchHits = query.trim()
    ? data.events.filter((event) => !event.cancelled && !event.isException && `${event.title} ${event.category} ${event.description}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    : [];

  return (
    <div className="flex flex-col gap-4">
      <Segmented
        value={mode}
        onChange={(next) => setCalendar({ mode: next })}
        options={[{ id: "mes", label: "Mes" }, { id: "semana", label: "Semana" }, { id: "dia", label: "Día" }]}
      />
      <div className="flex items-center justify-between gap-2">
        <Button variant="soft" onClick={() => shift(-1)}>Anterior</Button>
        <p className="text-sm font-semibold">{mode === "dia" ? shortDate(cursor) : monthLabel}</p>
        <Button variant="soft" onClick={() => shift(1)}>Siguiente</Button>
      </div>
      <Button variant="ghost" onClick={() => setCalendar({ cursor: isoDate(), mode: "dia" })}>Ir a hoy</Button>
      <Field label="Buscar eventos">
        <input className={controlClass} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nombre o categoría" />
      </Field>
      {query.trim() ? (
        <div className="flex flex-col gap-2">
          {searchHits.length === 0 ? <p className="text-sm text-muted">Ningún evento coincide.</p> : searchHits.map((event) => (
            <button key={event.id} type="button" className="card p-4 text-left" onClick={() => push({ id: "detalle", kind: "evento", entityId: event.id, date: event.date })}>
              <span className="font-semibold">{event.title}</span>
              <span className="mt-1 block text-sm text-muted">{shortDate(event.date)} · {event.category}</span>
            </button>
          ))}
        </div>
      ) : null}
      {mode === "mes" ? (
        <div className="grid grid-cols-7 gap-1">
          {["L", "M", "X", "J", "V", "S", "D"].map((label) => (
            <p key={label} className="text-center text-xs font-semibold text-muted">{label}</p>
          ))}
          {days.map((date) => {
            const count = entriesOn(data, date).length;
            const inMonth = date.slice(5, 7) === cursor.slice(5, 7);
            const selected = date === cursor;
            return (
              <button
                key={date}
                type="button"
                onClick={() => setCalendar({ cursor: date, mode: "dia" })}
                className={`flex h-12 flex-col items-center justify-center rounded-2xl text-sm ${selected ? "bg-primary text-primary-fg" : inMonth ? "bg-surface text-fg" : "text-muted"}`}
              >
                <span className="tabular-nums">{Number(date.slice(8))}</span>
                {count > 0 ? <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${selected ? "bg-primary-fg" : "bg-primary"}`} /> : null}
              </button>
            );
          })}
        </div>
      ) : (
        days.map((date) => <DayAgenda key={date} date={date} />)
      )}
      <Button onClick={() => setOpen(true)}>Nuevo evento</Button>
      <EventForm open={open} date={cursor} onClose={() => setOpen(false)} />
    </div>
  );
}

function DayAgenda({ date }: { date: string }) {
  const data = useRiot((s) => s.data);
  const push = useRiot((s) => s.push);
  const items = entriesOn(data, date);
  const conflicts = conflictsOn(data, date);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold">{WEEKDAY_SHORT[weekday(date)]} {shortDate(date)}</p>
      {conflicts.length ? <p className="text-sm text-primary">{conflicts[0].a} se superpone con {conflicts[0].b}.</p> : null}
      {items.length === 0 ? <p className="text-sm text-muted">Nada este día.</p> : items.map((item) => (
        <button key={item.key} type="button" onClick={() => push({ id: "detalle", kind: item.detail, entityId: item.id, date })} className="card p-3 text-left">
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">{item.kind}</span>
          <span className="mt-1 block font-semibold">{item.title}</span>
          <span className="text-sm text-muted">{item.start ? `${item.start}${item.end ? `–${item.end}` : ""} · ` : ""}{item.meta}</span>
        </button>
      ))}
    </div>
  );
}

export function EventForm({ open, date, onClose }: { open: boolean; date: string; onClose: () => void }) {
  const addEvent = useRiot((s) => s.addEvent);
  const data = useRiot((s) => s.data);
  const setToast = useRiot((s) => s.setToast);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState(date);
  const [time, setTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Personal");
  const [importance, setImportance] = useState<Importance>("media");
  const [freq, setFreq] = useState<"" | "daily" | "weekly" | "monthly">("");
  const [until, setUntil] = useState("");
  const [days, setDays] = useState<number[]>([weekday(date)]);
  const [reminders, setReminders] = useState<{ id: string; minutesBefore: number; enabled: boolean }[]>([]);
  const [more, setMore] = useState(false);
  const [dup, setDup] = useState(false);

  const save = (force = false) => {
    if (!title.trim() || !when) return;
    if (!force && findDuplicateEvent(data, title, when)) {
      setDup(true);
      return;
    }
    const recurrence: Recurrence | undefined = freq
      ? { freq, interval: 1, until: until || undefined, weekdays: freq === "weekly" ? days : undefined }
      : undefined;
    addEvent({
      title,
      date: when,
      time: time || undefined,
      endTime: endTime || undefined,
      description,
      category,
      importance,
      reminders,
      recurrence,
    });
    setTitle("");
    setDup(false);
    setToast("Evento guardado.");
    onClose();
  };

  return (
    <Sheet open={open} title="Nuevo evento" onClose={onClose}>
      <form className="flex flex-col gap-3" onSubmit={(event) => { event.preventDefault(); save(false); }}>
        <Field label="Nombre"><input className={controlClass} value={title} onChange={(e) => setTitle(e.target.value)} required /></Field>
        <Field label="Fecha"><input type="date" className={controlClass} value={when} onChange={(e) => setWhen(e.target.value)} required /></Field>
        <Field label="Hora"><input type="time" className={controlClass} value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        <button type="button" className="text-left text-sm font-semibold text-primary" onClick={() => setMore((v) => !v)}>Más opciones</button>
        {more ? (
          <>
            <Field label="Hasta"><input type="time" className={controlClass} value={endTime} onChange={(e) => setEndTime(e.target.value)} /></Field>
            <Field label="Descripción"><textarea className={`${controlClass} h-20 py-2`} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
            <Field label="Categoría">
              <select className={controlClass} value={category} onChange={(e) => setCategory(e.target.value)}>
                {["Personal", "Colegio", "Recordatorio", "Estudio", "Otro"].map((item) => <option key={item}>{item}</option>)}
              </select>
            </Field>
            <ImportanceField value={importance} onChange={setImportance} />
            <Field label="Repetición">
              <select className={controlClass} value={freq} onChange={(e) => setFreq(e.target.value as typeof freq)}>
                <option value="">No se repite</option>
                <option value="daily">Cada día</option>
                <option value="weekly">Cada semana</option>
                <option value="monthly">Cada mes</option>
              </select>
            </Field>
            {freq === "weekly" ? <WeekdayField value={days} onChange={setDays} /> : null}
            {freq ? <Field label="Repetir hasta"><input type="date" className={controlClass} value={until} onChange={(e) => setUntil(e.target.value)} /></Field> : null}
            <ReminderField value={reminders} onChange={setReminders} />
          </>
        ) : null}
        {dup ? (
          <Card>
            <p className="text-sm">Ya hay un evento con el mismo nombre y fecha.</p>
            <Button className="mt-3" onClick={() => save(true)}>Crear igual</Button>
          </Card>
        ) : null}
        <Button type="submit">Guardar evento</Button>
        <p className="text-xs text-muted">Las clases, tareas y exámenes aparecen en el calendario sin duplicarse como eventos.</p>
      </form>
    </Sheet>
  );
}
