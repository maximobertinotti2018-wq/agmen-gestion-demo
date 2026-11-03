/**
 * Vista TURNOS — RF-07 (profesionales y disponibilidad), RF-08 (grilla y cupos), RF-09 (reprogramación y recupero).
 * Los cupos NO se guardan como número: se calculan siempre a partir de los socios asignados,
 * por eso cualquier alta, baja o cambio de turno se refleja al instante en la grilla.
 */
(function () {
  'use strict';
  const L = window.Logic;
  const S = () => window.Store.state;
  const St = () => window.Store;

  /** Próxima fecha (hoy incluido) que cae en ese día de la semana. */
  function proximaFecha(dia) {
    let f = St().hoy();
    while (L.diaSemana(f) !== dia) f = L.addDays(f, 1);
    return f;
  }

  const V = {
    id: 'turnos', label: 'Turnos', icono: 'calendar-days',

    render() {
      const tab = UI.pestana('turnos', 'grilla');
      const puedeEditar = St().rol() === 'Recepción';
      const acciones = tab === 'grilla' && puedeEditar ? `<button class="btn-ghost" onclick="Vistas.turnos.formTurno()">${UI.icono('plus')} Nuevo turno</button>` : '';
      return UI.encabezado('Turnos y cupos', 'Gimnasio: lunes a viernes de 08 a 12 y de 14 a 21 hs, bloques de 1 hora con máximo 5 alumnos. Running: lunes y miércoles 19:30 a 21 hs, sin límite de cupo.', acciones) +
        UI.tabsHTML('turnos', [
          { id: 'grilla', label: 'Grilla semanal (RF-08)' },
          { id: 'asignacion', label: 'Turnos por socio (RF-08)' },
          { id: 'reprogramaciones', label: 'Reprogramaciones (RF-09)' },
          { id: 'profesionales', label: 'Profesionales (RF-07)' },
        ], 'grilla') +
        ({ grilla: V.renderGrilla, asignacion: V.renderAsignacion, reprogramaciones: V.renderReprogramaciones, profesionales: V.renderProfesionales }[tab])();
    },

    despues() {
      if (UI.pestana('turnos', 'grilla') === 'asignacion') V.pintarAsignacion();
    },

    /* ---------------- Grilla ---------------- */
    renderGrilla() {
      const hoyDia = L.diaSemana(St().hoy());
      const dia = UI.filtros.diaGrilla || (L.DIAS_HABILES.includes(hoyDia) ? hoyDia : 'Lunes');
      const fecha = proximaFecha(dia);
      const puedeEditar = St().rol() === 'Recepción';
      const turnos = S().turnos.filter((t) => t.activo && t.dia === dia).sort((a, b) => a.desde.localeCompare(b.desde));

      const tarjeta = (t) => {
        const oc = L.ocupacion(t, S(), fecha);
        const act = L.byId(S().actividades, t.actividadId);
        const nombres = oc.inscriptos.map((id) => St().persona(id)).map((p) => `<span class="badge badge-neutro">${UI.esc(p.nombre)} ${UI.esc(p.apellido[0])}.</span>`).join(' ');
        const borde = t.actividadId === 'RUN' ? 'border-violet-500/40' : oc.lleno ? 'border-rose-500/40' : 'border-slate-800';
        return `<div class="card p-4 ${borde}">
          <div class="flex justify-between items-start gap-2 mb-2">
            <div><p class="font-extrabold font-mono">${t.desde} – ${t.hasta}</p><p class="text-[11px] text-slate-400">${UI.esc(act.nombreCorto)} · ${UI.esc(act.sede)} · ${UI.esc(UI.nombreProfesional(t.profesionalId))}</p></div>
            <div class="flex gap-1 items-center">${oc.lleno ? UI.badge('Completo', 'error') : t.cupo == null ? UI.badge('Sin cupo', 'info') : UI.badge(`${oc.libres} libre(s)`, oc.libres <= 1 ? 'alerta' : 'ok')}
              ${puedeEditar ? `<button class="btn-icon" title="Editar turno" onclick="Vistas.turnos.formTurno('${t.id}')">${UI.icono('settings-2', 'w-3.5 h-3.5')}</button>` : ''}</div>
          </div>
          ${UI.barraCupo(oc)}
          <div class="mt-2 flex flex-wrap gap-1">${nombres || '<span class="text-[11px] text-slate-600">Sin alumnos asignados</span>'}</div>
        </div>`;
      };

      const manana = turnos.filter((t) => t.desde < '13:00');
      const tarde = turnos.filter((t) => t.desde >= '13:00');
      return `<div class="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div class="flex gap-1 flex-wrap">${L.DIAS_HABILES.map((d) => `<button class="nav-item ${d === dia ? 'activo' : ''}" onclick="UI.filtros.diaGrilla='${d}';UI.renderVista()">${d}${d === hoyDia ? ' (hoy)' : ''}</button>`).join('')}</div>
          <p class="text-[11px] text-slate-400">Ocupación del <strong class="text-slate-200">${UI.fecha(fecha)}</strong> (incluye recuperos y ausencias avisadas)</p>
        </div>
        <p class="text-xs font-bold text-slate-400 uppercase mb-2">Mañana</p>
        <div class="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-5">${manana.map(tarjeta).join('')}</div>
        <p class="text-xs font-bold text-slate-400 uppercase mb-2">Tarde y noche</p>
        <div class="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">${tarde.map(tarjeta).join('')}</div>`;
    },

    formTurno(turnoId) {
      const t = turnoId ? L.byId(S().turnos, turnoId) : { actividadId: 'GYM', dia: 'Lunes', desde: '12:00', hasta: '13:00', profesionalId: 'P2', cupo: 5 };
      UI.form({
        titulo: turnoId ? `Editar turno ${t.dia} ${t.desde}` : 'Nuevo turno en la grilla', subtitulo: 'El profesor debe estar disponible en ese horario',
        valores: Object.assign({}, t, { sinCupo: t.cupo == null ? 'si' : 'no' }), enviar: 'Guardar turno',
        campos: [
          { name: 'actividadId', label: 'Actividad', type: 'select', options: S().actividades.filter((a) => a.activa).map((a) => ({ value: a.id, label: a.nombre })), disabled: !!turnoId },
          { name: 'dia', label: 'Día', type: 'select', options: L.DIAS_HABILES, disabled: !!turnoId },
          { name: 'desde', label: 'Desde', type: 'time', required: true },
          { name: 'hasta', label: 'Hasta', type: 'time', required: true },
          { name: 'profesionalId', label: 'Profesor a cargo', type: 'select', options: UI.opcionesProfesionales(), required: true },
          { name: 'cupo', label: 'Cupo máximo', type: 'number', min: 1, max: 5, ayuda: 'Gimnasio: máximo 5 por profesor.' },
          { name: 'sinCupo', label: '¿Grupo sin límite de cupo?', type: 'select', options: [{ value: 'no', label: 'No, tiene cupo' }, { value: 'si', label: 'Sí (ej: Running)' }] },
        ],
        onSubmit: (v) => {
          St().guardarTurno(Object.assign({}, v, { id: turnoId, actividadId: turnoId ? t.actividadId : v.actividadId, dia: turnoId ? t.dia : v.dia, sinCupo: v.sinCupo === 'si' }));
          return 'Turno guardado.';
        },
      });
      if (turnoId) {
        const caja = document.querySelector('#form-modal .flex.justify-end');
        caja.insertAdjacentHTML('afterbegin', `<button type="button" class="btn-danger mr-auto" onclick="UI.cerrarModal();UI.confirmar('Eliminar turno','Se elimina el bloque ${t.dia} ${t.desde}.',()=>{Store.eliminarTurno('${t.id}');return 'Turno eliminado.'},{peligro:true,etiqueta:'Eliminar'})">Eliminar</button>`);
      }
    },

    /* ---------------- Asignación por socio ---------------- */
    renderAsignacion() {
      return `<div class="card p-5">
        <div class="flex flex-col sm:flex-row justify-between gap-3 mb-4">
          <p class="text-xs text-slate-400">Días y horarios fijos de cada socio según la frecuencia de su plan.</p>
          ${UI.buscador('asignacion', 'Buscar socio', 'Vistas.turnos.pintarAsignacion()')}
        </div><div id="tabla-asignacion"></div></div>`;
    },

    pintarAsignacion() {
      const socios = L.buscarPersonas(S().personas, UI.filtros.asignacion || '', ['Socio Activo']).sort((a, b) => a.apellido.localeCompare(b.apellido));
      const filas = socios.map((p) => {
        const plan = L.byId(S().planes, p.planId);
        const requeridos = plan ? Object.values(plan.frecuencia).reduce((a, b) => a + b, 0) : 0;
        const completo = p.turnosFijos.length === requeridos;
        return [
          `<strong>${UI.esc(L.nombreCompleto(p))}</strong><span class="block text-[11px] text-slate-500 font-mono">${p.dni}</span>`,
          UI.esc(plan ? plan.nombre : '—'),
          p.turnosFijos.length ? p.turnosFijos.map((id) => UI.badge(L.etiquetaTurno(L.byId(S().turnos, id), S()), 'info')).join(' ') : '<span class="text-slate-500">Sin asignar</span>',
          UI.badge(`${p.turnosFijos.length}/${requeridos}`, completo ? 'ok' : 'alerta'),
          `<button class="btn-ghost btn-sm" onclick="Vistas.turnos.formAsignar(${p.id})">${UI.icono('calendar-check', 'w-3.5 h-3.5')} Asignar</button>`,
        ];
      });
      document.getElementById('tabla-asignacion').innerHTML = UI.tabla([{ t: 'Socio' }, { t: 'Plan' }, { t: 'Turnos fijos' }, { t: 'Asignados' }, { t: '', cls: 'text-right' }], filas, 'No hay socios activos con ese criterio.');
      UI.iconos();
    },

    formAsignar(personaId) {
      const p = St().persona(personaId);
      const plan = L.byId(S().planes, p.planId);
      if (!plan) return UI.toast('El socio no tiene plan asignado.', 'error');
      const grupos = Object.keys(plan.frecuencia).map((actId) => {
        const act = L.byId(S().actividades, actId);
        const opciones = S().turnos.filter((t) => t.activo && t.actividadId === actId).sort((a, b) => L.DIAS.indexOf(a.dia) - L.DIAS.indexOf(b.dia) || a.desde.localeCompare(b.desde)).map((t) => {
          const oc = L.ocupacion(t, S(), null, p.id);
          const info = t.cupo == null ? 'sin cupo' : oc.lleno ? 'COMPLETO' : `${oc.libres} libre(s)`;
          return { value: t.id, label: `<span class="font-mono">${t.dia.slice(0, 3)} ${t.desde}</span> <span class="text-[10px] ${oc.lleno ? 'text-rose-300' : 'text-slate-500'}">${info}</span>`, disabled: oc.lleno && !p.turnosFijos.includes(t.id) };
        });
        return { name: `turnos_${actId}`, label: `${act.nombre}: elegí ${plan.frecuencia[actId]} turno(s)`, type: 'checks', columnas: 'grid-cols-2 sm:grid-cols-4', options: opciones };
      });
      const valores = {};
      Object.keys(plan.frecuencia).forEach((actId) => { valores[`turnos_${actId}`] = p.turnosFijos.filter((id) => id.startsWith(`${actId}-`)); });
      UI.form({
        titulo: `Turnos fijos · ${L.nombreCompleto(p)}`, subtitulo: `${plan.nombre} · los turnos completos no se pueden elegir`, ancho: 'ancho', valores, campos: grupos, enviar: 'Guardar turnos',
        preview: (v) => {
          const elegidos = Object.keys(plan.frecuencia).flatMap((a) => v[`turnos_${a}`] || []);
          const err = L.validarTurnosFijos(p, elegidos, S());
          return err ? `<p class="text-[11px] text-amber-300">${UI.esc(err)}</p>` : `<p class="text-[11px] text-emerald-300">${elegidos.length} turno(s) seleccionados.</p>`;
        },
        onSubmit: (v) => {
          const elegidos = Object.keys(plan.frecuencia).flatMap((a) => v[`turnos_${a}`] || []);
          St().asignarTurnosFijos(p.id, elegidos);
          return `Turnos de ${L.nombreCompleto(p)} actualizados.`;
        },
      });
    },

    /* ---------------- Reprogramaciones ---------------- */
    renderReprogramaciones() {
      const filas = S().reprogramaciones.slice().sort((a, b) => b.id - a.id).map((r) => {
        const p = St().persona(r.personaId);
        const o = L.byId(S().turnos, r.turnoOrigenId);
        const d = L.byId(S().turnos, r.turnoDestinoId);
        return [
          `<strong>${UI.esc(L.nombreCompleto(p))}</strong>`,
          UI.badge(r.tipo, r.tipo === 'Recupero' ? 'info' : 'alerta'),
          `${UI.esc(L.etiquetaTurno(o, S()))}${r.fechaOrigen ? `<span class="block text-[11px] text-slate-500">Clase del ${UI.fecha(r.fechaOrigen)}</span>` : ''}`,
          `${UI.esc(L.etiquetaTurno(d, S()))}${r.tipo === 'Recupero' ? `<span class="block text-[11px] text-slate-500">Recupera el ${UI.fecha(r.fechaDestino)}</span>` : '<span class="block text-[11px] text-slate-500">Nuevo turno fijo</span>'}`,
          `<span class="text-slate-400">${UI.esc(r.motivo || '—')}</span>`,
          UI.fecha(r.creado),
          r.tipo === 'Recupero' && r.fechaDestino >= St().hoy() ? `<button class="btn-icon" title="Anular recupero" onclick="UI.confirmar('Anular recupero','Se libera el cupo reservado.',()=>{Store.anularReprogramacion(${r.id});return 'Recupero anulado.'},{peligro:true,etiqueta:'Anular'})">${UI.icono('x', 'w-3.5 h-3.5')}</button>` : '',
        ];
      });
      return `<div class="card p-5">
        <div class="flex justify-between items-center mb-4"><p class="text-xs text-slate-400">Al reprogramar, el cupo del turno de origen se libera automáticamente.</p>
          <button class="btn-primary" onclick="Vistas.turnos.formReprogramar()">${UI.icono('repeat')} Nueva reprogramación</button></div>
        ${UI.tabla([{ t: 'Socio' }, { t: 'Tipo' }, { t: 'Origen' }, { t: 'Destino' }, { t: 'Motivo' }, { t: 'Registrado' }, { t: '' }], filas, 'No hay reprogramaciones registradas.')}</div>`;
    },

    formReprogramar() {
      const socios = UI.opcionesPersonas((p) => p.estado === 'Socio Activo' && p.turnosFijos.length);
      UI.form({
        titulo: 'Reprogramar turno', subtitulo: 'Recupero puntual de una clase o cambio permanente del turno fijo', ancho: 'medio',
        valores: { tipo: 'Recupero' }, enviar: 'Registrar',
        campos: [
          { name: 'personaId', label: 'Socio', type: 'select', options: socios, required: true, full: true, vacio: 'Elegí un socio…' },
          { name: 'tipo', label: 'Tipo', type: 'select', options: ['Recupero', 'Cambio de turno fijo'], required: true },
          { name: 'motivo', label: 'Motivo', placeholder: 'Ej: viaje, trabajo, salud' },
          { name: 'turnoOrigenId', label: 'Turno de origen', type: 'select', options: [], required: true },
          { name: 'fechaOrigen', label: 'Fecha de la clase que pierde', type: 'date' },
          { name: 'turnoDestinoId', label: 'Turno de destino', type: 'select', options: [], required: true },
          { name: 'fechaDestino', label: 'Fecha del recupero', type: 'date', min: St().hoy() },
        ],
        preview: (v) => V._actualizarOpcionesReprogramacion(v),
        onSubmit: (v) => { St().registrarReprogramacion(v); return v.tipo === 'Recupero' ? 'Recupero registrado: cupo reservado.' : 'Turno fijo cambiado y cupo anterior liberado.'; },
      });
    },

    /** Recarga los selects de origen/destino según el socio y muestra cupos disponibles. */
    _actualizarOpcionesReprogramacion(v) {
      const form = document.getElementById('form-modal');
      const p = v.personaId && St().persona(v.personaId);
      const esRecupero = v.tipo === 'Recupero';
      form.elements.fechaOrigen.closest('label').style.display = esRecupero ? '' : 'none';
      form.elements.fechaDestino.closest('label').style.display = esRecupero ? '' : 'none';
      if (!p) return '';

      const selOrigen = form.elements.turnoOrigenId;
      const claveOrigen = `${p.id}`;
      if (selOrigen.dataset.para !== claveOrigen) {
        selOrigen.innerHTML = '<option value="">Elegí…</option>' + UI.opciones(p.turnosFijos.map((id) => ({ value: id, label: L.etiquetaTurno(L.byId(S().turnos, id), S()) })));
        selOrigen.dataset.para = claveOrigen;
      }
      const origen = L.byId(S().turnos, selOrigen.value);
      const selDestino = form.elements.turnoDestinoId;
      const claveDestino = `${p.id}|${selOrigen.value}|${v.tipo}|${v.fechaDestino}`;
      if (origen && selDestino.dataset.para !== claveDestino) {
        const previo = selDestino.value;
        const opciones = S().turnos.filter((t) => t.activo && t.actividadId === origen.actividadId && t.id !== origen.id && !p.turnosFijos.includes(t.id))
          .sort((a, b) => L.DIAS.indexOf(a.dia) - L.DIAS.indexOf(b.dia) || a.desde.localeCompare(b.desde))
          .map((t) => {
            const oc = L.ocupacion(t, S(), esRecupero && v.fechaDestino && L.diaSemana(v.fechaDestino) === t.dia ? v.fechaDestino : null, p.id);
            return { value: t.id, label: `${t.dia} ${t.desde} · ${t.cupo == null ? 'sin cupo' : oc.lleno ? 'COMPLETO' : `${oc.libres} libre(s)`}` };
          });
        selDestino.innerHTML = '<option value="">Elegí…</option>' + UI.opciones(opciones, previo);
        selDestino.dataset.para = claveDestino;
      }
      const datos = Object.assign({}, v, { turnoOrigenId: selOrigen.value, turnoDestinoId: selDestino.value, personaId: Number(v.personaId) });
      if (!datos.turnoOrigenId || !datos.turnoDestinoId) return '<p class="text-[11px] text-slate-400">Elegí el turno de origen y el de destino.</p>';
      const err = L.validarReprogramacion(datos, S());
      return err ? `<p class="text-[11px] text-amber-300">${UI.esc(err)}</p>` : '<p class="text-[11px] text-emerald-300">Hay cupo disponible. Podés registrar la reprogramación.</p>';
    },

    /* ---------------- Profesionales ---------------- */
    renderProfesionales() {
      const puedeEditar = St().rol() === 'Recepción';
      const filas = S().profesionales.map((p) => [
        `<strong>${UI.esc(p.nombre)}</strong><span class="block text-[11px] text-slate-500 font-mono">DNI ${p.dni}</span>`,
        UI.badge(p.rol, p.rol === 'Coordinador' ? 'info' : 'neutro'),
        p.especialidades.map((e) => UI.badge(e, 'neutro')).join(' '),
        `${UI.esc(p.telefono)}<span class="block text-[11px] text-slate-500">${UI.esc(p.email)}</span>`,
        `<div class="text-[11px] space-y-0.5">${p.disponibilidad.map((d) => `<div><span class="text-slate-400 w-16 inline-block">${d.dia}</span><span class="font-mono">${d.desde}–${d.hasta}</span></div>`).join('')}</div>`,
        `${S().turnos.filter((t) => t.activo && t.profesionalId === p.id).length} turnos`,
        p.activo ? UI.badge('Activo', 'ok') : UI.badge('Baja', 'neutro'),
        puedeEditar ? `<div class="flex gap-1 justify-end"><button class="btn-icon" title="Modificar" onclick="Vistas.turnos.formProfesional('${p.id}')">${UI.icono('pencil', 'w-3.5 h-3.5')}</button>
          <button class="btn-ghost btn-sm" onclick="UI.ejecutar(()=>Store.alternarProfesional('${p.id}'),'Estado del profesional actualizado.')">${p.activo ? 'Dar de baja' : 'Reactivar'}</button></div>` : '',
      ]);
      return `<div class="card p-5">
        <div class="flex justify-between items-center mb-4"><p class="text-xs text-slate-400">Entrenadores y coordinadores con sus especialidades y franjas horarias.</p>
          ${puedeEditar ? `<button class="btn-primary" onclick="Vistas.turnos.formProfesional()">${UI.icono('user-plus')} Nuevo profesional</button>` : ''}</div>
        ${UI.tabla([{ t: 'Profesional' }, { t: 'Rol' }, { t: 'Especialidad' }, { t: 'Contacto' }, { t: 'Disponibilidad' }, { t: 'Grilla' }, { t: 'Estado' }, { t: '' }], filas)}</div>`;
    },

    formProfesional(id) {
      const p = id ? L.byId(S().profesionales, id) : { rol: 'Entrenador', especialidades: [], disponibilidad: [] };
      UI.form({
        titulo: id ? 'Modificar profesional' : 'Nuevo profesional', ancho: 'medio', enviar: 'Guardar',
        valores: Object.assign({}, p, { disponibilidad: p.disponibilidad.map((d) => `${d.dia} ${d.desde}-${d.hasta}`).join('\n') }),
        campos: [
          { name: 'nombre', label: 'Nombre completo', required: true },
          { name: 'dni', label: 'DNI', required: true },
          { name: 'telefono', label: 'Teléfono', required: true },
          { name: 'email', label: 'Email', type: 'email' },
          { name: 'rol', label: 'Rol', type: 'select', options: ['Entrenador', 'Coordinador'] },
          { name: 'especialidades', label: 'Especialidades', type: 'checks', columnas: 'grid-cols-3', options: ['Musculación', 'Running', 'Talleres Técnicos'] },
          { name: 'disponibilidad', label: 'Días y franjas horarias (una por línea)', type: 'textarea', rows: 5, required: true, placeholder: 'Lunes 08:00-12:00\nMartes 14:00-21:00' },
        ],
        onSubmit: (v) => { St().guardarProfesional(Object.assign({ id }, v)); return 'Profesional guardado.'; },
      });
    },
  };

  window.Vistas.turnos = V;
  UI.registrar(V);
})();
