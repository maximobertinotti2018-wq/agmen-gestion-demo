/**
 * Vista REQUERIMIENTOS — Matriz de trazabilidad (RTM) del documento "DDS – Requerimientos Funcionales".
 * Cada RF indica dónde está implementado y qué test automatizado lo certifica.
 */
(function () {
  'use strict';

  const RF = [
    { id: 'RF-01', rg: 'RG 1', titulo: 'Registro de interesados y alta de socios', vista: ['personas', 'padron'], test: 'unit/personas · e2e/personas',
      rd: ['Registrar datos personales y de contacto', 'Modificar datos de interesados y socios', 'Consultar datos personales', 'Modificar estado (Interesado, En Día de Prueba, Socio Activo, Socio Inactivo/Baja)'] },
    { id: 'RF-02', rg: 'RG 2', titulo: 'Agendamiento de días de prueba', vista: ['personas', 'pruebas'], test: 'unit/personas · e2e/personas',
      rd: ['Registrar fecha y horario', 'Registrar entrenador responsable', 'Modificar fecha, horario y entrenador', 'Consultar por persona, fecha y entrenador'] },
    { id: 'RF-03', rg: 'RG 3', titulo: 'Valoración funcional e historia motriz', vista: ['entrenamiento', 'ficha'], test: 'unit/entrenamiento · e2e/entrenamiento',
      rd: ['Registrar valoración funcional del movimiento', 'Registrar lesiones, limitaciones, cirugías, patologías y experiencia', 'Registrar objetivos personales', 'Modificar fichas técnicas y clínicas', 'Consultar valoraciones e historia motriz'] },
    { id: 'RF-04', rg: 'RG 4', titulo: 'Vinculación de grupos familiares', vista: ['personas', 'grupos'], test: 'unit/personas · e2e/personas',
      rd: ['Vincular 2 o más socios activos bajo un identificador', 'Modificar la vinculación', 'Consultar integrantes', 'Eliminar la vinculación de un socio'] },
    { id: 'RF-05', rg: 'RG 5', titulo: 'Actividades y planes de entrenamiento', vista: ['caja', 'planes'], test: 'unit/caja',
      rd: ['Registrar disciplinas y actividades', 'Modificar actividades', 'Dar de baja actividades', 'Registrar planes por frecuencia y combinación', 'Modificar planes y valores vigentes', 'Consultar actividades, planes y valores'] },
    { id: 'RF-06', rg: 'RG 6', titulo: 'Descuentos y promociones', vista: ['caja', 'descuentos'], test: 'unit/cuotas',
      rd: ['Reglas por porcentaje o monto fijo', 'Promociones por grupo familiar y combinación de actividades', 'Modificar condiciones y valores', 'Eliminar reglas no vigentes', 'Consultar descuentos configurados'] },
    { id: 'RF-07', rg: 'RG 7', titulo: 'Profesionales y disponibilidad horaria', vista: ['turnos', 'profesionales'], test: 'unit/turnos',
      rd: ['Registrar datos de entrenadores y coordinadores', 'Registrar especialidades', 'Registrar días y franjas horarias', 'Modificar datos, especialidades y disponibilidad', 'Consultar profesionales y horarios', 'Dar de baja profesionales'] },
    { id: 'RF-08', rg: 'RG 8', titulo: 'Grilla de turnos fijos y control de cupos', vista: ['turnos', 'grilla'], test: 'unit/turnos · e2e/turnos',
      rd: ['Registrar grilla semanal (días, horarios, profesor)', 'Asignar días y horarios fijos a cada socio', 'Consultar turnos de cada socio', 'Consultar cupos por día, horario y profesor', 'Registrar cupos según asignaciones'] },
    { id: 'RF-09', rg: 'RG 9', titulo: 'Reprogramación y recupero de turnos', vista: ['turnos', 'reprogramaciones'], test: 'unit/turnos · e2e/turnos',
      rd: ['Registrar recupero puntual de clases', 'Modificar turnos fijos según disponibilidad', 'Consultar cupos para reprogramar', 'Consultar reprogramaciones y recuperos', 'Liberar cupos al reprogramar'] },
    { id: 'RF-10', rg: 'RG 10', titulo: 'Liquidación y cobro de cuotas', vista: ['caja', 'cuotas'], test: 'unit/cuotas · e2e/caja',
      rd: ['Registrar el cobro de la cuota', 'Registrar plan, descuentos y medio de pago', 'Consultar cobros y su estado', 'Registrar estado de la transacción (Aprobado, Rechazado, Pendiente)'] },
    { id: 'RF-11', rg: 'RG 11', titulo: 'Comprobantes digitales de pago (PDF)', vista: ['caja', 'comprobantes'], test: 'unit/cuotas · e2e/caja',
      rd: ['Generar comprobante numerado en PDF para cobros aprobados', 'Almacenarlo en el repositorio del socio', 'Consultar comprobantes por socio', 'Emitir con socio, plan, descuentos, medio y vigencia'] },
    { id: 'RF-12', rg: 'RG 12', titulo: 'Vigencia y alertas de vencimiento', vista: ['caja', 'vencimientos'], test: 'unit/cuotas',
      rd: ['Consultar fechas de vencimiento', 'Estado de cuenta según vigencia', 'Alertas de próximos a vencer (5 días)', 'Alertas de vencidos y morosos'] },
    { id: 'RF-13', rg: 'RG 13', titulo: 'Control de acceso en recepción', vista: ['recepcion'], test: 'unit/acceso · e2e/recepcion',
      rd: ['Buscar socio por DNI o apellido', 'Consultar vigencia de la membresía', 'Consultar turnos asignados', 'Registrar el ingreso'] },
    { id: 'RF-14', rg: 'RG 14', titulo: 'Rutinas personalizadas', vista: ['entrenamiento', 'rutina'], test: 'unit/entrenamiento · e2e/entrenamiento',
      rd: ['Registrar rutinas por socio', 'Sesiones, ejercicios, series, repeticiones, cargas y pausas', 'Modificar rutinas', 'Consultar rutinas', 'Vincular con la valoración funcional'] },
    { id: 'RF-15', rg: 'RG 15', titulo: 'Consulta en sesión y seguimiento de evolución', vista: ['entrenamiento', 'sesion'], test: 'unit/entrenamiento · e2e/entrenamiento',
      rd: ['Consultar rutina activa en la sesión', 'Consultar alertas físicas y motrices', 'Registrar adaptaciones de ejercicios', 'Registrar progresión de cargas y observaciones', 'Registrar seguimiento y evolución'] },
    { id: 'RF-16', rg: 'RG 16', titulo: 'Cumplimiento de rutina y salida', vista: ['recepcion'], test: 'unit/acceso · e2e/recepcion',
      rd: ['Registrar cumplimiento de la sesión', 'Registrar horario de salida', 'Consultar cumplimiento', 'Consultar horarios de salida'] },
    { id: 'RF-17', rg: 'RG 17', titulo: 'Inventario y alerta de stock mínimo', vista: ['stock', 'inventario'], test: 'unit/compras · e2e/stock',
      rd: ['Registrar productos y materiales internos', 'Registrar existencias y stock mínimo', 'Modificar catálogo', 'Modificar existencias y mínimos', 'Consultar catálogo y existencias', 'Actualizar inventario', 'Alertas de stock mínimo'] },
    { id: 'RF-18', rg: 'RG 18', titulo: 'Proveedores, cotizaciones y órdenes de compra', vista: ['stock', 'compras'], test: 'unit/compras · e2e/stock',
      rd: ['Registrar proveedores', 'Modificar proveedores', 'Consultar padrón', 'Generar solicitudes desde alertas', 'Registrar cotizaciones (precio y disponibilidad)', 'Consultar cotizaciones', 'Emitir OC aprobada por el encargado'] },
    { id: 'RF-19', rg: 'RG 19', titulo: 'Recepción de mercadería y control de calidad', vista: ['stock', 'ordenes'], test: 'unit/compras · e2e/stock',
      rd: ['Registrar recepción de la OC', 'Consultar OC para verificar', 'Registrar inspección física y de calidad', 'Registrar recepciones conformes y no conformes', 'Registrar reclamos al proveedor'] },
    { id: 'RF-20', rg: 'RG 20', titulo: 'Facturas y cuenta corriente de proveedores', vista: ['stock', 'proveedores'], test: 'unit/compras',
      rd: ['Registrar facturas', 'Registrar pagos de facturas conformes', 'Consultar facturas y pagos por proveedor', 'Consultar cuenta corriente', 'Actualizar estado de cuenta corriente'] },
    { id: 'RF-21', rg: 'RG 21', titulo: 'Reportes estadísticos y gerenciales', vista: ['reportes'], test: 'unit/reportes · e2e/reportes',
      rd: ['Ocupación por franja y entrenador', 'Morosidad: atraso, deuda e ingresos por plan', 'Asistencia, conversión de pruebas y retención', 'Listado de cuotas vencidas', 'Filtros por fechas, actividad y profesor'] },
  ];

  const RNF = [
    { id: 'RNF-01', titulo: 'Persistencia', detalle: 'Los datos se guardan en el navegador (localStorage) y sobreviven al recargar. Para producción: migrar a una base de datos con backend.', estado: 'PARCIAL' },
    { id: 'RNF-02', titulo: 'Integridad y manejo de errores', detalle: 'Cada operación valida reglas de negocio y es atómica: si falla, se revierte sin dejar datos a medias.', estado: 'IMPLEMENTADO' },
    { id: 'RNF-03', titulo: 'Autenticación y permisos por rol', detalle: 'Solo Recepción inicia sesión en el panel (no hay usuarios de administración ni de entrenadores); el socio entra a su portal con su DNI y solo consulta su información. En la demo las credenciales viven en el navegador: no es seguridad real.', estado: 'PARCIAL' },
    { id: 'RNF-04', titulo: 'Seguridad de la interfaz', detalle: 'Todo texto ingresado se escapa antes de mostrarse (previene inyección de HTML/XSS).', estado: 'IMPLEMENTADO' },
    { id: 'RNF-05', titulo: 'Compatibilidad y usabilidad', detalle: 'Responsive (celular, tablet y PC) en navegadores modernos. Requiere internet para Tailwind, íconos y fuentes.', estado: 'IMPLEMENTADO' },
  ];

  const V = {
    id: 'requisitos', label: 'Requerimientos', icono: 'list-checks',

    render() {
      const rol = window.Store.rol();
      const permitida = (vid) => UI.vistasPermitidas().some((x) => x.id === vid);
      const filas = RF.map((r) => [
        `<span class="font-mono font-bold text-cyan-300">${r.id}</span><span class="block text-[10px] text-slate-500">${r.rg}</span>`,
        `<strong>${r.titulo}</strong><ul class="mt-1 text-[11px] text-slate-400 space-y-0.5">${r.rd.map((d) => `<li>✓ ${d}</li>`).join('')}</ul>`,
        UI.badge('IMPLEMENTADO', 'ok'),
        `<span class="text-[11px] font-mono text-slate-400">${r.test}</span>`,
        permitida(r.vista[0]) ? `<button class="btn-ghost btn-sm" onclick="UI.irA('${r.vista[0]}'${r.vista[1] ? `,'${r.vista[1]}'` : ''})">Ir ${UI.icono('arrow-right', 'w-3.5 h-3.5')}</button>` : `<span class="text-[10px] text-slate-500">Otro rol</span>`,
      ]);
      return `${UI.encabezado('Matriz de trazabilidad de requerimientos', `Documento DDS – Requerimientos Funcionales de AGMEN · ${RF.length} RF y ${RF.reduce((s, r) => s + r.rd.length, 0)} requerimientos detallados.`)}
        <div class="card p-5 mb-5">${UI.tabla([{ t: 'RF' }, { t: 'Requerimiento y detalle (RD)' }, { t: 'Estado' }, { t: 'Test' }, { t: '' }], filas)}</div>
        <div class="card p-5"><p class="font-bold text-sm mb-3">Requerimientos no funcionales</p>
          ${UI.tabla([{ t: 'ID' }, { t: 'Requerimiento' }, { t: 'Estado' }], RNF.map((r) => [`<span class="font-mono">${r.id}</span>`, `<strong>${r.titulo}</strong><span class="block text-[11px] text-slate-400">${r.detalle}</span>`, UI.badge(r.estado, r.estado === 'IMPLEMENTADO' ? 'ok' : 'alerta')]))}
          <p class="text-[11px] text-slate-500 mt-3">Sesión actual: ${UI.esc(rol)}. Los botones "Ir" respetan los permisos del rol.</p></div>`;
    },
  };

  window.Vistas.requisitos = V;
  window.REQUISITOS = { RF, RNF };
  UI.registrar(V);
})();
