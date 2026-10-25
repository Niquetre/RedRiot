# REDRIOT

Asistente personal para el colegio, las tareas, el calendario, las rutinas, los hábitos y el estudio. Está pensado para usarse en el iPhone, instalado desde Safari en la pantalla de inicio.

## Tecnologías

- React y TanStack Start.
- Datos en el dispositivo con IndexedDB (y una copia local de respaldo).
- Manifiesto PWA de la publicación, en modo `standalone`.
- Notificaciones del navegador, solo después de un toque en «Activar notificaciones».

No hay cuenta obligatoria ni base en la nube. Así se puede usar desde el primer día, sin secretos en el repositorio y sin perder cambios si no hay red.

## Cómo se usa

1. Abrí la app publicada (HTTPS).
2. En el iPhone, en Safari: Compartir → Agregar a inicio.
3. Entrá desde el ícono. Recién ahí iOS permite avisos web (iOS 16.4 o posterior).
4. En Ajustes, tocá Activar notificaciones y, si querés, enviá un aviso de prueba.
5. Cargá materias, horario, tareas y el resto. El botón + crea algo rápido.
6. El modo claro u oscuro queda guardado en el teléfono.

Los registros de ejemplo se marcan como «Ejemplo» y se borran aparte, sin tocar lo que cargaste vos.

## Datos

Todo se guarda en este dispositivo. Exportá o importá un JSON desde Ajustes si querés una copia. No hay sincronización entre teléfonos.

## Avisos

- Con la app abierta, REDRIOT revisa recordatorios y puede mostrar una notificación local si diste permiso.
- Con la app cerrada, un push real necesita un servidor con claves VAPID privadas. Esas claves no están en el código y el envío no se simula.
- No es una alarma nativa de iOS. El modo de ahorro y el permiso pueden impedir que llegue.

## Actualizar

Al publicar una versión nueva, cerrá REDRIOT desde el selector de apps y volvé a abrirla. No hace falta borrarla del inicio.

## Límites

GitHub Pages no envía push ni guarda una base compartida. La publicación de esta app es el sitio HTTPS donde queda instalable. No subas secretos al repositorio.
