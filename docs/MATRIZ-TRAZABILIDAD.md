# AGMEN — Matriz de trazabilidad y análisis de brechas

Documento fuente: **DDS – Requerimientos Funcionales** (21 RG · 21 RF · 103 RD).
Revisión: 02/11/2026 · Versión del sistema: 2.0 (reescritura sobre la versión del 01/11/2026).

## 1. Clasificación

| Tipo | Qué incluye | Cantidad |
|---|---|---|
| **RF** — Requerimiento funcional | RF-01 a RF-21 del documento | 21 |
| **RD** — Requerimiento detallado | Los ítems "RD" de cada RG | 103 |
| **RNF** — No funcional (inferido) | Persistencia, integridad, permisos, seguridad de UI, compatibilidad | 5 |

## 2. Análisis de brechas (antes → ahora)

"Antes" describe la versión anterior del `index.html` (respaldada en `_respaldo/`). Solo se listan problemas **verificados en el código**.

| RF | Antes | Problema verificado | Ahora | Impacto del gap |
|---|---|---|---|---|
| RF-01 | PARCIAL | Interesados y socios en listas separadas con campos distintos | IMPLEMENTADO | Medio |
| RF-02 | PARCIAL | No validaba la disponibilidad del entrenador ni permitía filtrar por persona, fecha o entrenador | IMPLEMENTADO | Medio |
| RF-03 | PARCIAL | Ficha clínica en un único texto libre | IMPLEMENTADO | Medio |
| RF-04 | PARCIAL | — | IMPLEMENTADO | Bajo |
| RF-05 | PARCIAL | Tarifario solo de lectura, sin alta/modificación/baja | IMPLEMENTADO | Alto |
| RF-06 | PARCIAL | Descuentos fijos en el HTML (10 % / 20 %), sin reglas configurables | IMPLEMENTADO | Alto |
| RF-07 | PARCIAL | Disponibilidad como texto, sin baja | IMPLEMENTADO | Medio |
| RF-08 | **DEFECTUOSO** | Los cupos eran números fijos que no cambiaban; la grilla solo tenía 4 turnos del lunes; running con cupo y en horario equivocado | IMPLEMENTADO | **Crítico** |
| RF-09 | PARCIAL | El recupero no liberaba el cupo de origen; no existía el cambio de turno fijo | IMPLEMENTADO | Alto |
| RF-10 | **DEFECTUOSO** | Estados de cuota inconsistentes (`en_deuda` / `Vencido`); un socio nuevo figuraba con dos cuotas | IMPLEMENTADO | **Crítico** |
| RF-11 | PARCIAL | Número de comprobante aleatorio (`Math.random`); pagos del portal escritos fijos en el HTML | IMPLEMENTADO | Alto |
| RF-12 | **DEFECTUOSO** | Contadores de vencimiento escritos a mano en el HTML | IMPLEMENTADO | Alto |
| RF-13 | **DEFECTUOSO** | El buscador no funcionaba (el input era `checkin-dni-input` y el código leía `input-checkin-dni`); el ingreso no mostraba el nombre (`alumnoNombre` vs `nombre`) | IMPLEMENTADO | **Crítico** |
| RF-14 | PARCIAL | Rutina en texto libre, sin series, repeticiones ni cargas estructuradas | IMPLEMENTADO | Medio |
| RF-15 | PARCIAL | Sin consulta rápida de la rutina desde recepción | IMPLEMENTADO | Medio |
| RF-16 | **DEFECTUOSO** | Campos de asistencia inconsistentes; el historial del portal era el mismo para todos | IMPLEMENTADO | Alto |
| RF-17 | PARCIAL | Sin alta ni modificación de artículos | IMPLEMENTADO | Medio |
| RF-18 | AUSENTE (parcial) | Sin solicitudes de compra ni cotizaciones; la OC se emitía sin aprobación | IMPLEMENTADO | Alto |
| RF-19 | PARCIAL | Sin recepción "no conforme" ni reclamos | IMPLEMENTADO | Alto |
| RF-20 | PARCIAL | Pago global de saldo, sin facturas por OC | IMPLEMENTADO | Medio |
| RF-21 | **DEFECTUOSO** | Los filtros no filtraban (solo redibujaban) | IMPLEMENTADO | Alto |

### Errores reportados por el equipo (Facundo, 02/11/2026)

| Reporte | Causa raíz | Solución | Test que lo certifica |
|---|---|---|---|
| Buscador de alumnos en caja y recepción | El ID del input no coincidía con el que leía el código | Búsqueda en vivo por DNI o apellido (sin tildes) en recepción, caja, padrón, turnos y entrenamiento | `acceso.test.js` · E2E recepción |
| Turnos: running lunes y miércoles 19:30–21; gimnasio todos los días 8–12 y 14–21, bloques de 1 h | La grilla estaba escrita a mano con 4 turnos | Grilla generada: 55 bloques de gimnasio (L a V) + 2 de running | `turnos.test.js` · E2E grilla |
| Sacar "cuota vencida" de arriba con todos los alumnos | La barra listaba nombres | La barra muestra solo contadores; el detalle está en *Caja › Vencimientos* | E2E barra superior |
| Los cupos del gimnasio no cambian | El cupo se guardaba como número fijo | El cupo se calcula siempre a partir de los socios asignados | `turnos.test.js` |
| Running no tiene cupos | Running tenía cupo 5 | Running es un grupo abierto, sin límite | `turnos.test.js` · E2E grilla |
| Un socio nuevo aparece con dos cuotas | La deuda se calculaba con fechas fijas | La deuda corre desde el inicio de la cuenta: un socio nuevo debe exactamente 1 cuota | `personas.test.js` · E2E alta |
| Las asistencias son iguales para todos | Historial escrito fijo en el HTML | Historial real de cada socio | `acceso.test.js` · E2E portal |
| Al registrar la entrada no aparece el nombre | Campo `alumnoNombre` vs `nombre` | El ingreso guarda `personaId` y el nombre se resuelve siempre del padrón | `acceso.test.js` · E2E recepción |
| Al registrar la salida "manda" a ese alumno | Mezcla de vistas y campos | El modal de salida dice a quién corresponde y solo modifica ese ingreso | `acceso.test.js` · E2E recepción |
| La caja está mal | Sin movimientos ni totales reales | *Caja › Movimientos*: cuotas y ventas del día, totales por medio de pago y pendientes | E2E caja |

> **Interpretación a confirmar:** "Running no tiene cupos" se tomó como *sin límite de cupo*. "Gimnasio todos los días" se tomó como *lunes a viernes*. Si alguna de las dos es distinta, se ajusta en `js/data.js` (`crearGrilla`).

## 3. Matriz de trazabilidad (RTM)

| RF | Módulo / ubicación | Lógica | Tests |
|---|---|---|---|
| RF-01 | Socios e interesados › Padrón | `Store.guardarPersona`, `cambiarEstadoPersona` | unit/personas · e2e alta |
| RF-02 | Socios e interesados › Días de prueba | `Store.guardarPrueba`, `cambiarEstadoPrueba` | unit/personas |
| RF-03 | Entrenamiento › Ficha técnica y clínica | `Store.guardarFicha` | unit/entrenamiento |
| RF-04 | Socios e interesados › Grupos familiares | `Store.guardarGrupo`, `quitarDeGrupo` | unit/personas |
| RF-05 | Caja › Planes y actividades | `Store.guardarPlan`, `guardarActividad`, `alternar*` | unit/cuotas |
| RF-06 | Caja › Descuentos | `Logic.descuentosAutomaticos`, `liquidar` | unit/cuotas |
| RF-07 | Turnos › Profesionales | `Store.guardarProfesional`, `parsearDisponibilidad` | unit/turnos |
| RF-08 | Turnos › Grilla y Turnos por socio | `Logic.ocupacion`, `validarTurnosFijos` | unit/turnos · e2e grilla |
| RF-09 | Turnos › Reprogramaciones | `Logic.validarReprogramacion`, `Store.registrarReprogramacion` | unit/turnos |
| RF-10 | Caja › Estado de cuotas / Movimientos | `Store.registrarCobro`, `resolverCobro` | unit/cuotas · e2e recepción |
| RF-11 | Caja › Comprobantes · Legajo · Portal | `Store._emitirComprobante`, `UI.verComprobante` | unit/cuotas · e2e |
| RF-12 | Caja › Vencimientos · Recepción | `Logic.estadoCuenta` | unit/cuotas |
| RF-13 | Recepción | `Logic.buscarPersonas`, `evaluarIngreso`, `Store.registrarIngreso` | unit/acceso · e2e recepción |
| RF-14 | Entrenamiento › Rutina (el portal del socio solo la muestra) | `Store.guardarRutina` | unit/entrenamiento · e2e portal |
| RF-15 | Entrenamiento › En sesión · Recepción › Ver rutina | `Store.agregarSeguimiento` | unit/entrenamiento · e2e entrenador |
| RF-16 | Recepción › En el gimnasio / Registro del día | `Store.registrarSalida` | unit/acceso · e2e recepción |
| RF-17 | Stock › Inventario | `Logic.enAlertaStock`, `Store.guardarItem`, `venderItem` | unit/compras · e2e stock |
| RF-18 | Stock › Solicitudes y cotizaciones | `generarSolicitudesDesdeAlertas`, `registrarCotizacion`, `aprobarCotizacion` | unit/compras · e2e stock |
| RF-19 | Stock › Órdenes y recepción | `Store.registrarRecepcion`, `resolverReclamo` | unit/compras |
| RF-20 | Stock › Proveedores y cuenta corriente | `registrarFactura`, `registrarPagoProveedor`, `Logic.cuentaCorriente` | unit/compras |
| RF-21 | Reportes | `Logic.reporteOcupacion`, `reporteMorosidad`, `reporteAsistencia` | unit/reportes · e2e reportes |

### No funcionales

| RNF | Estado | Detalle |
|---|---|---|
| RNF-01 Persistencia | PARCIAL | `localStorage`. Para producción: backend y base de datos (por ejemplo, Supabase). |
| RNF-02 Integridad | IMPLEMENTADO | `Store.tx` revierte el estado si una operación falla. |
| RNF-03 Permisos por rol | PARCIAL | Solo existe el usuario de Recepción (no hay administración ni entrenadores). El socio entra con su DNI y solo consulta su información. Las credenciales de la demo están en el navegador: **no** es seguridad real. |
| RNF-04 Seguridad de UI | IMPLEMENTADO | `UI.esc` escapa todo texto ingresado (anti-XSS). |
| RNF-05 Compatibilidad | IMPLEMENTADO | Responsive. Necesita internet para Tailwind, íconos y fuentes. |

## 4. Casos de prueba (Dado → Cuando → Entonces)

Los tests unitarios están escritos con ese formato en el nombre de cada caso (`tests/unit/*.test.js`). Resumen por RF:

- **RF-01** · *Dado* un DNI repetido, *cuando* se registra, *entonces* se rechaza. · *Dado* un interesado, *cuando* pasa a socio, *entonces* debe 1 cuota. · *Dada* una baja, *entonces* se liberan sus cupos.
- **RF-02** · Entrenador fuera de horario → rechazo · Fecha pasada → rechazo · Doble agenda → rechazo · No asistió → vuelve a Interesado.
- **RF-04** · Menos de 2 socios / un no activo / un socio que ya está en otro grupo → rechazo · Si el grupo queda con 1 integrante, se disuelve.
- **RF-08** · Turno 5/5 → rechazo · Excede la frecuencia del plan → rechazo · Running nunca se llena · Al asignar, la ocupación sube.
- **RF-09** · Recupero: libera el origen esa fecha y ocupa el destino · Destino lleno → rechazo · Día que no coincide → rechazo.
- **RF-10/11** · Aprobado → comprobante correlativo con todos los datos · Pendiente → sin comprobante hasta aprobarlo · Rechazado → nunca genera comprobante · Moroso → la vigencia continúa desde su vencimiento.
- **RF-12** · Al día / próximo (≤ 5 días) / vencido (cuotas = ⌊atraso/30⌋ + 1) / primera cuota.
- **RF-13/16** · Vencido → bloqueado · El ingreso excepcional exige motivo · No se puede ingresar dos veces · La salida solo modifica ese ingreso.
- **RF-17–20** · Alerta de stock ≤ mínimo · Las solicitudes no se duplican · Solo el personal (Recepción) aprueba la OC · Conforme exige la cantidad exacta · No conforme exige reclamo · Factura solo de una OC conforme · El pago no puede superar el saldo.
- **RF-21** · Los filtros de profesor y actividad filtran de verdad · Presentismo + ausentismo = 100 %.

## 5. Cómo verificar

```bash
npm test            # 75 tests unitarios (Node, sin dependencias)
npm run test:e2e    # 14 tests E2E con Playwright sobre Google Chrome
```
