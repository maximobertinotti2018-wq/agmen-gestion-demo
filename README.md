# AGMEN — Sistema de Gestión Integral

**Instituto Superior Santo Domingo (ISSD) · Práctica Profesional I · 2026**
Empresa relevada: **AGMEN** (Nueva Córdoba y Running en Parque Sarmiento) · `@agmen.cba`
Integrantes: Máximo Bertinotti · Manuel García Badillo · Facundo Sanucci Picco · Docente: Roger Damián Martínez

Prototipo funcional en **HTML, CSS y JavaScript** (sin frameworks ni backend) que cubre los **21 requerimientos funcionales** del documento DDS. La trazabilidad completa está en [`docs/MATRIZ-TRAZABILIDAD.md`](docs/MATRIZ-TRAZABILIDAD.md) y también dentro del sistema, en el módulo **Requerimientos**.

## Cómo abrirlo

Hacé doble clic en `index.html` o, mejor, levantá un servidor local:

```bash
python -m http.server 5520
```

y abrí `http://localhost:5520`. Hace falta internet para cargar Tailwind, los íconos y las fuentes.

## Usuarios de demostración

| Usuario | Contraseña | Qué ve |
|---|---|---|
| `recepcion` | `recepcion` | Todos los módulos del panel (es el único usuario del personal) |
| Socio `34321248` | — | Portal del socio (al día) |
| Socio `40112984` | — | Portal del socio (vencido) |

No hay usuario de administración ni de entrenadores: fichas, rutinas y seguimiento se cargan desde Recepción, indicando qué entrenador los hizo. El socio **solo consulta** su rutina en el portal.

El botón **Restablecer datos de la demo**, en la pantalla de ingreso, vuelve todo a los datos de ejemplo. Las fechas de ejemplo se calculan a partir de "hoy", así que siempre hay casos al día, próximos a vencer y vencidos.

## Módulos

| Módulo | Requerimientos |
|---|---|
| Recepción: buscar por DNI o apellido, validar membresía, registrar ingreso y salida | RF-13, RF-15, RF-16 |
| Socios e interesados: padrón, estados, días de prueba, grupos familiares | RF-01, RF-02, RF-04 |
| Turnos: grilla, turnos por socio, reprogramaciones, profesionales | RF-07, RF-08, RF-09 |
| Entrenamiento: ficha técnica y clínica, rutinas, seguimiento | RF-03, RF-14, RF-15 |
| Caja y cuotas: cobros, movimientos, comprobantes PDF, vencimientos, planes, descuentos | RF-05, RF-06, RF-10, RF-11, RF-12 |
| Stock y compras: inventario, solicitudes, cotizaciones, OC, recepción, facturas | RF-17 a RF-20 |
| Reportes: ocupación, morosidad, asistencia y retención | RF-21 |
| Portal del socio: membresía, turnos, rutina (solo lectura), asistencias, pagos, tienda | RF-11, RF-13, RF-15 |

## Reglas de negocio principales

- **Grilla:** gimnasio de lunes a viernes de 08 a 12 y de 14 a 21 hs, en bloques de 1 hora con **máximo 5 alumnos**. Running lunes y miércoles de 19:30 a 21 hs, **sin límite de cupo**.
- **Cupos:** nunca se guardan como número; se calculan a partir de los socios asignados, más los recuperos y las ausencias avisadas.
- **Cuotas:** *Al día* · *Próximo a vencer* (5 días antes) · *Vencido* (cuotas adeudadas = ⌊días de atraso / 30⌋ + 1) · *Primera cuota pendiente*, para un socio nuevo, que debe **una sola** cuota.
- **Descuentos automáticos:** grupo familiar con 2 o más socios activos, y combinación gimnasio + running. Los descuentos manuales se eligen al cobrar.
- **Comprobantes:** solo se emiten para cobros *Aprobados*, con numeración correlativa `0001-00000001`. Los cobros *Pendientes* se aprueban o rechazan después.

## Estructura

```
index.html              estructura de las pantallas
css/styles.css          componentes visuales
js/logic.js             reglas de negocio puras (testeables)
js/data.js              datos de demostración
js/store.js             operaciones con validación y guardado atómico
js/ui.js                utilidades de interfaz (tablas, formularios, modal, comprobante)
js/views/*.js           un archivo por módulo
js/app.js               arranque y login
tests/unit/             75 tests de reglas de negocio (Node)
tests/e2e/              14 tests de punta a punta (Playwright + Chrome)
_respaldo/              versión anterior, por si hay que comparar
```

## Tests

```bash
npm test             # unitarios, no requiere instalar nada
npm install          # solo la primera vez, para los E2E
npm run test:e2e     # usa el Google Chrome instalado
```

## Limitaciones de la demo

Es un prototipo: los datos viven en el navegador (`localStorage`) y las contraseñas están en el código. Para usarlo en producción habría que agregar un backend con base de datos y autenticación real.
