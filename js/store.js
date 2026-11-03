/**
 * AGMEN — Estado de la aplicación y operaciones (casos de uso).
 * Cada operación valida, modifica el estado y guarda. Si algo no corresponde,
 * lanza un ReglaError con el mensaje para el usuario (nunca guarda a medias).
 */
(function (root) {
  'use strict';

  const L = root.Logic;
  // V10: solo existe el usuario recepcion; la clave nueva fuerza recargar los datos de demo.
  const STORAGE_KEY = 'AGMEN_GESTION_V10';

  class ReglaError extends Error {}
  const fallar = (msg) => { throw new ReglaError(msg); };
  const requerido = (valor, campo) => { if (valor == null || String(valor).trim() === '') fallar(`El campo "${campo}" es obligatorio.`); };

  const Store = {
    ReglaError,
    state: null,
    listeners: [],

    hoy() { return L.hoyISO(); },
    ahora() { return new Date().toTimeString().slice(0, 5); },

    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) { this.state = JSON.parse(raw); return; }
      } catch (e) {
        console.warn('No se pudo leer el estado guardado; se cargan los datos de demostración.', e);
      }
      this.state = root.Data.crearEstadoInicial(this.hoy());
      this.save();
    },

    save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch (e) {
        console.error('No se pudo guardar en el navegador.', e);
      }
      this.listeners.forEach((fn) => fn());
    },

    reset() {
      const sesion = this.state.sesion;
      this.state = root.Data.crearEstadoInicial(this.hoy());
      this.state.sesion = sesion;
      this.save();
    },

    onChange(fn) { this.listeners.push(fn); },

    next(clave) { return ++this.state.secuencias[clave]; },

    /** Ejecuta una mutación de forma atómica: si falla, restaura el estado previo. */
    tx(fn) {
      const copia = JSON.stringify(this.state);
      try {
        const r = fn(this.state);
        this.save();
        return r;
      } catch (e) {
        this.state = JSON.parse(copia);
        throw e;
      }
    },

    persona(id) { return L.byId(this.state.personas, Number(id)); },
    rol() { return this.state.sesion ? this.state.sesion.rol : null; },
    exigirRol(...roles) {
      if (!roles.includes(this.rol())) fallar(`Esta acción requiere el rol ${roles.join(' o ')}.`);
    },

    /* ---------------- Sesión ---------------- */
    loginPersonal(usuario, clave) {
      const u = this.state.usuarios.find((x) => x.usuario === usuario.trim().toLowerCase() && x.clave === clave);
      if (!u) fallar('Usuario o contraseña incorrectos.');
      this.state.sesion = { tipo: 'personal', usuario: u.usuario, rol: u.rol, nombre: u.nombre };
      this.save();
      return this.state.sesion;
    },

    loginSocio(dni) {
      const p = this.state.personas.find((x) => x.dni === String(dni).trim());
      if (!p) fallar('No encontramos un socio con ese DNI.');
      if (p.estado !== 'Socio Activo') fallar(`Tu estado es "${p.estado}". Acercate a recepción para activar tu membresía.`);
      this.state.sesion = { tipo: 'socio', personaId: p.id, rol: 'Socio', nombre: L.nombreCompleto(p) };
      this.save();
      return this.state.sesion;
    },

    logout() {
      this.state.sesion = null;
      this.save();
    },

    /* ---------------- RF-01 Personas ---------------- */
    guardarPersona(datos) {
      return this.tx((s) => {
        ['nombre', 'apellido', 'dni', 'telefono'].forEach((c) => requerido(datos[c], c === 'dni' ? 'DNI' : c));
        if (!/^\d{7,8}$/.test(datos.dni)) fallar('El DNI debe tener 7 u 8 dígitos, sin puntos.');
        if (datos.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(datos.email)) fallar('El email no tiene un formato válido.');
        const repetido = s.personas.find((p) => p.dni === datos.dni && p.id !== Number(datos.id));
        if (repetido) fallar(`Ya existe una persona con DNI ${datos.dni} (${L.nombreCompleto(repetido)}).`);

        const campos = ['nombre', 'apellido', 'dni', 'fechaNac', 'telefono', 'email', 'emergencia', 'interes'];
        if (datos.id) {
          const p = this.persona(datos.id);
          campos.forEach((c) => { if (datos[c] !== undefined) p[c] = String(datos[c]).trim(); });
          return p;
        }
        const p = root.Data.persona({ id: this.next('persona'), estado: 'Interesado', fechaConsulta: this.hoy() });
        campos.forEach((c) => { if (datos[c] !== undefined) p[c] = String(datos[c]).trim(); });
        s.personas.push(p);
        return p;
      });
    },

    /** RG1: cambio de estado. Activar exige plan; la baja libera los cupos. */
    cambiarEstadoPersona(id, estado, planId) {
      return this.tx(() => {
        const p = this.persona(id);
        if (!L.ESTADOS_PERSONA.includes(estado)) fallar('Estado inválido.');
        if (estado === 'Socio Activo') {
          const plan = L.byId(this.state.planes, planId || p.planId);
          if (!plan || !plan.activo) fallar('Para activar un socio hay que elegir un plan vigente.');
          if (p.estado !== 'Socio Activo') {
            p.inicioCuenta = this.hoy();
            p.fechaBaja = null;
          }
          if (p.planId !== plan.id) p.turnosFijos = [];
          p.planId = plan.id;
          const prueba = this.state.pruebas.find((x) => x.personaId === p.id && (x.estado === 'Asistió' || x.estado === 'Agendada'));
          if (prueba) prueba.estado = 'Convertido';
        }
        if (estado === 'Socio Inactivo/Baja') {
          p.fechaBaja = this.hoy();
          p.turnosFijos = [];
        }
        p.estado = estado;
        return p;
      });
    },

    /* ---------------- RF-02 Días de prueba ---------------- */
    guardarPrueba(datos) {
      return this.tx((s) => {
        requerido(datos.personaId, 'Persona'); requerido(datos.fecha, 'Fecha'); requerido(datos.desde, 'Horario'); requerido(datos.profesionalId, 'Entrenador');
        const p = this.persona(datos.personaId);
        if (!['Interesado', 'En Día de Prueba'].includes(p.estado)) fallar('Solo se agenda día de prueba a interesados.');
        if (!datos.id && datos.fecha < this.hoy()) fallar('La fecha del día de prueba no puede ser anterior a hoy.');
        const prof = L.byId(s.profesionales, datos.profesionalId);
        const dia = L.diaSemana(datos.fecha);
        const disponible = prof.disponibilidad.some((d) => d.dia === dia && d.desde <= datos.desde && datos.desde < d.hasta);
        if (!disponible) fallar(`${prof.nombre} no trabaja el ${dia} a las ${datos.desde}. Revisá su disponibilidad.`);

        let prueba;
        if (datos.id) {
          prueba = L.byId(s.pruebas, Number(datos.id));
          Object.assign(prueba, { fecha: datos.fecha, desde: datos.desde, profesionalId: datos.profesionalId, actividadId: datos.actividadId, notas: datos.notas || '' });
        } else {
          const abierta = s.pruebas.find((x) => x.personaId === p.id && x.estado === 'Agendada');
          if (abierta) fallar(`${L.nombreCompleto(p)} ya tiene un día de prueba agendado el ${L.fmtFecha(abierta.fecha)}.`);
          prueba = { id: this.next('prueba'), personaId: p.id, fecha: datos.fecha, desde: datos.desde, actividadId: datos.actividadId || p.interes, profesionalId: datos.profesionalId, estado: 'Agendada', notas: datos.notas || '' };
          s.pruebas.push(prueba);
        }
        p.estado = 'En Día de Prueba';
        return prueba;
      });
    },

    cambiarEstadoPrueba(id, estado) {
      return this.tx((s) => {
        const prueba = L.byId(s.pruebas, Number(id));
        prueba.estado = estado;
        const p = this.persona(prueba.personaId);
        if (estado === 'No asistió' && p.estado === 'En Día de Prueba') p.estado = 'Interesado';
        return prueba;
      });
    },

    /* ---------------- RF-03 Ficha técnica y clínica ---------------- */
    guardarFicha(personaId, ficha) {
      return this.tx(() => {
        this.exigirRol('Recepción');
        const p = this.persona(personaId);
        p.ficha =Object.assign({}, p.ficha, ficha, { actualizada: this.hoy() });
        return p;
      });
    },

    /* ---------------- RF-04 Grupos familiares ---------------- */
    guardarGrupo(datos) {
      return this.tx((s) => {
        requerido(datos.nombre, 'Nombre del grupo');
        const miembros = (datos.miembros || []).map(Number);
        if (miembros.length < 2) fallar('Un grupo familiar necesita al menos 2 socios.');
        for (const id of miembros) {
          const p = this.persona(id);
          if (p.estado !== 'Socio Activo') fallar(`${L.nombreCompleto(p)} no es socio activo.`);
          const otro = s.grupos.find((g) => g.id !== datos.id && g.miembros.includes(id));
          if (otro) fallar(`${L.nombreCompleto(p)} ya pertenece a "${otro.nombre}".`);
        }
        if (datos.id) {
          const g = L.byId(s.grupos, datos.id);
          g.nombre = datos.nombre.trim();
          g.miembros = miembros;
          return g;
        }
        const g = { id: `FAM-${String(this.next('grupo')).padStart(2, '0')}`, nombre: datos.nombre.trim(), miembros, creado: this.hoy() };
        s.grupos.push(g);
        return g;
      });
    },

    quitarDeGrupo(grupoId, personaId) {
      return this.tx((s) => {
        const g = L.byId(s.grupos, grupoId);
        g.miembros = g.miembros.filter((id) => id !== Number(personaId));
        if (g.miembros.length < 2) s.grupos = s.grupos.filter((x) => x.id !== g.id);
        return g.miembros.length >= 2;
      });
    },

    eliminarGrupo(grupoId) {
      return this.tx((s) => { s.grupos = s.grupos.filter((g) => g.id !== grupoId); });
    },

    /* ---------------- RF-05 Actividades y planes ---------------- */
    guardarActividad(datos) {
      return this.tx((s) => {
        this.exigirRol('Recepción');
        requerido(datos.nombre, 'Nombre'); requerido(datos.sede, 'Sede');
        if (datos.id) {
          const a = L.byId(s.actividades, datos.id);
          Object.assign(a, { nombre: datos.nombre.trim(), nombreCorto: datos.nombreCorto || a.nombreCorto, sede: datos.sede, descripcion: datos.descripcion || '' });
          return a;
        }
        const id = L.normalizar(datos.nombre).replace(/[^a-z]/g, '').slice(0, 6).toUpperCase() || `ACT${s.actividades.length + 1}`;
        if (L.byId(s.actividades, id)) fallar('Ya existe una actividad con un nombre parecido.');
        const a = { id, nombre: datos.nombre.trim(), nombreCorto: datos.nombreCorto || datos.nombre.trim(), sede: datos.sede, descripcion: datos.descripcion || '', activa: true };
        s.actividades.push(a);
        return a;
      });
    },

    alternarActividad(id) {
      return this.tx((s) => {
        this.exigirRol('Recepción');
        const a = L.byId(s.actividades, id);
        if (a.activa) {
          const enUso = s.personas.some((p) => p.estado === 'Socio Activo' && p.turnosFijos.some((t) => t.startsWith(`${id}-`)));
          if (enUso) fallar('No se puede dar de baja: hay socios con turnos fijos en esta actividad.');
        }
        a.activa = !a.activa;
        s.turnos.filter((t) => t.actividadId === id).forEach((t) => { t.activo = a.activa; });
        return a;
      });
    },

    guardarPlan(datos) {
      return this.tx((s) => {
        this.exigirRol('Recepción');
        requerido(datos.nombre, 'Nombre');
        const precio = Number(datos.precio);
        if (!(precio > 0)) fallar('El valor mensual debe ser mayor a cero.');
        const frecuencia = {};
        for (const a of s.actividades) {
          const n = Number(datos[`frec_${a.id}`] || 0);
          if (n < 0 || n > 5) fallar('La frecuencia semanal debe estar entre 0 y 5.');
          if (n > 0) frecuencia[a.id] = n;
        }
        if (!Object.keys(frecuencia).length) fallar('El plan debe incluir al menos una actividad.');
        if (datos.id) {
          const p = L.byId(s.planes, datos.id);
          Object.assign(p, { nombre: datos.nombre.trim(), precio, frecuencia });
          return p;
        }
        const p = { id: `PL-${Date.now().toString(36).toUpperCase()}`, nombre: datos.nombre.trim(), precio, frecuencia, activo: true };
        s.planes.push(p);
        return p;
      });
    },

    alternarPlan(id) {
      return this.tx((s) => {
        this.exigirRol('Recepción');
        const p = L.byId(s.planes, id);
        p.activo = !p.activo;
        return p;
      });
    },

    /* ---------------- RF-06 Descuentos ---------------- */
    guardarDescuento(datos) {
      return this.tx((s) => {
        this.exigirRol('Recepción');
        requerido(datos.nombre, 'Nombre');
        const valor = Number(datos.valor);
        if (!(valor > 0)) fallar('El valor del descuento debe ser mayor a cero.');
        if (datos.tipo === 'Porcentaje' && valor > 100) fallar('Un porcentaje no puede superar 100%.');
        const campos = { nombre: datos.nombre.trim(), tipo: datos.tipo, valor, aplicaA: datos.aplicaA, activo: datos.activo !== false && datos.activo !== 'false' };
        if (datos.id) return Object.assign(L.byId(s.descuentos, datos.id), campos);
        const d = Object.assign({ id: `D-${Date.now().toString(36).toUpperCase()}` }, campos);
        s.descuentos.push(d);
        return d;
      });
    },

    eliminarDescuento(id) {
      return this.tx((s) => {
        this.exigirRol('Recepción');
        s.descuentos = s.descuentos.filter((d) => d.id !== id);
      });
    },

    /* ---------------- RF-07 Profesionales ---------------- */
    guardarProfesional(datos) {
      return this.tx((s) => {
        this.exigirRol('Recepción');
        ['nombre', 'dni', 'telefono'].forEach((c) => requerido(datos[c], c));
        if (!/^\d{7,8}$/.test(datos.dni)) fallar('El DNI debe tener 7 u 8 dígitos.');
        const especialidades = datos.especialidades || [];
        if (!especialidades.length) fallar('Elegí al menos una especialidad.');
        const disponibilidad = parsearDisponibilidad(datos.disponibilidad);
        const campos = { nombre: datos.nombre.trim(), dni: datos.dni, telefono: datos.telefono, email: datos.email || '', rol: datos.rol, especialidades, disponibilidad };
        if (datos.id) {
          const p = L.byId(s.profesionales, datos.id);
          Object.assign(p, campos);
          return p;
        }
        const p = Object.assign({ id: `P${this.next('profesional')}`, activo: true }, campos);
        s.profesionales.push(p);
        return p;
      });
    },

    alternarProfesional(id) {
      return this.tx((s) => {
        this.exigirRol('Recepción');
        const p = L.byId(s.profesionales, id);
        if (p.activo && s.turnos.some((t) => t.activo && t.profesionalId === id)) fallar('Reasigná sus turnos de la grilla antes de darlo de baja.');
        p.activo = !p.activo;
        return p;
      });
    },

    /* ---------------- RF-08 Grilla y turnos fijos ---------------- */
    guardarTurno(datos) {
      return this.tx((s) => {
        this.exigirRol('Recepción');
        ['actividadId', 'dia', 'desde', 'hasta', 'profesionalId'].forEach((c) => requerido(datos[c], c));
        if (datos.desde >= datos.hasta) fallar('La hora de fin debe ser posterior a la de inicio.');
        const act = L.byId(s.actividades, datos.actividadId);
        const cupo = datos.sinCupo ? null : Number(datos.cupo);
        if (cupo !== null && (!(cupo > 0) || (act.id === 'GYM' && cupo > 5))) fallar('El cupo de gimnasio debe ser entre 1 y 5 alumnos por profesor.');
        const prof = L.byId(s.profesionales, datos.profesionalId);
        const cubre = prof.disponibilidad.some((d) => d.dia === datos.dia && d.desde <= datos.desde && datos.hasta <= d.hasta);
        if (!cubre) fallar(`${prof.nombre} no está disponible el ${datos.dia} de ${datos.desde} a ${datos.hasta}.`);
        const choque = s.turnos.find((t) => t.activo && t.id !== datos.id && t.profesionalId === prof.id && t.dia === datos.dia && t.desde < datos.hasta && datos.desde < t.hasta);
        if (choque) fallar(`${prof.nombre} ya tiene el turno ${L.etiquetaTurno(choque, s)} en ese horario.`);

        if (datos.id) {
          const t = L.byId(s.turnos, datos.id);
          const oc = L.ocupacion(t, s);
          if (cupo !== null && oc.ocupados > cupo) fallar(`El turno tiene ${oc.ocupados} socios asignados; el cupo no puede ser menor.`);
          Object.assign(t, { profesionalId: datos.profesionalId, cupo, desde: datos.desde, hasta: datos.hasta });
          return t;
        }
        const id = `${act.id}-${datos.dia.slice(0, 3).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}-${datos.desde.replace(':', '')}`;
        if (L.byId(s.turnos, id)) fallar('Ya existe un turno de esa actividad en ese día y horario.');
        const t = { id, actividadId: act.id, dia: datos.dia, desde: datos.desde, hasta: datos.hasta, profesionalId: datos.profesionalId, cupo, activo: true };
        s.turnos.push(t);
        return t;
      });
    },

    eliminarTurno(id) {
      return this.tx((s) => {
        this.exigirRol('Recepción');
        const t = L.byId(s.turnos, id);
        if (L.ocupacion(t, s).ocupados) fallar('El turno tiene socios asignados: reubicalos antes de eliminarlo.');
        s.turnos = s.turnos.filter((x) => x.id !== id);
      });
    },

    asignarTurnosFijos(personaId, turnoIds) {
      return this.tx((s) => {
        const p = this.persona(personaId);
        if (p.estado !== 'Socio Activo') fallar('Solo se asignan turnos fijos a socios activos.');
        const error = L.validarTurnosFijos(p, turnoIds, s);
        if (error) fallar(error);
        p.turnosFijos = turnoIds.slice();
        return p;
      });
    },

    /* ---------------- RF-09 Reprogramación y recupero ---------------- */
    registrarReprogramacion(datos) {
      return this.tx((s) => {
        const r = {
          id: this.next('reprogramacion'), personaId: Number(datos.personaId), tipo: datos.tipo,
          turnoOrigenId: datos.turnoOrigenId, turnoDestinoId: datos.turnoDestinoId,
          fechaOrigen: datos.tipo === 'Recupero' ? datos.fechaOrigen : null,
          fechaDestino: datos.tipo === 'Recupero' ? datos.fechaDestino : this.hoy(),
          motivo: datos.motivo || '', creado: this.hoy(),
        };
        const error = L.validarReprogramacion(r, s);
        if (error) fallar(error);
        if (r.tipo === 'Cambio de turno fijo') {
          const p = this.persona(r.personaId);
          p.turnosFijos = p.turnosFijos.map((id) => (id === r.turnoOrigenId ? r.turnoDestinoId : id));
        }
        s.reprogramaciones.push(r);
        return r;
      });
    },

    anularReprogramacion(id) {
      return this.tx((s) => {
        const r = L.byId(s.reprogramaciones, Number(id));
        if (r.tipo !== 'Recupero') fallar('Un cambio de turno fijo se revierte registrando otro cambio.');
        s.reprogramaciones = s.reprogramaciones.filter((x) => x.id !== r.id);
      });
    },

    /* ---------------- RF-10 / RF-11 Cobros y comprobantes ---------------- */
    previsualizarCobro(personaId, manualIds) {
      const p = this.persona(personaId);
      const plan = L.byId(this.state.planes, p.planId);
      return { persona: p, plan, liquidacion: L.liquidar(p, plan, this.state, manualIds), periodo: L.periodoSiguiente(p, this.state, this.hoy()), cuenta: L.estadoCuenta(p, this.state, this.hoy()) };
    },

    registrarCobro(datos) {
      return this.tx((s) => {
        requerido(datos.personaId, 'Socio'); requerido(datos.medio, 'Medio de pago'); requerido(datos.estado, 'Estado de la transacción');
        if (!L.MEDIOS_PAGO.includes(datos.medio)) fallar('Medio de pago inválido.');
        if (!L.ESTADOS_TRANSACCION.includes(datos.estado)) fallar('Estado de transacción inválido.');
        const prev = this.previsualizarCobro(datos.personaId, datos.descuentosManuales);
        if (prev.persona.estado !== 'Socio Activo') fallar('Solo se cobran cuotas a socios activos.');
        if (!prev.plan) fallar('El socio no tiene plan asignado.');
        const pendiente = s.cobros.find((c) => c.personaId === prev.persona.id && c.estado === 'Pendiente');
        if (pendiente && datos.estado !== 'Rechazado') fallar(`Ya hay un cobro pendiente de confirmación (${L.fmtMoney(pendiente.total)}). Resolvelo primero en Movimientos.`);

        const cobro = {
          id: this.next('cobro'), personaId: prev.persona.id, fecha: this.hoy(), hora: this.ahora(), planId: prev.plan.id,
          base: prev.liquidacion.base, descuentos: prev.liquidacion.items, total: prev.liquidacion.total,
          medio: datos.medio, estado: datos.estado, vigenciaDesde: null, vigenciaHasta: null, comprobanteId: null,
        };
        s.cobros.push(cobro);
        const comprobante = cobro.estado === 'Aprobado' ? this._emitirComprobante(cobro) : null;
        return { cobro, comprobante };
      });
    },

    resolverCobro(cobroId, estado) {
      return this.tx((s) => {
        const cobro = L.byId(s.cobros, Number(cobroId));
        if (cobro.estado !== 'Pendiente') fallar('Solo se pueden resolver cobros pendientes.');
        cobro.estado = estado;
        return { cobro, comprobante: estado === 'Aprobado' ? this._emitirComprobante(cobro) : null };
      });
    },

    /** RF-11: comprobante numerado guardado en el repositorio del socio. */
    _emitirComprobante(cobro) {
      const s = this.state;
      const p = this.persona(cobro.personaId);
      const plan = L.byId(s.planes, cobro.planId);
      const periodo = L.periodoSiguiente(p, s, this.hoy());
      cobro.vigenciaDesde = periodo.desde;
      cobro.vigenciaHasta = periodo.hasta;
      const id = this.next('comprobante');
      const comp = {
        id, numero: L.numeroComprobante(id), cobroId: cobro.id, personaId: p.id, fecha: this.hoy(),
        planId: plan.id, planNombre: plan.nombre, base: cobro.base, descuentos: cobro.descuentos, total: cobro.total,
        medio: cobro.medio, vigenciaDesde: periodo.desde, vigenciaHasta: periodo.hasta,
      };
      s.comprobantes.push(comp);
      cobro.comprobanteId = id;
      return comp;
    },

    /* ---------------- RF-13 / RF-16 Ingreso y salida ---------------- */
    registrarIngreso(personaId, opciones) {
      return this.tx((s) => {
        const p = this.persona(personaId);
        const ev = L.evaluarIngreso(p, s, this.hoy());
        const excepcional = opciones && opciones.excepcional;
        if (ev.nivel === 'bloqueo' && !(excepcional && ev.cobrable)) fallar(ev.motivo);
        if (excepcional && !(opciones.motivo || '').trim()) fallar('Indicá el motivo del ingreso excepcional.');
        const turno = ev.turnos[0] || null;
        const a = {
          id: this.next('asistencia'), personaId: p.id, fecha: this.hoy(), turnoId: turno ? turno.id : null,
          horaIngreso: this.ahora(), horaSalida: null, cumplimiento: null,
          observaciones: excepcional ? `Ingreso excepcional: ${opciones.motivo.trim()}` : (ev.prueba ? 'Día de prueba' : ''),
          registradoPor: s.sesion ? s.sesion.nombre : 'Recepción',
        };
        if (ev.prueba) ev.prueba.estado = 'Asistió';
        s.asistencias.push(a);
        return a;
      });
    },

    registrarSalida(asistenciaId, cumplimiento, observaciones) {
      return this.tx((s) => {
        const a = L.byId(s.asistencias, Number(asistenciaId));
        if (!a) fallar('No se encontró el ingreso.');
        if (a.horaSalida) fallar('La salida ya estaba registrada.');
        if (!L.CUMPLIMIENTOS.includes(cumplimiento)) fallar('Indicá el cumplimiento de la sesión.');
        a.horaSalida = this.ahora();
        a.cumplimiento = cumplimiento;
        if (observaciones) a.observaciones = [a.observaciones, observaciones.trim()].filter(Boolean).join(' · ');
        return a;
      });
    },

    anularIngreso(asistenciaId) {
      return this.tx((s) => {
        const a = L.byId(s.asistencias, Number(asistenciaId));
        if (a.fecha !== this.hoy()) fallar('Solo se pueden anular ingresos del día.');
        s.asistencias = s.asistencias.filter((x) => x.id !== a.id);
      });
    },

    /* ---------------- RF-14 / RF-15 Rutinas y seguimiento ---------------- */
    guardarRutina(personaId, rutina) {
      return this.tx(() => {
        this.exigirRol('Recepción');
        const p = this.persona(personaId);
        if (!rutina.sesiones.length) fallar('La rutina debe tener al menos una sesión.');
        rutina.sesiones.forEach((ses, i) => {
          if (!ses.nombre.trim()) fallar(`La sesión ${i + 1} necesita un nombre.`);
          if (!ses.ejercicios.length) fallar(`La sesión "${ses.nombre}" no tiene ejercicios.`);
          ses.ejercicios.forEach((e) => {
            if (!e.ejercicio.trim()) fallar(`Hay un ejercicio sin nombre en "${ses.nombre}".`);
            if (!(Number(e.series) > 0)) fallar(`"${e.ejercicio}" debe tener al menos 1 serie.`);
          });
        });
        p.rutina = { observacionFms: rutina.observacionFms || '', sesiones: rutina.sesiones, actualizada: this.hoy() };
        return p;
      });
    },

    agregarSeguimiento(personaId, datos) {
      return this.tx((s) => {
        this.exigirRol('Recepción');
        requerido(datos.profesionalId, 'Entrenador');
        requerido(datos.detalle, 'Detalle');
        if (!L.byId(s.profesionales, datos.profesionalId)) fallar('Entrenador inexistente.');
        const p = this.persona(personaId);
        const entrada = { fecha: this.hoy(), tipo: datos.tipo, ejercicio: datos.ejercicio || '', detalle: datos.detalle.trim(), profesionalId: datos.profesionalId };
        p.seguimiento.push(entrada);
        return entrada;
      });
    },

    /* ---------------- RF-17 Inventario ---------------- */
    guardarItem(datos) {
      return this.tx((s) => {
        requerido(datos.nombre, 'Nombre'); requerido(datos.categoria, 'Categoría');
        const stock = Number(datos.stock);
        const stockMin = Number(datos.stockMin);
        if (!(stock >= 0) || !(stockMin >= 0)) fallar('Stock y stock mínimo deben ser números mayores o iguales a 0.');
        const precio = datos.tipo === 'Comercial' ? Number(datos.precio) : 0;
        if (datos.tipo === 'Comercial' && !(precio > 0)) fallar('Un producto comercial necesita precio de venta.');
        const campos = { tipo: datos.tipo, nombre: datos.nombre.trim(), categoria: datos.categoria.trim(), precio, stock, stockMin, unidad: datos.unidad || 'unidades' };
        if (datos.id) return Object.assign(L.byId(s.inventario, Number(datos.id)), campos);
        const item = Object.assign({ id: this.next('item'), activo: true }, campos);
        s.inventario.push(item);
        return item;
      });
    },

    venderItem(itemId, cantidad, personaId, medio, estado) {
      return this.tx((s) => {
        const item = L.byId(s.inventario, Number(itemId));
        const n = Number(cantidad);
        if (item.tipo !== 'Comercial') fallar('Los materiales internos no se venden.');
        if (!(n > 0)) fallar('La cantidad debe ser mayor a cero.');
        if (item.stock < n) fallar(`Stock insuficiente: quedan ${item.stock} ${item.unidad}.`);
        item.stock -= n;
        const v = { id: this.next('venta'), fecha: this.hoy(), hora: this.ahora(), personaId: personaId ? Number(personaId) : null, itemId: item.id, cantidad: n, total: item.precio * n, medio: medio || 'Efectivo', estado: estado || 'Entregado' };
        s.ventas.push(v);
        return v;
      });
    },

    entregarVenta(ventaId, medio) {
      return this.tx((s) => {
        const v = L.byId(s.ventas, Number(ventaId));
        v.estado = 'Entregado';
        v.medio = medio || v.medio;
        v.fecha = this.hoy();
        return v;
      });
    },

    cancelarPedido(ventaId) {
      return this.tx((s) => {
        const v = L.byId(s.ventas, Number(ventaId));
        if (v.estado !== 'Pendiente de entrega') fallar('Solo se cancelan pedidos pendientes.');
        L.byId(s.inventario, v.itemId).stock += v.cantidad;
        s.ventas = s.ventas.filter((x) => x.id !== v.id);
      });
    },

    /* ---------------- RF-18 Proveedores, solicitudes y OC ---------------- */
    guardarProveedor(datos) {
      return this.tx((s) => {
        requerido(datos.nombre, 'Razón social'); requerido(datos.cuit, 'CUIT');
        if (!/^\d{2}-\d{8}-\d$/.test(datos.cuit)) fallar('El CUIT debe tener el formato 30-12345678-9.');
        const repetido = s.proveedores.find((p) => p.cuit === datos.cuit && p.id !== Number(datos.id));
        if (repetido) fallar(`El CUIT ya está registrado para ${repetido.nombre}.`);
        const campos = { nombre: datos.nombre.trim(), cuit: datos.cuit, contacto: datos.contacto || '', telefono: datos.telefono || '', email: datos.email || '', rubro: datos.rubro || '' };
        if (datos.id) return Object.assign(L.byId(s.proveedores, Number(datos.id)), campos);
        const p = Object.assign({ id: this.next('proveedor'), activo: true }, campos);
        s.proveedores.push(p);
        return p;
      });
    },

    /** Genera una solicitud por cada ítem en alerta que no tenga una abierta. */
    generarSolicitudesDesdeAlertas() {
      return this.tx((s) => {
        const enCurso = s.solicitudes.filter((x) => x.estado !== 'Con orden de compra').map((x) => x.itemId)
          .concat(s.ordenes.filter((o) => o.estado !== 'Recibida conforme').map((o) => o.itemId));
        const abiertas = new Set(enCurso);
        const nuevas = s.inventario.filter((i) => L.enAlertaStock(i) && !abiertas.has(i.id)).map((i) => {
          const sol = { id: this.next('solicitud'), itemId: i.id, cantidad: Math.max(i.stockMin * 2 - i.stock, 1), fecha: this.hoy(), estado: 'Abierta' };
          s.solicitudes.push(sol);
          return sol;
        });
        return nuevas;
      });
    },

    registrarCotizacion(datos) {
      return this.tx((s) => {
        requerido(datos.solicitudId, 'Solicitud'); requerido(datos.proveedorId, 'Proveedor');
        const precioUnit = Number(datos.precioUnit);
        if (!(precioUnit > 0)) fallar('El precio unitario debe ser mayor a cero.');
        const sol = L.byId(s.solicitudes, Number(datos.solicitudId));
        if (sol.estado === 'Con orden de compra') fallar('La solicitud ya tiene orden de compra.');
        const c = { id: this.next('cotizacion'), solicitudId: sol.id, proveedorId: Number(datos.proveedorId), precioUnit, disponibilidad: datos.disponibilidad || 'Inmediata', plazoDias: Number(datos.plazoDias || 0), fecha: this.hoy(), estado: 'Recibida' };
        s.cotizaciones.push(c);
        sol.estado = 'Cotizada';
        return c;
      });
    },

    /** RF-18: el encargado (usuario de Recepción) aprueba y emite la OC. */
    aprobarCotizacion(cotizacionId) {
      return this.tx((s) => {
        this.exigirRol('Recepción');
        const c = L.byId(s.cotizaciones, Number(cotizacionId));
        if (c.estado !== 'Recibida') fallar('La cotización ya fue procesada.');
        const sol = L.byId(s.solicitudes, c.solicitudId);
        s.cotizaciones.filter((x) => x.solicitudId === sol.id && x.id !== c.id).forEach((x) => { x.estado = 'Descartada'; });
        c.estado = 'Aprobada';
        sol.estado = 'Con orden de compra';
        const id = this.next('orden');
        const oc = { id, numero: `OC-${String(id).padStart(4, '0')}`, cotizacionId: c.id, proveedorId: c.proveedorId, itemId: sol.itemId, cantidad: sol.cantidad, precioUnit: c.precioUnit, total: c.precioUnit * sol.cantidad, fecha: this.hoy(), aprobadaPor: s.sesion.nombre, estado: 'Emitida' };
        s.ordenes.push(oc);
        return oc;
      });
    },

    /* ---------------- RF-19 Recepción y calidad ---------------- */
    registrarRecepcion(datos) {
      return this.tx((s) => {
        const oc = L.byId(s.ordenes, Number(datos.ordenId));
        if (oc.estado !== 'Emitida') fallar('La orden ya fue recibida.');
        const cantidad = Number(datos.cantidadRecibida);
        if (!(cantidad >= 0)) fallar('Cantidad recibida inválida.');
        let resultado = datos.resultado;
        if (resultado === 'Conforme' && cantidad !== oc.cantidad) fallar(`Para ser conforme deben llegar ${oc.cantidad} unidades (llegaron ${cantidad}).`);
        if (resultado === 'No conforme') requerido(datos.reclamo, 'Detalle del reclamo al proveedor');
        const r = {
          id: this.next('recepcion'), ordenId: oc.id, fecha: this.hoy(), cantidadRecibida: cantidad, resultado, observaciones: datos.observaciones || '',
          reclamo: resultado === 'No conforme' ? { detalle: datos.reclamo.trim(), estado: 'Abierto', fecha: this.hoy() } : null,
        };
        s.recepciones.push(r);
        if (resultado === 'Conforme') {
          L.byId(s.inventario, oc.itemId).stock += cantidad;
          oc.estado = 'Recibida conforme';
        } else {
          oc.estado = 'Recibida no conforme';
        }
        return r;
      });
    },

    resolverReclamo(recepcionId) {
      return this.tx((s) => {
        const r = L.byId(s.recepciones, Number(recepcionId));
        r.reclamo.estado = 'Resuelto';
        r.reclamo.resuelto = this.hoy();
        const oc = L.byId(s.ordenes, r.ordenId);
        oc.estado = 'Emitida';
        return r;
      });
    },

    /* ---------------- RF-20 Facturas y cuenta corriente ---------------- */
    registrarFactura(datos) {
      return this.tx((s) => {
        this.exigirRol('Recepción');
        requerido(datos.ordenId, 'Orden de compra'); requerido(datos.numero, 'Número de factura'); requerido(datos.fecha, 'Fecha');
        const oc = L.byId(s.ordenes, Number(datos.ordenId));
        if (oc.estado !== 'Recibida conforme') fallar('Solo se facturan órdenes recibidas en conformidad.');
        if (s.facturas.some((f) => f.ordenId === oc.id)) fallar('Esa orden ya tiene factura cargada.');
        if (s.facturas.some((f) => f.proveedorId === oc.proveedorId && f.numero === datos.numero.trim())) fallar('Ese número de factura ya está cargado para el proveedor.');
        const importe = Number(datos.importe);
        if (!(importe > 0)) fallar('El importe debe ser mayor a cero.');
        const f = { id: this.next('factura'), proveedorId: oc.proveedorId, ordenId: oc.id, numero: datos.numero.trim(), fecha: datos.fecha, importe };
        s.facturas.push(f);
        return f;
      });
    },

    registrarPagoProveedor(datos) {
      return this.tx((s) => {
        this.exigirRol('Recepción');
        const f = L.byId(s.facturas, Number(datos.facturaId));
        const importe = Number(datos.importe);
        const saldo = L.saldoFactura(f, s);
        if (!(importe > 0)) fallar('El importe debe ser mayor a cero.');
        if (importe > saldo) fallar(`El pago supera el saldo de la factura (${L.fmtMoney(saldo)}).`);
        const p = { id: this.next('pagoProveedor'), facturaId: f.id, fecha: this.hoy(), importe, medio: datos.medio || 'Transferencia Bancaria' };
        s.pagosProveedor.push(p);
        return p;
      });
    },
  };

  /** "Lunes 08:00-12:00" por línea → [{dia, desde, hasta}] */
  function parsearDisponibilidad(texto) {
    const lineas = String(texto || '').split(/\n|;/).map((x) => x.trim()).filter(Boolean);
    if (!lineas.length) fallar('Cargá al menos una franja de disponibilidad (ej: Lunes 08:00-12:00).');
    return lineas.map((linea) => {
      const m = linea.match(/^(\S+)\s+(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/);
      const dia = m && L.DIAS.find((d) => L.normalizar(d) === L.normalizar(m[1]));
      if (!m || !dia) fallar(`No entendí la franja "${linea}". Usá el formato: Lunes 08:00-12:00`);
      if (m[2] >= m[3]) fallar(`En "${linea}" la hora de fin debe ser posterior a la de inicio.`);
      return { dia, desde: m[2], hasta: m[3] };
    });
  }

  Store.parsearDisponibilidad = parsearDisponibilidad;
  root.Store = Store;
})(typeof window !== 'undefined' ? window : globalThis);
