import { newId } from "@/lib/redriot/dates";
import type { Importance, ReminderSpec, Subject, Swatch, Urgency } from "@/lib/redriot/types";
import { Field, SwatchDot, cn, controlClass } from "./ui";

export const SWATCHES: Swatch[] = ["c1", "c2", "c3", "c4", "c5"];
export const REMINDER_PRESETS = [
  { minutes: 0, label: "A la hora" },
  { minutes: 30, label: "30 min" },
  { minutes: 60, label: "1 hora" },
  { minutes: 1440, label: "1 día" },
];

export function SubjectField({
  subjects,
  value,
  onChange,
  allowEmpty = true,
}: {
  subjects: Subject[];
  value?: string;
  onChange: (id: string | undefined) => void;
  allowEmpty?: boolean;
}) {
  return (
    <Field label="Materia">
      <select className={controlClass} value={value ?? ""} onChange={(e) => onChange(e.target.value || undefined)}>
        {allowEmpty ? <option value="">Sin materia</option> : null}
        {subjects.map((subject) => (
          <option key={subject.id} value={subject.id}>
            {subject.name}
            {subject.teacher ? ` · ${subject.teacher}` : ""}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function ImportanceField({ value, onChange }: { value: Importance; onChange: (value: Importance) => void }) {
  return (
    <Field label="Importancia">
      <div className="grid grid-cols-3 gap-2">
        {(["baja", "media", "alta"] as Importance[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={cn(
              "h-11 rounded-2xl border text-sm font-semibold capitalize",
              value === item ? "border-primary bg-soft text-primary" : "border-line text-muted",
            )}
          >
            {item}
          </button>
        ))}
      </div>
    </Field>
  );
}

export function UrgencyField({ value, onChange }: { value: Urgency | ""; onChange: (value: Urgency | "") => void }) {
  const options: { id: Urgency | ""; label: string }[] = [
    { id: "", label: "Automática" },
    { id: "sin-apuro", label: "Sin apuro" },
    { id: "proxima", label: "Próxima" },
    { id: "hoy", label: "Para hoy" },
    { id: "vencida", label: "Vencida" },
  ];
  return (
    <Field label="Urgencia">
      <select className={controlClass} value={value} onChange={(e) => onChange(e.target.value as Urgency | "")}>
        {options.map((option) => (
          <option key={option.label} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function WeekdayField({ value, onChange }: { value: number[]; onChange: (days: number[]) => void }) {
  const labels = ["D", "L", "M", "X", "J", "V", "S"];
  return (
    <div className="grid grid-cols-7 gap-1">
      {labels.map((label, index) => {
        const on = value.includes(index);
        return (
          <button
            key={label}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((day) => day !== index) : [...value, index].sort())}
            className={cn("h-11 rounded-2xl text-sm font-semibold", on ? "bg-primary text-primary-fg" : "bg-bg text-muted")}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function ColorField({ value, onChange }: { value: Swatch; onChange: (value: Swatch) => void }) {
  return (
    <div className="flex gap-2">
      {SWATCHES.map((swatch) => (
        <button
          key={swatch}
          type="button"
          aria-label={`Color ${swatch}`}
          onClick={() => onChange(swatch)}
          className={cn(
            "inline-flex h-11 w-11 items-center justify-center rounded-full border",
            value === swatch ? "border-fg" : "border-transparent",
          )}
        >
          <SwatchDot id={swatch} />
        </button>
      ))}
    </div>
  );
}

export function ReminderField({ value, onChange }: { value: ReminderSpec[]; onChange: (next: ReminderSpec[]) => void }) {
  return (
    <Field label="Recordatorios">
      <div className="flex flex-wrap gap-2">
        {REMINDER_PRESETS.map((preset) => {
          const current = value.find((item) => item.minutesBefore === preset.minutes);
          const on = !!current?.enabled;
          return (
            <button
              key={preset.minutes}
              type="button"
              aria-pressed={on}
              onClick={() => {
                if (current) {
                  onChange(value.map((item) => (item.minutesBefore === preset.minutes ? { ...item, enabled: !item.enabled } : item)));
                } else {
                  onChange([...value, { id: newId(), minutesBefore: preset.minutes, enabled: true }]);
                }
              }}
              className={cn(
                "h-10 rounded-full px-3 text-sm font-semibold",
                on ? "bg-primary text-primary-fg" : "bg-bg text-muted",
              )}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted">El aviso sale si diste permiso y REDRIOT está abierta. En el iPhone no es una alarma nativa.</p>
    </Field>
  );
}
