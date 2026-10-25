import { useEffect, useState } from "react";
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  GraduationCap,
  Home,
  LayoutGrid,
  Moon,
  Plus,
  Search,
  Sun,
} from "lucide-react";
import { dueNotices } from "@/lib/redriot/logic";
import { showSystemNotification } from "@/lib/redriot/notify";
import { useRiot } from "@/lib/redriot/store";
import type { RootTab, View } from "@/lib/redriot/types";
import { CalendarScreen } from "./calendar";
import { DetailScreen } from "./detail";
import { HomeScreen } from "./home";
import {
  HabitsScreen,
  InboxScreen,
  NotesScreen,
  RoutinesScreen,
  SearchScreen,
  StatsScreen,
  StudyScreen,
  TomorrowScreen,
  WeekScreen,
} from "./modules";
import { QuickSheet } from "./quick";
import { SchoolScreen } from "./school";
import { SettingsScreen } from "./settings";
import { Button, IconButton, Sheet } from "./ui";

const TABS: { id: RootTab; label: string; icon: typeof Home }[] = [
  { id: "inicio", label: "Inicio", icon: Home },
  { id: "colegio", label: "Colegio", icon: GraduationCap },
  { id: "calendario", label: "Calendario", icon: CalendarDays },
  { id: "mas", label: "Más", icon: LayoutGrid },
];

function titleOf(view: View): string {
  switch (view.id) {
    case "inicio": return "REDRIOT";
    case "colegio": return "Colegio";
    case "calendario": return "Calendario";
    case "mas": return "Más";
    case "rutinas": return "Rutinas";
    case "habitos": return "Hábitos";
    case "estudio": return "Estudio";
    case "pendientes": return "Pendientes";
    case "estadisticas": return "Estadísticas";
    case "ajustes": return "Ajustes";
    case "manana": return "Preparar mañana";
    case "semana": return "Semana";
    case "notas": return "Notas";
    case "buscar": return "Buscar";
    case "detalle": return "Detalle";
  }
}

export function RedriotApp() {
  const ready = useRiot((s) => s.ready);
  const hydrate = useRiot((s) => s.hydrate);
  useEffect(() => {
    void hydrate();
  }, [hydrate]);
  if (!ready) {
    return (
      <main className="pad-top flex min-h-dvh items-center justify-center bg-bg text-fg">
        <div className="text-center">
          <p className="text-xs font-semibold tracking-[0.28em] text-primary">REDRIOT</p>
          <h1 className="mt-2 text-3xl font-semibold">Tu día, en orden</h1>
        </div>
      </main>
    );
  }
  return <Shell />;
}

function Shell() {
  const stack = useRiot((s) => s.stack);
  const data = useRiot((s) => s.data);
  const goRoot = useRiot((s) => s.goRoot);
  const back = useRiot((s) => s.back);
  const push = useRiot((s) => s.push);
  const openQuick = useRiot((s) => s.openQuick);
  const setTheme = useRiot((s) => s.setTheme);
  const banner = useRiot((s) => s.banner);
  const dismissBanner = useRiot((s) => s.dismissBanner);
  const toast = useRiot((s) => s.toast);
  const setToast = useRiot((s) => s.setToast);
  const logFire = useRiot((s) => s.logFire);
  const showBanner = useRiot((s) => s.showBanner);
  const [bell, setBell] = useState(false);
  const [offline, setOffline] = useState(false);
  const view = stack[stack.length - 1] ?? { id: "inicio" as const };
  const root = stack[0]?.id;
  const tab: RootTab = root === "colegio" || root === "calendario" || root === "mas" ? root : "inicio";

  useEffect(() => {
    const tick = () => {
      const state = useRiot.getState();
      for (const notice of dueNotices(state.data)) {
        state.logFire({
          key: notice.key,
          at: new Date().toISOString(),
          title: notice.title,
          body: notice.body,
          refKind: notice.refKind,
          refId: notice.refId,
        });
        state.showBanner({
          title: notice.late ? "Aviso pendiente" : notice.title,
          body: notice.body,
          refKind: notice.refId ? notice.refKind : undefined,
          refId: notice.refId || undefined,
        });
        if (!notice.late) {
          void showSystemNotification(notice.title, notice.body, () => {
            if (notice.refId && notice.refKind) {
              useRiot.getState().push({ id: "detalle", kind: notice.refKind, entityId: notice.refId });
            }
          });
        }
      }
    };
    tick();
    const id = window.setInterval(tick, 20000);
    return () => window.clearInterval(id);
  }, [logFire, showBanner]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(id);
  }, [toast, setToast]);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col">
        <header className="pad-top sticky top-0 z-30 border-b border-line bg-bg/95 px-2">
          <div className="flex h-14 items-center gap-1">
            {stack.length > 1 ? (
              <IconButton label="Volver" onClick={back}><ChevronLeft className="size-6" /></IconButton>
            ) : (
              <span className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-fg">R</span>
            )}
            <h1 className="min-w-0 flex-1 truncate px-1 text-lg font-semibold">{titleOf(view)}</h1>
            <IconButton label="Buscar" onClick={() => push({ id: "buscar" })}><Search className="size-5" /></IconButton>
            <IconButton label="Avisos" onClick={() => setBell(true)}><Bell className="size-5" /></IconButton>
            <IconButton label={data.preferences.theme === "oscuro" ? "Modo claro" : "Modo oscuro"} onClick={() => setTheme(data.preferences.theme === "oscuro" ? "claro" : "oscuro")}>
              {data.preferences.theme === "oscuro" ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </IconButton>
          </div>
        </header>
        {offline ? <p className="px-4 py-2 text-sm text-muted">Sin conexión. Tus datos siguen en este dispositivo.</p> : null}
        {banner ? (
          <div className="mx-4 mt-3 flex items-start justify-between gap-3 rounded-3xl bg-soft px-4 py-3">
            <button type="button" className="text-left" onClick={() => {
              if (banner.refId && banner.refKind) push({ id: "detalle", kind: banner.refKind, entityId: banner.refId });
              dismissBanner();
            }}>
              <span className="block text-sm font-semibold text-primary">{banner.title}</span>
              <span className="text-sm text-fg">{banner.body}</span>
            </button>
            <Button variant="ghost" onClick={dismissBanner}>Cerrar</Button>
          </div>
        ) : null}
        <main className="pad-nav flex-1 px-4 py-4">
          {view.id === "inicio" ? <HomeScreen /> : null}
          {view.id === "colegio" ? <SchoolScreen tab={view.tab} /> : null}
          {view.id === "calendario" ? <CalendarScreen mode={view.mode} cursor={view.cursor} /> : null}
          {view.id === "mas" ? <MoreScreen /> : null}
          {view.id === "rutinas" ? <RoutinesScreen /> : null}
          {view.id === "habitos" ? <HabitsScreen /> : null}
          {view.id === "estudio" ? <StudyScreen /> : null}
          {view.id === "pendientes" ? <InboxScreen /> : null}
          {view.id === "estadisticas" ? <StatsScreen /> : null}
          {view.id === "ajustes" ? <SettingsScreen /> : null}
          {view.id === "manana" ? <TomorrowScreen /> : null}
          {view.id === "semana" ? <WeekScreen /> : null}
          {view.id === "notas" ? <NotesScreen /> : null}
          {view.id === "buscar" ? <SearchScreen /> : null}
          {view.id === "detalle" ? <DetailScreen kind={view.kind} entityId={view.entityId} date={view.date} /> : null}
        </main>
      </div>
      <nav className="nav-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface">
        <div className="mx-auto grid max-w-3xl grid-cols-5 items-end px-1 pt-1">
          {TABS.slice(0, 2).map((item) => (
            <TabButton key={item.id} item={item} active={tab === item.id} onClick={() => goRoot(item.id)} />
          ))}
          <div className="flex justify-center">
            <button type="button" aria-label="Crear actividad" onClick={() => openQuick(true)} className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-fg">
              <Plus className="size-7" />
            </button>
          </div>
          {TABS.slice(2).map((item) => (
            <TabButton key={item.id} item={item} active={tab === item.id} onClick={() => goRoot(item.id)} />
          ))}
        </div>
      </nav>
      <QuickSheet />
      <Sheet open={bell} title="Avisos" onClose={() => setBell(false)}>
        {data.reminderLog.length === 0 ? <p className="text-sm text-muted">Todavía no se disparó ningún aviso. Activá los recordatorios en cada actividad.</p> : null}
        {[...data.reminderLog].reverse().slice(0, 20).map((item) => (
          <button key={item.key} type="button" className="mb-2 block w-full rounded-2xl bg-bg p-3 text-left" onClick={() => {
            if (item.refId && item.refKind) push({ id: "detalle", kind: item.refKind, entityId: item.refId });
            setBell(false);
          }}>
            <span className="block text-sm font-semibold">{item.body}</span>
            <span className="text-xs text-muted">{new Date(item.at).toLocaleString("es")}</span>
          </button>
        ))}
      </Sheet>
      {toast ? <p className="fixed bottom-24 left-1/2 z-50 w-[min(24rem,calc(100%-2rem))] -translate-x-1/2 rounded-full bg-fg px-4 py-3 text-center text-sm font-semibold text-bg">{toast}</p> : null}
    </div>
  );
}

function TabButton({ item, active, onClick }: { item: (typeof TABS)[number]; active: boolean; onClick: () => void }) {
  const Icon = item.icon;
  return (
    <button type="button" onClick={onClick} className={`flex h-14 flex-col items-center justify-center text-xs font-semibold ${active ? "text-primary" : "text-muted"}`}>
      <Icon className="size-5" />
      {item.label}
    </button>
  );
}

function MoreScreen() {
  const push = useRiot((s) => s.push);
  const items: { view: View; label: string; body: string }[] = [
    { view: { id: "rutinas" }, label: "Rutinas", body: "Pasos, horarios y pausa" },
    { view: { id: "habitos" }, label: "Hábitos", body: "Rachas y metas flexibles" },
    { view: { id: "estudio" }, label: "Estudio", body: "Modo concentración" },
    { view: { id: "pendientes" }, label: "Pendientes", body: "Ideas sin fecha" },
    { view: { id: "manana" }, label: "Preparar mañana", body: "Checklist y atrasos" },
    { view: { id: "semana" }, label: "Semana", body: "Propuesta, con tu ok" },
    { view: { id: "notas" }, label: "Notas", body: "Texto y vínculos" },
    { view: { id: "estadisticas" }, label: "Estadísticas", body: "Solo lo que hiciste" },
    { view: { id: "buscar" }, label: "Buscar", body: "Cualquier registro" },
    { view: { id: "ajustes" }, label: "Ajustes", body: "Tema, avisos y copia" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <button key={item.label} type="button" onClick={() => push(item.view)} className="card p-4 text-left">
          <span className="block font-semibold">{item.label}</span>
          <span className="mt-1 block text-sm text-muted">{item.body}</span>
        </button>
      ))}
    </div>
  );
}
