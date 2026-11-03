/**
 * Vista SOCIOS E INTERESADOS — RF-01 (registro y estados), RF-02 (días de prueba), RF-04 (grupos familiares).
 */
(function () {
  'use strict';
  const L = window.Logic;
  const S = () => window.Store.state;
  const St = () => window.Store;

  const V = {
    id: 'personas', label: 'Socios e interesados', icono: 'users',

    render() {
      const tab = UI.pestana('personas', 'padron');
      const acciones = `<button class="btn-ghost" onclick="Vistas.personas.formPrueba()">${UI.icono('calendar-plus')} Agendar día de prueba</button>
        <button class="btn-primary" onclick="Vistas.personas.formPersona()">${UI.icono('user-plus')} Registrar interesado</button>`;
      return UI.encabezado('Socios e interesados', 'Desde la primera consulta hasta el alta como socio.', acciones) +
        UI.tabsHTML('personas', [
          { id: 'padron', label: 'Padrón (RF-01)' },
          { id: 'pruebas', label: 'Días de prueba (RF-02)' },
          { id: 'grupos', label: 'Grupos familiares (RF-04)' },
        ], 'padron') +
        ({ padron: V.renderPadron, pruebas: V.renderPruebas, grupos: V.renderGrupos }[tab])();
    },

    despues() {
      if (UI.pestana('personas', 'padron') === 'padron') V.pintarPadron();
      if (UI.pestana('personas', 'padron') === 'pruebas') V.pintarPruebas();
    },

    /* ---------------- Padrón ---------------- */
    renderPadron() {
      const estados = ['Todos'].concat(L.ESTADOS_PERSONA);
      const conteo = (e) => (e === 'Todos' ? S().personas.length : S().personas.filter((p) => p.estado === e).length);
      return `<div class="card p-5">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div class="flex flex-wrap gap-1.5">${estados.map((e) => `<button class="badge ${(UI.filtros.estadoPersona || 'Todos') === e ? 'badge-info' : 'badge-neutro'}" onclick="UI.filtros.estadoPersona='${e}';Vistas.personas.pintarPadron();this.parentNode.querySelectorAll('.badge').forEach(b=>b.className='badge badge-neutro');this.className='badge badge-info'">${e} (${conteo(e)})</button>`).join('')}</div>
          ${UI.buscador('padron', 'Buscar por nombre, apellido o DNI', 'Vistas.personas.pintarPadron()')}
        </div>
        <div id="tabla-padron"></div></div>`;
    },

    pintarPadron() {
      const hoy = St().hoy();
      const estado = UI.filtros.estadoPersona && UI.filtros.estadoPersona !== 'Todos' ? [UI.filtros.estadoPersona] : null;
      const lista = L.buscarPersonas(S().personas, UI.filtros.padron || '', estado).sort((a, b) => a.apellido.localeCompare(b.apellido));
      const filas = lista.map((p) => {
        const plan = L.byId(S().planes, p.planId);
        const cuenta = L.estadoCuenta(p, S(), hoy);
        const grupo = L.grupoDe(p.id, S());
        return [
          `<strong>${UI.esc(p.apellido)}, ${UI.esc(p.nombre)}</strong><span class="block text-[11px] text-slate-500 font-mono">DNI ${p.dni}${p.fechaNac ? ` · nac. ${UI.fecha(p.fechaNac)}` : ''}</span>`,
          `${UI.esc(p.telefono)}<span class="block text-[11px] text-slate-500">${UI.esc(p.email || 'sin email')}</span>${p.emergencia ? `<span class="block text-[11px] text-slate-500">Emerg.: ${UI.esc(p.emergencia)}</span>` : ''}`,
          UI.badgeEstadoPersona(p.estado),
          p.estado === 'Socio Activo' ? `${UI.esc(plan ? plan.nombre : '—')}${grupo ? `<span class="block text-[11px] text-cyan-300">${UI.esc(grupo.nombre)}</span>` : ''}` : `<span class="text-slate-500">${p.estado === 'Socio Inactivo/Baja' ? `Baja ${UI.fecha(p.fechaBaja)}` : `Interés: ${UI.esc(L.byId(S().actividades, p.interes)?.nombreCorto || '—')}`}</span>`,
          p.estado === 'Socio Activo' ? UI.badgeCuenta(cuenta) : '<span class="text-slate-600">—</span>',
          `<div class="flex gap-1 justify-end flex-wrap">
            <button class="btn-icon" title="Editar datos" onclick="Vistas.personas.formPersona(${p.id})">${UI.icono('pencil', 'w-3.5 h-3.5')}</button>
            <button class="btn-ghost btn-sm" onclick="Vistas.personas.formEstado(${p.id})">${UI.icono('refresh-cw', 'w-3.5 h-3.5')} Estado</button>
            ${['Interesado', 'En Día de Prueba'].includes(p.estado) ? `<button class="btn-ghost btn-sm" onclick="Vistas.personas.formPrueba(null, ${p.id})">${UI.icono('calendar-plus', 'w-3.5 h-3.5')} Prueba</button>` : ''}
            ${p.estado === 'Socio Activo' ? `<button class="btn-ghost btn-sm" onclick="Vistas.personas.verLegajo(${p.id})">${UI.icono('folder-open', 'w-3.5 h-3.5')} Legajo</button>` : ''}
          </div>`,
        ];
      });
      document.getElementById('tabla-padron').innerHTML = UI.tabla(
        [{ t: 'Persona' }, { t: 'Contacto' }, { t: 'Estado' }, { t: 'Plan / interés' }, { t: 'Cuota' }, { t: '', cls: 'text-right' }],
        filas, 'No hay personas que coincidan con la búsqueda.');
      UI.iconos();
    },

    formPersona(id) {
      const p = id ? St().persona(id) : {};
      UI.form({
        titulo: id ? 'Modificar datos personales' : 'Registrar interesado',
        subtitulo: id ? `${L.nombreCompleto(p)} · ${p.estado}` : 'Primera consulta presencial o virtual (RF-01)',
        valores: p, enviar: id ? 'Guardar cambios' : 'Registrar',
        campos: [
          { name: 'nombre', label: 'Nombre', required: true },
          { name: 'apellido', label: 'Apellido', required: true },
          { name: 'dni', label: 'DNI', required: true, placeholder: '8 dígitos, sin puntos', pattern: '[0-9]{7,8}' },
          { name: 'fechaNac', label: 'Fecha de nacimiento', type: 'date' },
          { name: 'telefono', label: 'Teléfono / WhatsApp', required: true, placeholder: '351-1234567' },
          { name: 'email', label: 'Email', type: 'email', placeholder: 'nombre@mail.com' },
          { name: 'emergencia', label: 'Contacto de emergencia', full: true, placeholder: 'Nombre, parentesco y teléfono' },
          { name: 'interes', label: 'Actividad de interés', type: 'select', options: S().actividades.filter((a) => a.activa).map((a) => ({ value: a.id, label: a.nombre })) },
        ],
        onSubmit: (v) => {
          const r = St().guardarPersona(Object.assign({ id }, v));
          return id ? 'Datos actualizados.' : `${L.nombreCompleto(r)} quedó registrado como Interesado.`;
        },
      });
    },

    /** RG1: Interesado → En Día de Prueba → Socio Activo → Socio Inactivo/Baja */
    formEstado(id) {
      const p = St().persona(id);
      const planes = S().planes.filter((x) => x.activo).map((x) => ({ value: x.id, label: `${x.nombre} · ${UI.plata(x.precio)}` }));
      UI.form({
        titulo: 'Cambiar estado', subtitulo: `${L.nombreCompleto(p)} · actualmente "${p.estado}"`, enviar: 'Aplicar',
        valores: { estado: p.estado, planId: p.planId || 'PL-2' },
        campos: [
          { name: 'estado', label: 'Nuevo estado', type: 'select', options: L.ESTADOS_PERSONA, required: true },
          { name: 'planId', label: 'Plan (para activar como socio)', type: 'select', options: planes },
        ],
        preview: (v) => ({
          'Socio Activo': p.estado === 'Socio Activo' ? '<p class="text-[11px] text-slate-400">Si cambiás el plan, se liberan sus turnos fijos para volver a asignarlos.</p>' : '<p class="text-[11px] text-cyan-300">Se crea la cuenta del socio: queda con la <strong>primera cuota pendiente</strong> y después elegís sus turnos fijos.</p>',
          'Socio Inactivo/Baja': '<p class="text-[11px] text-amber-300">La baja libera automáticamente todos sus cupos en la grilla.</p>',
        }[v.estado] || ''),
        onSubmit: (v) => {
          const antes = p.estado;
          St().cambiarEstadoPersona(id, v.estado, v.planId);
          if (v.estado === 'Socio Activo' && antes !== 'Socio Activo') {
            setTimeout(() => Vistas.turnos.formAsignar(id), 0);
            return `${L.nombreCompleto(p)} ahora es socio activo. Asigná sus turnos fijos.`;
          }
          return `Estado actualizado a "${v.estado}".`;
        },
      });
    },

    /** Legajo: datos, plan, turnos, grupo y comprobantes del socio. */
    verLegajo(id) {
      const p = St().persona(id);
      const cuenta = L.estadoCuenta(p, S(), St().hoy());
      const comps = S().comprobantes.filter((c) => c.personaId === id).sort((a, b) => b.fecha.localeCompare(a.fecha));
      const turnos = p.turnosFijos.map((t) => L.etiquetaTurno(L.byId(S().turnos, t), S()));
      UI.modal({
        titulo: `Legajo · ${L.nombreCompleto(p)}`, subtitulo: `DNI ${p.dni} · socio desde ${UI.fecha(p.inicioCuenta)}`, ancho: 'medio',
        cuerpo: `<div class="grid sm:grid-cols-2 gap-3">
            <div class="card-sub p-3"><p class="text-slate-400 text-[11px]">Plan</p><p class="font-bold">${UI.esc(L.byId(S().planes, p.planId)?.nombre || '—')}</p></div>
            <div class="card-sub p-3"><p class="text-slate-400 text-[11px]">Estado de cuenta</p>${UI.badgeCuenta(cuenta)}${cuenta.deuda ? `<p class="mt-1 text-rose-300">Debe ${UI.plata(cuenta.deuda)}</p>` : ''}</div>
          </div>
          <div><p class="font-bold mb-1">Turnos fijos</p>${turnos.length ? turnos.map((t) => UI.badge(t, 'info')).join(' ') : '<span class="text-slate-500">Sin turnos asignados</span>'}</div>
          <div><p class="font-bold mb-1">Comprobantes de pago (${comps.length})</p>
            ${UI.tabla([{ t: 'N°' }, { t: 'Fecha' }, { t: 'Vigencia' }, { t: 'Total' }, { t: '' }], comps.map((c) => [
              `<span class="font-mono">${c.numero}</span>`, UI.fecha(c.fecha), `${UI.fecha(c.vigenciaDesde)} → ${UI.fecha(c.vigenciaHasta)}`, UI.plata(c.total),
              `<button class="btn-ghost btn-sm" onclick="UI.verComprobante(${c.id})">${UI.icono('file-text', 'w-3.5 h-3.5')} Ver PDF</button>`,
            ]), 'Todavía no tiene pagos aprobados.')}</div>`,
        pie: `<button class="btn-ghost" onclick="Vistas.turnos.formAsignar(${id})">${UI.icono('calendar-days')} Turnos</button>
              <button class="btn-primary" onclick="Vistas.caja.cobrar(${id})">${UI.icono('wallet')} Cobrar cuota</button>`,
      });
    },

    /* ---------------- Días de prueba ---------------- */
    renderPruebas() {
      const prof = UI.filtros.pruebaProf || '';
      const fecha = UI.filtros.pruebaFecha || '';
      return `<div class="card p-5">
        <div class="grid sm:grid-cols-3 gap-3 mb-4">
          ${UI.buscador('pruebaPersona', 'Persona (nombre o DNI)', 'Vistas.personas.pintarPruebas()')}
          <input type="date" class="input" value="${fecha}" onchange="UI.filtros.pruebaFecha=this.value;Vistas.personas.pintarPruebas()" aria-label="Filtrar por fecha">
          <select class="input" onchange="UI.filtros.pruebaProf=this.value;Vistas.personas.pintarPruebas()" aria-label="Filtrar por entrenador"><option value="">Todos los entrenadores</option>${UI.opciones(UI.opcionesProfesionales(false), prof)}</select>
        </div>
        <div id="tabla-pruebas"></div></div>`;
    },

    pintarPruebas() {
      const ids = L.buscarPersonas(S().personas, UI.filtros.pruebaPersona || '').map((p) => p.id);
      const lista = S().pruebas
        .filter((x) => ids.includes(x.personaId) && (!UI.filtros.pruebaFecha || x.fecha === UI.filtros.pruebaFecha) && (!UI.filtros.pruebaProf || x.profesionalId === UI.filtros.pruebaProf))
        .sort((a, b) => b.fecha.localeCompare(a.fecha));
      const tipo = { Agendada: 'info', Asistió: 'ok', 'No asistió': 'error', Convertido: 'ok' };
      const filas = lista.map((x) => {
        const p = St().persona(x.personaId);
        const acciones = x.estado === 'Agendada'
          ? `<button class="btn-icon" title="Modificar" onclick="Vistas.personas.formPrueba(${x.id})">${UI.icono('pencil', 'w-3.5 h-3.5')}</button>
             <button class="btn-ok btn-sm" onclick="UI.ejecutar(()=>Store.cambiarEstadoPrueba(${x.id},'Asistió'),'Marcado como asistió.')">Asistió</button>
             <button class="btn-danger btn-sm" onclick="UI.ejecutar(()=>Store.cambiarEstadoPrueba(${x.id},'No asistió'),'Marcado como ausente.')">No asistió</button>`
          : x.estado === 'Asistió' && p.estado !== 'Socio Activo'
            ? `<button class="btn-primary btn-sm" onclick="Vistas.personas.formEstado(${p.id})">${UI.icono('user-check', 'w-3.5 h-3.5')} Dar de alta</button>` : '';
        return [
          `<strong>${UI.esc(L.nombreCompleto(p))}</strong><span class="block text-[11px] text-slate-500 font-mono">${p.dni}</span>`,
          `${UI.fecha(x.fecha)} <span class="text-slate-400">${x.desde} hs</span><span class="block text-[11px] text-slate-500">${L.diaSemana(x.fecha)}</span>`,
          UI.esc(L.byId(S().actividades, x.actividadId)?.nombreCorto || '—'),
          UI.esc(UI.nombreProfesional(x.profesionalId)),
          UI.badge(x.estado, tipo[x.estado]),
          `<span class="text-slate-400">${UI.esc(x.notas || '—')}</span>`,
          `<div class="flex gap-1 justify-end">${acciones}</div>`,
        ];
      });
      document.getElementById('tabla-pruebas').innerHTML = UI.tabla(
        [{ t: 'Persona' }, { t: 'Fecha y hora' }, { t: 'Actividad' }, { t: 'Entrenador' }, { t: 'Estado' }, { t: 'Notas' }, { t: '', cls: 'text-right' }], filas, 'No hay días de prueba con esos filtros.');
      UI.iconos();
    },

    formPrueba(pruebaId, personaId) {
      const prueba = pruebaId ? L.byId(S().pruebas, pruebaId) : null;
      const candidatos = UI.opcionesPersonas((p) => ['Interesado', 'En Día de Prueba'].includes(p.estado));
      const valores = prueba || { personaId, fecha: L.addDays(St().hoy(), 1), desde: '18:00', actividadId: personaId ? St().persona(personaId).interes : 'GYM' };
      UI.form({
        titulo: prueba ? 'Modificar día de prueba' : 'Agendar día de prueba', subtitulo: 'Sesión gratuita con entrenador responsable (RF-02)', valores,
        campos: [
          { name: 'personaId', label: 'Interesado', type: 'select', options: candidatos, required: true, full: true, vacio: 'Elegí una persona…', disabled: !!prueba },
          { name: 'fecha', label: 'Fecha', type: 'date', required: true, min: St().hoy() },
          { name: 'desde', label: 'Horario', type: 'time', required: true },
          { name: 'actividadId', label: 'Actividad', type: 'select', options: S().actividades.filter((a) => a.activa).map((a) => ({ value: a.id, label: a.nombre })) },
          { name: 'profesionalId', label: 'Entrenador responsable', type: 'select', options: UI.opcionesProfesionales(), required: true },
          { name: 'notas', label: 'Notas / objetivos', type: 'textarea', rows: 2 },
        ],
        preview: (v) => {
          if (!v.fecha || !v.profesionalId) return '';
          const prof = L.byId(S().profesionales, v.profesionalId);
          const dia = L.diaSemana(v.fecha);
          const franjas = prof.disponibilidad.filter((d) => d.dia === dia).map((d) => `${d.desde}–${d.hasta}`);
          return `<p class="text-[11px] ${franjas.length ? 'text-slate-400' : 'text-amber-300'}">${UI.esc(prof.nombre)} el ${dia}: ${franjas.length ? franjas.join(', ') : 'no trabaja ese día'}</p>`;
        },
        onSubmit: (v) => {
          St().guardarPrueba(Object.assign({ id: pruebaId, personaId: prueba ? prueba.personaId : v.personaId }, v, prueba ? { personaId: prueba.personaId } : {}));
          return prueba ? 'Día de prueba modificado.' : `Día de prueba agendado para el ${UI.fecha(v.fecha)} a las ${v.desde} hs.`;
        },
      });
    },

    /* ---------------- Grupos familiares ---------------- */
    renderGrupos() {
      const grupos = S().grupos;
      return `<div class="flex justify-between items-center mb-4">
          <p class="text-xs text-slate-400">Los integrantes activos de un grupo reciben automáticamente el descuento familiar al cobrar la cuota.</p>
          <button class="btn-primary" onclick="Vistas.personas.formGrupo()">${UI.icono('users-round')} Nuevo grupo</button></div>
        <div class="grid md:grid-cols-2 gap-4">${grupos.length ? grupos.map((g) => `
          <div class="card p-4">
            <div class="flex justify-between items-start mb-3">
              <div><p class="font-bold">${UI.esc(g.nombre)}</p><p class="text-[11px] text-slate-500 font-mono">${g.id} · creado ${UI.fecha(g.creado)}</p></div>
              <div class="flex gap-1">
                <button class="btn-icon" title="Modificar" onclick="Vistas.personas.formGrupo('${g.id}')">${UI.icono('pencil', 'w-3.5 h-3.5')}</button>
                <button class="btn-icon" title="Eliminar grupo" onclick="UI.confirmar('Eliminar grupo','Se desvincula a todos los integrantes de <strong>${UI.esc(g.nombre)}</strong>.',()=>{Store.eliminarGrupo('${g.id}');return 'Grupo eliminado.'},{peligro:true,etiqueta:'Eliminar'})">${UI.icono('trash-2', 'w-3.5 h-3.5')}</button>
              </div>
            </div>
            <div class="space-y-1.5">${g.miembros.map((id) => {
              const p = St().persona(id);
              return `<div class="card-sub px-3 py-2 flex justify-between items-center"><span>${UI.esc(L.nombreCompleto(p))} <span class="text-[11px] text-slate-500 font-mono">${p.dni}</span></span>
                <span class="flex items-center gap-2">${UI.badgeEstadoPersona(p.estado)}<button class="btn-icon" title="Quitar del grupo" onclick="Vistas.personas.quitarMiembro('${g.id}',${id})">${UI.icono('user-minus', 'w-3.5 h-3.5')}</button></span></div>`;
            }).join('')}</div>
          </div>`).join('') : '<p class="text-slate-500 text-xs">No hay grupos familiares registrados.</p>'}</div>`;
    },

    formGrupo(grupoId) {
      const g = grupoId ? L.byId(S().grupos, grupoId) : { nombre: '', miembros: [] };
      const ocupados = S().grupos.filter((x) => x.id !== grupoId).flatMap((x) => x.miembros);
      const opciones = S().personas.filter((p) => p.estado === 'Socio Activo').sort((a, b) => a.apellido.localeCompare(b.apellido))
        .map((p) => ({ value: p.id, label: `${UI.esc(L.nombreCompleto(p))} <span class="text-slate-500 font-mono text-[10px]">${p.dni}</span>`, disabled: ocupados.includes(p.id) }));
      UI.form({
        titulo: grupoId ? 'Modificar grupo familiar' : 'Nuevo grupo familiar', subtitulo: 'Vinculá 2 o más socios activos bajo un mismo identificador', ancho: 'medio',
        valores: { nombre: g.nombre, miembros: g.miembros }, enviar: 'Guardar grupo',
        campos: [
          { name: 'nombre', label: 'Nombre del grupo', required: true, full: true, placeholder: 'Ej: Familia Pérez' },
          { name: 'miembros', label: 'Integrantes (los deshabilitados ya están en otro grupo)', type: 'checks', options: opciones },
        ],
        onSubmit: (v) => { St().guardarGrupo(Object.assign({ id: grupoId }, v)); return 'Grupo familiar guardado.'; },
      });
    },

    quitarMiembro(grupoId, personaId) {
      const g = L.byId(S().grupos, grupoId);
      const p = St().persona(personaId);
      const disuelve = g.miembros.length <= 2;
      UI.confirmar('Quitar del grupo', `Se desvincula a <strong>${UI.esc(L.nombreCompleto(p))}</strong> de "${UI.esc(g.nombre)}".${disuelve ? '<br><br>Como el grupo quedaría con un solo integrante, se elimina y deja de aplicar el descuento.' : ''}`,
        () => { St().quitarDeGrupo(grupoId, personaId); return 'Integrante desvinculado.'; }, { etiqueta: 'Quitar', peligro: true });
    },
  };

  window.Vistas.personas = V;
  UI.registrar(V);
})();
