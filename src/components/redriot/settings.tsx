import { useEffect, useState } from "react";
import { normalize } from "@/lib/redriot/types";
import { askNotificationPermission, notificationSupport, showSystemNotification } from "@/lib/redriot/notify";
import { useRiot } from "@/lib/redriot/store";
import { Button, Card, Field, controlClass } from "./ui";

export function SettingsScreen() {
  const data = useRiot((s) => s.data);
  const setTheme = useRiot((s) => s.setTheme);
  const setDisplayName = useRiot((s) => s.setDisplayName);
  const loadExamples = useRiot((s) => s.loadExamples);
  const clearExamples = useRiot((s) => s.clearExamples);
  const clearAll = useRiot((s) => s.clearAll);
  const importData = useRiot((s) => s.importData);
  const setToast = useRiot((s) => s.setToast);
  const [support, setSupport] = useState<ReturnType<typeof notificationSupport> | null>(null);
  const [perm, setPerm] = useState<string>("");
  const [wipe, setWipe] = useState(false);
  const [name, setName] = useState(data.preferences.displayName);

  useEffect(() => {
    const next = notificationSupport();
    setSupport(next);
    setPerm(next.permission);
  }, []);

  const activate = async () => {
    if (support?.ios && !support.standalone) return;
    const result = await askNotificationPermission();
    setPerm(result);
  };

  const test = async () => {
    const ok = await showSystemNotification("REDRIOT", "Aviso de prueba en este dispositivo.");
    setToast(ok ? "Listo. Si no lo ves, revisá el permiso." : "El sistema no mostró el aviso.");
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "redriot.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p className="font-semibold">Apariencia</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant={data.preferences.theme === "claro" ? "primary" : "soft"} onClick={() => setTheme("claro")}>Claro</Button>
          <Button variant={data.preferences.theme === "oscuro" ? "primary" : "soft"} onClick={() => setTheme("oscuro")}>Oscuro</Button>
        </div>
        <p className="mt-2 text-xs text-muted">Se guarda en este dispositivo y vuelve al abrir REDRIOT.</p>
      </Card>
      <Card>
        <form className="flex flex-col gap-2" onSubmit={(event) => { event.preventDefault(); setDisplayName(name); setToast("Nombre guardado."); }}>
          <Field label="Cómo te saludo">
            <input className={controlClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" />
          </Field>
          <Button type="submit">Guardar</Button>
        </form>
      </Card>
      <Card className="flex flex-col gap-2">
        <p className="font-semibold">Notificaciones</p>
        <p className="text-sm text-muted">
          {support?.standalone ? "REDRIOT está abierta como app, fuera del navegador." : "La estás usando en el navegador. En un iPhone con iOS 16.4 o posterior, el push web solo existe si la agregás al inicio."}
        </p>
        <p className="text-sm text-muted">Permiso: {perm || "sin consultar"}.</p>
        {support?.ios && !support.standalone ? (
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
            <li>Abrí REDRIOT en Safari, no dentro de otra app.</li>
            <li>Tocá Compartir.</li>
            <li>Elegí Agregar a inicio.</li>
            <li>Abrila desde el ícono y recién ahí tocá Activar notificaciones.</li>
          </ol>
        ) : (
          <Button onClick={() => void activate()}>Activar notificaciones</Button>
        )}
        {perm === "denied" ? <p className="text-sm text-muted">El permiso está rechazado. En el iPhone: Ajustes, Notificaciones, REDRIOT. No voy a insistir con el cartel del sistema.</p> : null}
        {perm === "granted" ? <Button variant="soft" onClick={() => void test()}>Enviar aviso de prueba</Button> : null}
        <p className="text-xs text-muted">No hay un servidor de push configurado. Los avisos programados se revisan mientras la app está abierta. Una alarma nativa, que suena con la pantalla bloqueada sin red y sin la app, no es algo que una PWA pueda prometer.</p>
      </Card>
      <Card className="flex flex-col gap-2">
        <p className="font-semibold">Instalar en el iPhone</p>
        <p className="text-sm text-muted">Safari, Compartir, Agregar a inicio. El nombre bajo el ícono es el de la app publicada. Abrila desde ahí para usarla sin la barra del navegador.</p>
      </Card>
      <Card className="flex flex-col gap-2">
        <p className="font-semibold">Tus datos</p>
        <p className="text-sm text-muted">Viven en este dispositivo, en IndexedDB, y también hay una copia de respaldo local. No hay cuenta ni nube. Sin conexión podés consultar y editar todo.</p>
        <Button variant="soft" onClick={exportData}>Exportar copia</Button>
        <label className="text-sm font-semibold text-primary">
          Importar copia
          <input
            type="file"
            accept="application/json"
            className="mt-2 block text-sm font-normal text-fg"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              try {
                importData(normalize(JSON.parse(await file.text())));
                setToast("Copia restaurada en este dispositivo.");
              } catch {
                setToast("Ese archivo no se pudo leer.");
              }
            }}
          />
        </label>
        <Button variant="soft" onClick={() => setToast(loadExamples() ? "Ejemplos cargados." : "Los ejemplos ya estaban.")}>Cargar ejemplos</Button>
        <Button variant="ghost" onClick={() => { clearExamples(); setToast("Ejemplos borrados. Lo tuyo sigue."); }}>Borrar solo ejemplos</Button>
        {wipe ? (
          <Button variant="danger" onClick={() => { clearAll(); setWipe(false); }}>Confirmar borrado total</Button>
        ) : (
          <Button variant="danger" onClick={() => setWipe(true)}>Borrar todo en este dispositivo</Button>
        )}
      </Card>
      <Card className="flex flex-col gap-2 text-sm text-muted">
        <p className="font-semibold text-fg">Qué no hace REDRIOT</p>
        <p>No envía push con la app cerrada: falta un servidor con claves privadas, y esas claves no van en el código.</p>
        <p>No sincroniza entre dispositivos. La copia exportada sirve para pasar los datos a mano.</p>
        <p>Una actualización publicada se ve al volver a abrir la app. Si el iPhone conserva la versión vieja, cerrala desde el selector de apps y entrá de nuevo.</p>
      </Card>
    </div>
  );
}
