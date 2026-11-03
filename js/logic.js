/**
 * AGMEN — Reglas de negocio puras (sin DOM).
 * Todas las funciones reciben el estado y la fecha "hoy" como parámetros,
 * así se pueden testear con Node (tests/unit) y usar igual en el navegador.
 */
(function (root) {
  'use strict';

  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const DIAS_HABILES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  const DIAS_AVISO_VENCIMIENTO = 5;

  const ESTADOS_PERSONA = ['Interesado', 'En Día de Prueba', 'Socio Activo', 'Socio Inactivo/Baja'];
  const MEDIOS_PAGO = ['Efectivo', 'Transferencia Bancaria', 'Tarjeta de Débito', 'Tarjeta de Crédito'];
  const ESTADOS_TRANSACCION = ['Aprobado', 'Pendiente', 'Rechazado'];
  const CUMPLIMIENTOS = ['Completa', 'Parcial', 'No realizada'];

  /* ------------------------------------------------------------------ */
  /* Fechas (siempre ISO "AAAA-MM-DD" en hora local)                     */
  /* ------------------------------------------------------------------ */
  const pad = (n) => String(n).padStart(2, '0');

  function toISO(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function parseISO(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function hoyISO() {
    return toISO(new Date());
  }

  function addDays(iso, n) {
    const d = parseISO(iso);
    d.setDate(d.getDate() + n);
    return toISO(d);
  }

  /** Suma meses respetando fin de mes (31/01 + 1 mes = 28/02). */
  function addMonths(iso, n) {
    const d = parseISO(iso);
    const dia = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + n);
    const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(dia, ultimo));
    return toISO(d);
  }

  /** Días entre a y b (b - a). Positivo si b es posterior. */
  function diffDays(a, b) {
    return Math.round((parseISO(b) - parseISO(a)) / 86400000);
  }

  function diaSemana(iso) {
    return DIAS[parseISO(iso).getDay()];
  }

  function rangoFechas(desde, hasta) {
    const out = [];
    for (let f = desde; f <= hasta; f = addDays(f, 1)) out.push(f);
    return out;
  }

  function fmtFecha(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  function fmtMoney(n) {
    return '$ ' + Math.round(n || 0).toLocaleString('es-AR');
  }

  function normalizar(txt) {
    return String(txt || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  /* ------------------------------------------------------------------ */
  /* Búsquedas                                                           */
  /* ------------------------------------------------------------------ */
  const byId = (lista, id) => lista.find((x) => x.id === id) || null;

  function nombreCompleto(p) {
    return p ? `${p.nombre} ${p.apellido}` : '—';
  }

  /** RF-13: busca por DNI (parcial) o por nombre/apellido (sin tildes). */
  function buscarPersonas(personas, texto, filtroEstados) {
    const q = normalizar(texto).trim();
    return personas.filter((p) => {
      if (filtroEstados && !filtroEstados.includes(p.estado)) return false;
      if (!q) return true;
      return p.dni.includes(q) || normalizar(nombreCompleto(p)).includes(q) || normalizar(p.apellido).startsWith(q);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Turnos y cupos (RF-08, RF-09)                                       */
  /* ------------------------------------------------------------------ */
  function etiquetaTurno(turno, state) {
    if (!turno) return '—';
    const act = byId(state.actividades, turno.actividadId);
    return `${turno.dia} ${turno.desde}–${turno.hasta} · ${act ? act.nombreCorto : turno.actividadId}`;
  }

  /**
   * Ocupación de un turno. Sin fecha: asignaciones fijas.
   * Con fecha: fijos − ausencias avisadas (recupero) + recuperos que llegan ese día.
   */
  function ocupacion(turno, state, fecha, excluirPersonaId) {
    const fijos = state.personas
      .filter((p) => p.estado === 'Socio Activo' && p.turnosFijos.includes(turno.id) && p.id !== excluirPersonaId)
      .map((p) => p.id);

    let inscriptos = fijos;
    if (fecha) {
      const liberan = state.reprogramaciones
        .filter((r) => r.tipo === 'Recupero' && r.turnoOrigenId === turno.id && r.fechaOrigen === fecha)
        .map((r) => r.personaId);
      const llegan = state.reprogramaciones
        .filter((r) => r.tipo === 'Recupero' && r.turnoDestinoId === turno.id && r.fechaDestino === fecha && r.personaId !== excluirPersonaId)
        .map((r) => r.personaId);
      inscriptos = fijos.filter((id) => !liberan.includes(id)).concat(llegan);
    }

    const cupo = turno.cupo == null ? null : turno.cupo;
    const ocupados = inscriptos.length;
    return {
      inscriptos,
      ocupados,
      cupo,
      libres: cupo == null ? null : Math.max(cupo - ocupados, 0),
      lleno: cupo != null && ocupados >= cupo,
      porcentaje: cupo ? Math.round((ocupados / cupo) * 100) : null,
    };
  }

  /** RF-08: valida que la selección de turnos respete plan, actividad y cupo. */
  function validarTurnosFijos(persona, turnoIds, state) {
    const plan = byId(state.planes, persona.planId);
    if (!plan) return 'El socio no tiene un plan asignado.';

    const turnos = turnoIds.map((id) => byId(state.turnos, id));
    if (turnos.some((t) => !t)) return 'Hay un turno inexistente en la selección.';

    const porActividad = {};
    const diasPorActividad = {};
    for (const t of turnos) {
      if (!plan.frecuencia[t.actividadId]) {
        const act = byId(state.actividades, t.actividadId);
        return `El plan "${plan.nombre}" no incluye ${act ? act.nombre : t.actividadId}.`;
      }
      porActividad[t.actividadId] = (porActividad[t.actividadId] || 0) + 1;
      const clave = `${t.actividadId}-${t.dia}`;
      if (diasPorActividad[clave]) return `No se pueden asignar dos turnos de la misma actividad el ${t.dia}.`;
      diasPorActividad[clave] = true;
    }

    for (const [actId, max] of Object.entries(plan.frecuencia)) {
      const cant = porActividad[actId] || 0;
      if (cant > max) {
        const act = byId(state.actividades, actId);
        return `El plan permite ${max} turno(s) semanales de ${act.nombre} y se eligieron ${cant}.`;
      }
    }

    for (const t of turnos) {
      const oc = ocupacion(t, state, null, persona.id);
      if (oc.lleno) return `El turno ${etiquetaTurno(t, state)} está completo (${oc.cupo}/${oc.cupo}).`;
    }
    return null;
  }

  function turnosDeHoy(persona, state, hoy) {
    const dia = diaSemana(hoy);
    const fijos = persona.turnosFijos.map((id) => byId(state.turnos, id)).filter((t) => t && t.dia === dia);
    const ausencias = state.reprogramaciones
      .filter((r) => r.tipo === 'Recupero' && r.personaId === persona.id && r.fechaOrigen === hoy)
      .map((r) => r.turnoOrigenId);
    const recuperos = state.reprogramaciones
      .filter((r) => r.tipo === 'Recupero' && r.personaId === persona.id && r.fechaDestino === hoy)
      .map((r) => byId(state.turnos, r.turnoDestinoId))
      .filter(Boolean);
    return fijos.filter((t) => !ausencias.includes(t.id)).concat(recuperos);
  }

  /** RF-09: valida un recupero puntual o un cambio de turno fijo. */
  function validarReprogramacion(r, state) {
    const persona = byId(state.personas, r.personaId);
    if (!persona || persona.estado !== 'Socio Activo') return 'Solo los socios activos pueden reprogramar turnos.';
    const origen = byId(state.turnos, r.turnoOrigenId);
    const destino = byId(state.turnos, r.turnoDestinoId);
    if (!origen || !destino) return 'Seleccioná el turno de origen y el de destino.';
    if (!persona.turnosFijos.includes(origen.id)) return 'El turno de origen no pertenece al socio.';
    if (origen.id === destino.id) return 'El turno de destino debe ser distinto al de origen.';
    if (origen.actividadId !== destino.actividadId) return 'El recupero debe ser de la misma actividad.';

    if (r.tipo === 'Cambio de turno fijo') {
      const nuevos = persona.turnosFijos.filter((id) => id !== origen.id).concat(destino.id);
      return validarTurnosFijos(persona, nuevos, state);
    }

    if (!r.fechaOrigen || !r.fechaDestino) return 'Indicá la fecha de la clase perdida y la del recupero.';
    if (diaSemana(r.fechaOrigen) !== origen.dia) return `La clase perdida debe ser un ${origen.dia}.`;
    if (diaSemana(r.fechaDestino) !== destino.dia) return `La fecha de recupero debe ser un ${destino.dia}.`;
    const oc = ocupacion(destino, state, r.fechaDestino, persona.id);
    if (oc.lleno) return `No hay cupo el ${fmtFecha(r.fechaDestino)} en ${etiquetaTurno(destino, state)}.`;
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* Cuotas, descuentos y vigencia (RF-06, RF-10, RF-11, RF-12)          */
  /* ------------------------------------------------------------------ */
  function vencimientoDe(personaId, state) {
    const fechas = state.comprobantes.filter((c) => c.personaId === personaId).map((c) => c.vigenciaHasta);
    return fechas.length ? fechas.sort().pop() : null;
  }

  function grupoDe(personaId, state) {
    return state.grupos.find((g) => g.miembros.includes(personaId)) || null;
  }

  /** Descuentos que aplican solos según las reglas vigentes (RF-06). */
  function descuentosAutomaticos(persona, plan, state) {
    return state.descuentos.filter((d) => {
      if (!d.activo) return false;
      if (d.aplicaA === 'Grupo Familiar') {
        const g = grupoDe(persona.id, state);
        if (!g) return false;
        const activos = g.miembros.filter((id) => {
          const p = byId(state.personas, id);
          return p && p.estado === 'Socio Activo';
        });
        return activos.length >= 2;
      }
      if (d.aplicaA === 'Combinación de Actividades') {
        return plan && Object.keys(plan.frecuencia).length >= 2;
      }
      return false;
    });
  }

  /** Calcula base, descuentos y total de una cuota (RF-10). */
  function liquidar(persona, plan, state, manualIds) {
    if (!plan) return { base: 0, items: [], total: 0 };
    const reglas = descuentosAutomaticos(persona, plan, state).concat(
      state.descuentos.filter((d) => d.activo && d.aplicaA === 'Manual' && (manualIds || []).includes(d.id))
    );
    const base = plan.precio;
    const items = reglas.map((d) => ({
      id: d.id,
      nombre: d.nombre,
      monto: d.tipo === 'Porcentaje' ? Math.round((base * d.valor) / 100) : d.valor,
    }));
    const total = Math.max(base - items.reduce((s, i) => s + i.monto, 0), 0);
    return { base, items, total };
  }

  /**
   * Estado de cuenta (RF-12). Un socio nuevo debe exactamente UNA cuota (la primera),
   * nunca dos: la deuda se cuenta desde el inicio de su cuenta, no desde fechas viejas.
   */
  function estadoCuenta(persona, state, hoy) {
    const vacio = { codigo: 'no_aplica', etiqueta: 'Sin membresía', diasAtraso: 0, diasRestantes: null, cuotasAdeudadas: 0, deuda: 0, vencimiento: null };
    if (!persona || persona.estado !== 'Socio Activo') return vacio;

    const plan = byId(state.planes, persona.planId);
    const cuota = liquidar(persona, plan, state).total;
    const venc = vencimientoDe(persona.id, state);
    const referencia = venc || persona.inicioCuenta || hoy;
    const dias = diffDays(hoy, referencia);

    if (!venc && dias >= 0) {
      return { codigo: 'sin_pago', etiqueta: 'Primera cuota pendiente', diasAtraso: 0, diasRestantes: null, cuotasAdeudadas: 1, deuda: cuota, vencimiento: null };
    }
    if (dias < 0) {
      const atraso = -dias;
      const cuotas = Math.floor(atraso / 30) + 1;
      return {
        codigo: 'vencido',
        etiqueta: venc ? 'Vencido' : 'Sin pagos registrados',
        diasAtraso: atraso,
        diasRestantes: null,
        cuotasAdeudadas: cuotas,
        deuda: cuotas * cuota,
        vencimiento: venc,
      };
    }
    if (dias <= DIAS_AVISO_VENCIMIENTO) {
      return { codigo: 'proximo', etiqueta: dias === 0 ? 'Vence hoy' : `Vence en ${dias} día(s)`, diasAtraso: 0, diasRestantes: dias, cuotasAdeudadas: 0, deuda: 0, vencimiento: venc };
    }
    return { codigo: 'al_dia', etiqueta: 'Al día', diasAtraso: 0, diasRestantes: dias, cuotasAdeudadas: 0, deuda: 0, vencimiento: venc };
  }

  /** Período que cubre el próximo pago: continúa desde el último vencimiento. */
  function periodoSiguiente(persona, state, hoy) {
    const venc = vencimientoDe(persona.id, state);
    const desde = venc || persona.inicioCuenta || hoy;
    return { desde, hasta: addMonths(desde, 1) };
  }

  function numeroComprobante(secuencia) {
    return `0001-${String(secuencia).padStart(8, '0')}`;
  }

  /* ------------------------------------------------------------------ */
  /* Control de acceso (RF-13)                                           */
  /* ------------------------------------------------------------------ */
  function evaluarIngreso(persona, state, hoy) {
    const enCurso = state.asistencias.find((a) => a.personaId === persona.id && a.fecha === hoy && !a.horaSalida);
    if (enCurso) return { nivel: 'bloqueo', motivo: 'Ya tiene un ingreso abierto hoy. Registrá primero su salida.', turnos: [], cuenta: null };

    if (persona.estado === 'En Día de Prueba') {
      const prueba = state.pruebas.find((p) => p.personaId === persona.id && p.fecha === hoy && p.estado === 'Agendada');
      return prueba
        ? { nivel: 'ok', motivo: 'Día de prueba agendado para hoy.', turnos: [], cuenta: null, prueba }
        : { nivel: 'bloqueo', motivo: 'No tiene un día de prueba agendado para hoy.', turnos: [], cuenta: null };
    }
    if (persona.estado !== 'Socio Activo') {
      return { nivel: 'bloqueo', motivo: `Estado "${persona.estado}": no puede ingresar como socio.`, turnos: [], cuenta: null };
    }

    const cuenta = estadoCuenta(persona, state, hoy);
    const turnos = turnosDeHoy(persona, state, hoy);
    if (cuenta.codigo === 'vencido' || cuenta.codigo === 'sin_pago') {
      return { nivel: 'bloqueo', motivo: `${cuenta.etiqueta}: debe ${fmtMoney(cuenta.deuda)}.`, turnos, cuenta, cobrable: true };
    }
    if (!turnos.length) {
      return { nivel: 'alerta', motivo: 'Cuota al día, pero no tiene turno asignado para hoy.', turnos, cuenta };
    }
    if (cuenta.codigo === 'proximo') {
      return { nivel: 'alerta', motivo: `Puede ingresar. ${cuenta.etiqueta}: recordale renovar.`, turnos, cuenta };
    }
    return { nivel: 'ok', motivo: 'Cuota al día y turno asignado hoy.', turnos, cuenta };
  }

  /* ------------------------------------------------------------------ */
  /* Stock y compras (RF-17 a RF-20)                                     */
  /* ------------------------------------------------------------------ */
  function enAlertaStock(item) {
    return item.activo && item.stock <= item.stockMin;
  }

  function cuentaCorriente(proveedorId, state) {
    const facturas = state.facturas.filter((f) => f.proveedorId === proveedorId);
    const idsFacturas = facturas.map((f) => f.id);
    const pagos = state.pagosProveedor.filter((p) => idsFacturas.includes(p.facturaId));
    const facturado = facturas.reduce((s, f) => s + f.importe, 0);
    const pagado = pagos.reduce((s, p) => s + p.importe, 0);
    const saldo = facturado - pagado;
    return { facturado, pagado, saldo, estado: saldo > 0 ? 'Con saldo pendiente' : 'Al día', facturas, pagos };
  }

  function saldoFactura(factura, state) {
    const pagado = state.pagosProveedor.filter((p) => p.facturaId === factura.id).reduce((s, p) => s + p.importe, 0);
    return factura.importe - pagado;
  }

  /* ------------------------------------------------------------------ */
  /* Reportes gerenciales (RF-21)                                        */
  /* ------------------------------------------------------------------ */
  function turnosFiltrados(state, f) {
    return state.turnos.filter(
      (t) => t.activo && (!f.actividadId || t.actividadId === f.actividadId) && (!f.profesionalId || t.profesionalId === f.profesionalId)
    );
  }

  function sociosFiltrados(state, f) {
    const turnos = turnosFiltrados(state, f).map((t) => t.id);
    const filtra = f.actividadId || f.profesionalId;
    return state.personas.filter((p) => {
      if (!filtra) return true;
      if (p.turnosFijos.some((id) => turnos.includes(id))) return true;
      const plan = byId(state.planes, p.planId);
      return !f.profesionalId && f.actividadId && plan && plan.frecuencia[f.actividadId];
    });
  }

  function reporteOcupacion(state, f) {
    const filas = turnosFiltrados(state, f).map((t) => ({ turno: t, ...ocupacion(t, state) }));
    const agrupar = (clave) => {
      const mapa = {};
      for (const r of filas) {
        if (r.cupo == null) continue;
        const k = clave(r.turno);
        mapa[k] = mapa[k] || { clave: k, ocupados: 0, cupos: 0 };
        mapa[k].ocupados += r.ocupados;
        mapa[k].cupos += r.cupo;
      }
      return Object.values(mapa).map((x) => ({ ...x, porcentaje: x.cupos ? Math.round((x.ocupados / x.cupos) * 100) : 0 }));
    };
    const conCupo = filas.filter((r) => r.cupo != null);
    const ocupados = conCupo.reduce((s, r) => s + r.ocupados, 0);
    const cupos = conCupo.reduce((s, r) => s + r.cupo, 0);
    return {
      filas,
      porFranja: agrupar((t) => `${t.desde}–${t.hasta}`).sort((a, b) => a.clave.localeCompare(b.clave)),
      porProfesional: agrupar((t) => t.profesionalId),
      total: { ocupados, cupos, porcentaje: cupos ? Math.round((ocupados / cupos) * 100) : 0 },
    };
  }

  function reporteMorosidad(state, hoy, f) {
    const morosos = sociosFiltrados(state, f)
      .map((p) => ({ persona: p, cuenta: estadoCuenta(p, state, hoy), plan: byId(state.planes, p.planId) }))
      .filter((r) => r.cuenta.codigo === 'vencido' || r.cuenta.codigo === 'sin_pago')
      .sort((a, b) => b.cuenta.diasAtraso - a.cuenta.diasAtraso);

    const cobros = state.cobros.filter((c) => c.estado === 'Aprobado' && c.fecha >= f.desde && c.fecha <= f.hasta);
    const ingresosPorPlan = {};
    for (const c of cobros) {
      ingresosPorPlan[c.planId] = ingresosPorPlan[c.planId] || { planId: c.planId, cantidad: 0, total: 0 };
      ingresosPorPlan[c.planId].cantidad += 1;
      ingresosPorPlan[c.planId].total += c.total;
    }
    return {
      morosos,
      deudaTotal: morosos.reduce((s, r) => s + r.cuenta.deuda, 0),
      ingresosPorPlan: Object.values(ingresosPorPlan).sort((a, b) => b.total - a.total),
      ingresosTotal: cobros.reduce((s, c) => s + c.total, 0),
    };
  }

  function reporteAsistencia(state, hoy, f) {
    const hasta = f.hasta < hoy ? f.hasta : hoy;
    const fechas = f.desde <= hasta ? rangoFechas(f.desde, hasta) : [];
    const turnosValidos = turnosFiltrados(state, f).map((t) => t.id);
    let esperadas = 0;
    let presentes = 0;

    const socios = state.personas.filter((p) => p.inicioCuenta);
    for (const p of socios) {
      for (const fecha of fechas) {
        if (fecha < p.inicioCuenta || (p.fechaBaja && fecha >= p.fechaBaja)) continue;
        const dia = diaSemana(fecha);
        for (const tId of p.turnosFijos) {
          const t = byId(state.turnos, tId);
          if (!t || t.dia !== dia || !turnosValidos.includes(tId)) continue;
          esperadas += 1;
          if (state.asistencias.some((a) => a.personaId === p.id && a.fecha === fecha && a.turnoId === tId)) presentes += 1;
        }
      }
    }

    const pruebas = state.pruebas.filter((x) => x.fecha >= f.desde && x.fecha <= f.hasta && (!f.profesionalId || x.profesionalId === f.profesionalId));
    const realizadas = pruebas.filter((x) => x.estado === 'Asistió' || x.estado === 'Convertido');
    const convertidas = pruebas.filter((x) => x.estado === 'Convertido');

    const activosAlInicio = socios.filter((p) => p.inicioCuenta < f.desde && (!p.fechaBaja || p.fechaBaja >= f.desde));
    const bajas = socios.filter((p) => p.fechaBaja && p.fechaBaja >= f.desde && p.fechaBaja <= f.hasta);
    const retenidos = activosAlInicio.filter((p) => !p.fechaBaja || p.fechaBaja > f.hasta);
    const altas = socios.filter((p) => p.inicioCuenta >= f.desde && p.inicioCuenta <= f.hasta);

    const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
    return {
      esperadas,
      presentes,
      ausentes: esperadas - presentes,
      presentismo: pct(presentes, esperadas),
      ausentismo: esperadas ? 100 - pct(presentes, esperadas) : 0,
      pruebas: pruebas.length,
      pruebasRealizadas: realizadas.length,
      pruebasConvertidas: convertidas.length,
      conversion: pct(convertidas.length, realizadas.length),
      altas: altas.length,
      bajas: bajas.length,
      activosAlInicio: activosAlInicio.length,
      retencion: pct(retenidos.length, activosAlInicio.length),
    };
  }

  const Logic = {
    DIAS, DIAS_HABILES, DIAS_AVISO_VENCIMIENTO, ESTADOS_PERSONA, MEDIOS_PAGO, ESTADOS_TRANSACCION, CUMPLIMIENTOS,
    toISO, parseISO, hoyISO, addDays, addMonths, diffDays, diaSemana, rangoFechas, fmtFecha, fmtMoney, normalizar,
    byId, nombreCompleto, buscarPersonas,
    etiquetaTurno, ocupacion, validarTurnosFijos, turnosDeHoy, validarReprogramacion,
    vencimientoDe, grupoDe, descuentosAutomaticos, liquidar, estadoCuenta, periodoSiguiente, numeroComprobante,
    evaluarIngreso, enAlertaStock, cuentaCorriente, saldoFactura,
    reporteOcupacion, reporteMorosidad, reporteAsistencia,
  };

  if (typeof module === 'object' && module.exports) module.exports = Logic;
  else root.Logic = Logic;
})(typeof window !== 'undefined' ? window : globalThis);
