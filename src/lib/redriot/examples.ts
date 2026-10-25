import { addDaysIso, newId, weekday } from "./dates.ts";
import type { AppData, Swatch } from "./types.ts";

function nextWeekday(today: string, target: number): string {
  const delta = (target - weekday(today) + 7) % 7 || 7;
  return addDaysIso(today, delta);
}

/** Datos claramente marcados como ejemplo. No son la vida real del usuario. */
export function buildExamples(today: string): Pick<
  AppData,
  "subjects" | "slots" | "tasks" | "exams" | "events" | "routines" | "habits" | "inbox" | "notes"
> {
  const math = newId();
  const history = newId();
  const language = newId();
  const sw = (n: Swatch) => n;
  const subjects = [
    { id: math, name: "Matemática", teacher: "Elena Benítez", color: sw("c1"), createdAt: today, example: true },
    { id: history, name: "Historia", teacher: "Mateo Ruiz", color: sw("c2"), createdAt: today, example: true },
    { id: language, name: "Lengua", teacher: "Alicia Duarte", color: sw("c3"), createdAt: today, example: true },
  ];
  const slots = [
    { id: newId(), subjectId: math, weekday: 1, start: "07:15", end: "08:45", room: "Aula 12", example: true },
    { id: newId(), subjectId: history, weekday: 1, start: "09:00", end: "10:20", room: "Aula 4", example: true },
    { id: newId(), subjectId: language, weekday: 3, start: "07:15", end: "08:45", room: "Aula 2", example: true },
    { id: newId(), subjectId: math, weekday: 5, start: "10:30", end: "12:00", room: "Aula 12", example: true },
  ];
  const tasks = [
    {
      id: newId(),
      title: "Trabajo de funciones",
      subjectId: math,
      description: "Ejercicios 4 a 8. Ejemplo para probar REDRIOT.",
      createdAt: today,
      dueDate: addDaysIso(today, 1),
      dueTime: "18:00",
      importance: "alta" as const,
      status: "pendiente" as const,
      estimatedMin: 50,
      subtasks: [
        { id: newId(), title: "Resolver los pares", done: false },
        { id: newId(), title: "Revisar el gráfico", done: false },
      ],
      notes: "",
      reminders: [{ id: newId(), minutesBefore: 1440, enabled: false }],
      attachments: [],
      example: true,
    },
    {
      id: newId(),
      title: "Lectura capítulo 4",
      subjectId: history,
      description: "Ejemplo.",
      createdAt: today,
      dueDate: addDaysIso(today, 3),
      dueTime: "23:00",
      importance: "media" as const,
      status: "pendiente" as const,
      estimatedMin: 40,
      subtasks: [],
      notes: "",
      reminders: [],
      attachments: [],
      example: true,
    },
    {
      id: newId(),
      title: "Ficha de lengua",
      subjectId: language,
      description: "Ejemplo ya cerrado, para ver estadísticas.",
      createdAt: addDaysIso(today, -2),
      dueDate: addDaysIso(today, -1),
      importance: "baja" as const,
      status: "hecha" as const,
      estimatedMin: 20,
      subtasks: [],
      notes: "",
      reminders: [],
      attachments: [],
      completedAt: addDaysIso(today, -1),
      example: true,
    },
  ];
  const exams = [
    {
      id: newId(),
      title: "Examen de Historia",
      subjectId: history,
      date: nextWeekday(today, 4),
      time: "08:00",
      topics: "Revolución e independencia. Ejemplo.",
      notes: "",
      importance: "alta" as const,
      reminders: [{ id: newId(), minutesBefore: 1440, enabled: false }],
      example: true,
    },
  ];
  const events = [
    {
      id: newId(),
      title: "Feria de ciencias",
      date: addDaysIso(today, 6),
      time: "16:00",
      endTime: "18:00",
      description: "Evento de ejemplo.",
      category: "Colegio",
      importance: "media" as const,
      reminders: [{ id: newId(), minutesBefore: 60, enabled: false }],
      example: true,
    },
  ];
  const routines = [
    {
      id: newId(),
      title: "Cierre del día",
      time: "21:00",
      durationMin: 20,
      weekdays: [1, 2, 3, 4, 5],
      steps: [
        { id: newId(), title: "Revisar la mochila" },
        { id: newId(), title: "Dejar lista la tarea" },
      ],
      paused: false,
      reminders: [{ id: newId(), minutesBefore: 0, enabled: false }],
      logs: [],
      example: true,
    },
  ];
  const habits = [
    {
      id: newId(),
      title: "Leer 20 minutos",
      frequency: "diaria" as const,
      target: 1,
      weekdays: [],
      logs: [{ date: addDaysIso(today, -1), status: "hecha" as const }],
      example: true,
    },
    {
      id: newId(),
      title: "Repasar en voz alta",
      frequency: "semanal" as const,
      target: 4,
      weekdays: [],
      logs: [],
      example: true,
    },
  ];
  const inbox = [
    {
      id: newId(),
      title: "Idea: armar una ficha de Historia",
      notes: "Pendiente de ejemplo, sin fecha.",
      category: "Estudio",
      createdAt: today,
      archived: false,
      example: true,
    },
  ];
  const notes = [
    {
      id: newId(),
      title: "Cómo usar los ejemplos",
      content: "Estos registros están marcados como ejemplo. Borrarlos no toca lo que cargues vos.",
      category: "REDRIOT",
      tags: ["ejemplo"],
      links: [{ kind: "materia" as const, id: history }],
      createdAt: today,
      updatedAt: today,
      example: true,
    },
  ];
  return { subjects, slots, tasks, exams, events, routines, habits, inbox, notes };
}
