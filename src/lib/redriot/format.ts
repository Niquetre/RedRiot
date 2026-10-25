import { format } from "date-fns";
import { es } from "date-fns/locale";
import { parseISODate, WEEKDAY_SHORT } from "./dates.ts";

export function longDate(iso: string): string {
  const text = format(parseISODate(iso), "EEEE d 'de' MMMM", { locale: es });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function shortDate(iso: string): string {
  return format(parseISODate(iso), "d MMM", { locale: es });
}

export function weekdayChip(index: number): string {
  return WEEKDAY_SHORT[index] ?? "";
}

export function greeting(date: Date, name: string): string {
  const hour = date.getHours();
  const hello = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  return name.trim() ? `${hello}, ${name.trim()}` : hello;
}

export function minutesLabel(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export function clock(seconds: number): string {
  const safe = Math.max(0, seconds);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
