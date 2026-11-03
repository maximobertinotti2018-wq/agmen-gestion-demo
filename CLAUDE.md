# AGMEN — Sistema de Gestión Integral (prototipo ISSD PPI 2026)

## Estado Actual
- v2.0 (02/11/2026): reescritura completa sobre un modelo de datos único. Cubre RF-01 a RF-21 del documento "DDS – Requerimientos Funcionales".
- Stack: HTML + CSS + JS vanilla (scripts clásicos, sin módulos ES para que funcione con doble clic). Tailwind CDN 3.4.17 y Lucide 0.468.0 con versión fija.
- Usuarios: solo `recepcion` con todos los permisos (sin admin ni entrenador, pedido del usuario el 02/11). El socio NO edita su rutina (solo la consulta en el portal). El estado de cuota se muestra como "Vencido", sin "Moroso".
- Tests: 75 unitarios (`npm test`, node:test) y 14 E2E (`npm run test:e2e`, Playwright 1.56.1 con `channel: 'chrome'`). Todos en verde.
- Preview: config `agmen-demo` en `Desktop/.claude/launch.json` (python http.server en el puerto 5520).

## Cambios Recientes
- Se corrigieron los 10 errores que reportó Facundo el 02/11 (ver la tabla en `docs/MATRIZ-TRAZABILIDAD.md`).
- Se corrigió un bug de render post-login: `UI.vistaActual = null` se seteaba después del login y anulaba los redibujados.
- Nuevos circuitos: solicitudes → cotizaciones → OC aprobada por Recepción → recepción conforme o no conforme → factura → pago.
- Roles: Recepción (panel completo) y Socio (portal, solo lectura).

## Justificación Técnica
- **Los cupos se calculan, no se guardan** (`Logic.ocupacion`): así es imposible que la grilla quede desincronizada de los socios.
- **El vencimiento se deriva de los comprobantes** (`Logic.vencimientoDe`): una sola fuente de verdad para el estado de la cuota.
- **`logic.js` es puro** (recibe `state` y `hoy`): se testea en Node sin DOM.
- **`Store.tx`** es atómico: si una regla falla, revierte el estado. Los errores de negocio usan `ReglaError` y se muestran en el formulario.
- **Los datos de ejemplo son relativos a hoy**: la demo nunca "envejece".

## Próximos Pasos
- Confirmar con el equipo dos supuestos: "Running no tiene cupos" se tomó como sin límite, y "gimnasio todos los días" como lunes a viernes.
- Opcional: modo offline (descargar Tailwind y los íconos localmente) para presentar sin internet.
- Para producción: backend con autenticación real y base de datos (Supabase) en lugar de `localStorage`.

## Publicación
- Sitio público (GitHub Pages, rama `main`, raíz): https://maximobertinotti2018-wq.github.io/agmen-gestion-demo/ · repo `maximobertinotti2018-wq/agmen-gestion-demo`. Para actualizar la demo: commit + `git push` (Pages se reconstruye solo en 1–2 min).
- Link agregado en Confluence › espacio DDS › PP1 › Prototipo (02/11/2026).
