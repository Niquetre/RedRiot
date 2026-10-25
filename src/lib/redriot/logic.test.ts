import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isoDate } from "./dates.ts";
import { buildExamples } from "./examples.ts";
import {
  conflictsOn,
  dayProgress,
  effectiveUrgency,
  entriesOn,
  habitScheduledOn,
  habitStreak,
  proposeWeek,
  subjectUsage,
  topThree,
} from "./logic.ts";
import { emptyData, type Habit, type Task } from "./types.ts";

const today = "2026-10-24";

function task(partial: Partial<Task> & Pick<Task, "id" | "title">): Task {
  return {
    description: "",
    createdAt: today,
    importance: "media",
    status: "pendiente",
    estimatedMin: 30,
    subtasks: [],
    notes: "",
    reminders: [],
    attachments: [],
    ...partial,
  };
}

describe("prioridades y urgencia", () => {
  it("marca vencida, hoy y próxima según la fecha", () => {
    const base = task({ id: "1", title: "A" });
    assert.equal(effectiveUrgency({ ...base, dueDate: "2026-10-23" }, today), "vencida");
    assert.equal(effectiveUrgency({ ...base, dueDate: today }, today), "hoy");
    assert.equal(effectiveUrgency({ ...base, dueDate: "2026-10-26" }, today), "proxima");
    assert.equal(effectiveUrgency({ ...base, dueDate: "2026-11-01", urgencyOverride: "sin-apuro" }, today), "sin-apuro");
  });

  it("elige tres tareas y respeta la marca manual", () => {
    const data = emptyData();
    data.tasks = [
      task({ id: "a", title: "Lejana", importance: "baja", dueDate: "2026-12-01" }),
      task({ id: "b", title: "Hoy", importance: "alta", dueDate: today }),
      task({ id: "c", title: "Vence", importance: "media", dueDate: "2026-10-20" }),
      task({ id: "d", title: "Fijada", importance: "baja", pinned: true }),
    ];
    const top = topThree(data, today).map((item) => item.id);
    assert.deepEqual(top[0], "d");
    assert.equal(top.length, 3);
    assert.ok(top.includes("b"));
  });
});

describe("horario, conflictos y hábitos", () => {
  it("no borra la materia al contar usos y no choca clases suspendidas", () => {
    const data = emptyData();
    const examples = buildExamples(today);
    Object.assign(data, examples);
    const subject = data.subjects[0];
    assert.ok(subjectUsage(data, subject.id).slots > 0);
    const monday = "2026-10-26";
    const slot = data.slots.find((item) => item.weekday === 1);
    assert.ok(slot);
    data.overrides.push({ id: "o", slotId: slot.id, date: monday, cancelled: true });
    const classes = entriesOn(data, monday).filter((item) => item.kind === "clase" && item.id === slot.id);
    assert.equal(classes[0]?.muted, true);
    assert.equal(conflictsOn(data, monday).some((c) => c.a === subject.name && c.b === subject.name), false);
  });

  it("un día no programado no corta la racha y no aplica no cuenta como fallo", () => {
    const habit: Habit = {
      id: "h",
      title: "Leer",
      frequency: "personalizada",
      target: 1,
      weekdays: [1, 3],
      logs: [
        { date: "2026-10-19", status: "hecha" },
        { date: "2026-10-21", status: "na" },
      ],
    };
    assert.equal(habitScheduledOn(habit, "2026-10-20"), false);
    assert.equal(habitStreak(habit, "2026-10-22"), 1);
    const data = emptyData();
    data.habits = [habit];
    assert.equal(dayProgress(data, "2026-10-20").total, 0);
  });

  it("la propuesta semanal no pisa una clase", () => {
    const data = emptyData();
    data.subjects.push({ id: "m", name: "Matemática", teacher: "Ana", color: "c1", createdAt: today });
    data.slots.push({ id: "s", subjectId: "m", weekday: 1, start: "08:00", end: "10:00", room: "1" });
    data.tasks.push(task({ id: "t", title: "Entrega", subjectId: "m", dueDate: "2026-10-28", estimatedMin: 40, importance: "alta" }));
    const { blocks } = proposeWeek(data, today, 12 * 60);
    const monday = blocks.find((block) => block.date === "2026-10-26");
    if (monday) {
      assert.ok(monday.end <= "08:00" || monday.start >= "10:00");
    }
    assert.ok(blocks.every((block) => block.date >= today));
  });
});

describe("fechas locales", () => {
  it("no usa UTC para el día", () => {
    const evening = new Date(2026, 9, 24, 23, 30);
    assert.equal(isoDate(evening), "2026-10-24");
  });
});
