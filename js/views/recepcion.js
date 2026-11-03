/**
 * Vista RECEPCIÓN — RF-13 (control de acceso), RF-15 (consulta rápida de rutina/alertas), RF-16 (salida y cumplimiento).
 */
(function () {
  'use strict';
  const L = window.Logic;
  const S = () => window.Store.state;

  const V = {
    id: 'recepcion', label: 'Recepción', icono: 'scan-line',
    seleccionadoId: null,

    render() {
      return `${UI.encabezado('Recepción', 'Buscá al socio por DNI o apellido, verificá su membresía y registrá ingreso y salida.')}
        <div class="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <section class="lg:col-span-3 card p-5 space-y-4">
            <div class="flex items-center gap-2 text-sm font-bold">${UI.icono('search')} Control de acceso <span class="badge badge-info">RF-13</span></div>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">${UI.icono('user-search')}</span>
              <input id="buscar-ingreso" type="search" class="input input-buscar text-base py-3" autocomplete="off"
                placeholder="DNI o apellido del socio (ej: 34321248 o Tagliaferri)" value="${UI.esc(UI.filtros.ingreso || '')}"
                oninput="UI.filtros.ingreso=this.value;Vistas.recepcion.pintarResultados()"
                onkeydown="if(event.key==='Enter'){event.preventDefault();Vistas.recepcion.elegirPrimero()}">
            </div>
            <div id="resultados-ingreso"></div>
            <div id="ficha-ingreso"></div>
          </section>
          <section class="lg:col-span-2 card p-5">
            <div class="flex items-center justify-between mb-3">
              <p class="text-sm font-bold flex items-center gap-2">${UI.icono('activity')} En el gimnasio ahora</p>
              <span class="badge badge-info">RF-16</span>
            </div>
            <div id="lista-adentro"></div>
          </section>
        </div>
        <section class="card p-5 mt-5">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div><p class="text-sm font-bold">Registro del día · ${UI.fecha(window.Store.hoy())}</p><p class="text-[11px] text-slate-400">Ingresos, salidas y cumplimiento de la sesión</p></div>
            <div class="flex gap-2 items-center">${UI.buscador('registroDia', 'Filtrar por nombre o DNI', 'Vistas.recepcion.pintarRegistro()')}
              <button class="btn-ghost" onclick="Vistas.recepcion.exportarCSV()">${UI.icono('download')} CSV</button></div>
          </div>
          <div id="registro-dia"></div>
        </section>`;
    },

    despues() {
      V.pintarResultados();
      V.pintarFicha();
      V.pintarAdentro();
      V.pintarRegistro();
      const input = document.getElementById('buscar-ingreso');
      if (input && !V.seleccionadoId) input.focus();
    },

    pintarResultados() {
      const cont = document.getElementById('resultados-ingreso');
      const q = (UI.filtros.ingreso || '').trim();
      if (!q) { cont.innerHTML = ''; return; }
      const res = L.buscarPersonas(S().personas, q).slice(0, 6);
      cont.innerHTML = res.length
        ? `<div class="grid gap-1.5">${res.map((p) => {
            const cuenta = L.estadoCuenta(p, S(), window.Store.hoy());
            return `<button class="card-sub px-3 py-2 flex items-center justify-between gap-3 text-left hover:border-cyan-500/50 ${p.id === V.seleccionadoId ? 'border-cyan-500/60' : ''}" onclick="Vistas.recepcion.seleccionar(${p.id})">
              <span><strong class="text-sm">${UI.esc(p.apellido)}, ${UI.esc(p.nombre)}</strong><span class="block text-[11px] text-slate-400 font-mono">DNI ${p.dni}</span></span>
              <span class="flex gap-1.5 flex-wrap justify-end">${UI.badgeEstadoPersona(p.estado)}${p.estado === 'Socio Activo' ? UI.badgeCuenta(cuenta) : ''}</span></button>`;
          }).join('')}</div>`
        : '<p class="text-xs text-rose-300">No hay personas con ese DNI o apellido.</p>';
      UI.iconos();
    },

    elegirPrimero() {
      const res = L.buscarPersonas(S().personas, UI.filtros.ingreso || '');
      if (res.length) V.seleccionar(res[0].id);
    },

    seleccionar(id) {
      V.seleccionadoId = id;
      V.pintarResultados();
      V.pintarFicha();
    },

    pintarFicha() {
      const cont = document.getElementById('ficha-ingreso');
      const p = V.seleccionadoId && window.Store.persona(V.seleccionadoId);
      if (!p) {
        cont.innerHTML = `<div class="card-sub p-6 text-center text-slate-500 text-xs">${UI.icono('id-card', 'w-6 h-6 mx-auto mb-2')}Escribí un DNI o apellido para ver el estado del socio.</div>`;
        UI.iconos();
        return;
      }
      const hoy = window.Store.hoy();
      const ev = L.evaluarIngreso(p, S(), hoy);
      const plan = L.byId(S().planes, p.planId);
      const estilos = { ok: ['border-emerald-500/40 bg-emerald-950/20', 'text-emerald-300', 'shield-check'], alerta: ['border-amber-500/40 bg-amber-950/20', 'text-amber-300', 'alert-circle'], bloqueo: ['border-rose-500/40 bg-rose-950/20', 'text-rose-300', 'shield-x'] }[ev.nivel];
      const alertas = [p.ficha.lesiones, p.ficha.limitaciones, p.ficha.patologias].filter((x) => x && !/^(ninguna?|sin antecedentes\.?)$/i.test(x.trim()));
      const turnos = ev.turnos.map((t) => `<span class="badge badge-info">${t.desde}–${t.hasta} · ${UI.esc(L.byId(S().actividades, t.actividadId).nombreCorto)} · ${UI.esc(UI.nombreProfesional(t.profesionalId))}</span>`).join(' ');

      let acciones = '';
      if (ev.nivel !== 'bloqueo') acciones = `<button class="btn-primary text-sm" onclick="Vistas.recepcion.registrarIngreso(${p.id})">${UI.icono('log-in')} Registrar ingreso</button>`;
      if (ev.cobrable) acciones =`<button class="btn-primary" onclick="Vistas.caja.cobrar(${p.id})">${UI.icono('wallet')} Cobrar cuota</button>
        <button class="btn-ghost" onclick="Vistas.recepcion.ingresoExcepcional(${p.id})">${UI.icono('key-round')} Ingreso excepcional</button>`;
      if (p.estado === 'Socio Activo' && p.rutina.sesiones.length) acciones += `<button class="btn-ghost" onclick="Vistas.recepcion.verRutina(${p.id})">${UI.icono('clipboard-list')} Ver rutina activa</button>`;

      cont.innerHTML = `<div class="rounded-xl border ${estilos[0]} p-4 space-y-3">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-lg font-extrabold">${UI.esc(L.nombreCompleto(p))}</p>
              <p class="text-[11px] text-slate-400 font-mono">DNI ${p.dni}${plan ? ` · ${UI.esc(plan.nombre)}` : ''}</p>
            </div>
            <div class="flex gap-1.5 flex-wrap">${UI.badgeEstadoPersona(p.estado)}${ev.cuenta ? UI.badgeCuenta(ev.cuenta) : ''}</div>
          </div>
          <p class="flex items-center gap-2 font-semibold ${estilos[1]}">${UI.icono(estilos[2])} ${UI.esc(ev.motivo)}</p>
          ${ev.cuenta && ev.cuenta.vencimiento ? `<p class="text-[11px] text-slate-400">Vigencia de la membresía hasta el <strong class="text-slate-200">${UI.fecha(ev.cuenta.vencimiento)}</strong></p>` : ''}
          ${p.estado === 'Socio Activo' ? `<div><p class="text-[11px] text-slate-400 mb-1">Turno asignado hoy (${L.diaSemana(hoy)}):</p>${turnos || '<span class="text-[11px] text-slate-500">Sin turno hoy</span>'}</div>` : ''}
          ${alertas.length ? `<div class="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5 text-[11px] text-amber-200"><strong class="flex items-center gap-1 mb-0.5">${UI.icono('heart-pulse', 'w-3.5 h-3.5')} Alertas físicas</strong>${alertas.map(UI.esc).join(' · ')}</div>` : ''}
          <div class="flex flex-wrap gap-2 pt-1">${acciones}</div>
        </div>`;
      UI.iconos();
    },

    registrarIngreso(id) {
      const a = UI.ejecutar(() => window.Store.registrarIngreso(id));
      if (a) V._trasIngreso(a);
    },

    ingresoExcepcional(id) {
      const p = window.Store.persona(id);
      UI.form({
        titulo: 'Ingreso excepcional', subtitulo: `${L.nombreCompleto(p)} tiene la cuota pendiente`, enviar: 'Autorizar ingreso',
        campos: [{ name: 'motivo', label: 'Motivo de la autorización', type: 'textarea', required: true, placeholder: 'Ej: abona mañana por transferencia' }],
        onSubmit: (v) => { const a = window.Store.registrarIngreso(id, { excepcional: true, motivo: v.motivo }); V._trasIngreso(a); },
      });
    },

    _trasIngreso(a) {
      const p = window.Store.persona(a.personaId);
      UI.toast(`Ingreso registrado: ${L.nombreCompleto(p)} a las ${a.horaIngreso} hs`, 'ok');
      V.seleccionadoId = null;
      UI.filtros.ingreso = '';
      UI.renderVista();
    },

    verRutina(id) {
      const p = window.Store.persona(id);
      UI.modal({ titulo: `Rutina activa · ${L.nombreCompleto(p)}`, subtitulo: 'Consulta rápida en sesión (RF-15)', ancho: 'medio', cuerpo: Vistas.entrenamiento.rutinaSoloLectura(p), pie: '<button class="btn-primary" onclick="UI.cerrarModal()">Cerrar</button>' });
    },

    pintarAdentro() {
      const hoy = window.Store.hoy();
      const adentro = S().asistencias.filter((a) => a.fecha === hoy && !a.horaSalida).sort((a, b) => a.horaIngreso.localeCompare(b.horaIngreso));
      document.getElementById('lista-adentro').innerHTML = adentro.length
        ? `<div class="space-y-2">${adentro.map((a) => {
            const p = window.Store.persona(a.personaId);
            const t = L.byId(S().turnos, a.turnoId);
            return `<div class="card-sub p-3 flex items-center justify-between gap-3">
              <div class="min-w-0"><p class="font-bold text-sm truncate">${UI.esc(L.nombreCompleto(p))}</p>
                <p class="text-[11px] text-slate-400">Ingresó ${a.horaIngreso} hs${t ? ` · ${UI.esc(L.byId(S().actividades, t.actividadId).nombreCorto)} ${t.desde}` : ''}</p></div>
              <button class="btn-ghost btn-sm shrink-0" onclick="Vistas.recepcion.registrarSalida(${a.id})">${UI.icono('log-out', 'w-3.5 h-3.5')} Salida</button></div>`;
          }).join('')}</div>`
        : '<p class="text-xs text-slate-500 py-6 text-center">No hay nadie entrenando en este momento.</p>';
      UI.iconos();
    },

    registrarSalida(asistenciaId) {
      const a = L.byId(S().asistencias, asistenciaId);
      const p = window.Store.persona(a.personaId);
      UI.form({
        titulo: `Registrar salida · ${L.nombreCompleto(p)}`,
        subtitulo: `DNI ${p.dni} · ingresó a las ${a.horaIngreso} hs`,
        enviar: 'Registrar salida',
        campos: [
          { name: 'cumplimiento', label: 'Cumplimiento de la sesión', type: 'select', options: L.CUMPLIMIENTOS, required: true, full: true },
          { name: 'observaciones', label: 'Observaciones (opcional)', type: 'textarea', rows: 2, placeholder: 'Ej: completó la rutina sin molestias' },
        ],
        onSubmit: (v) => {
          const r = window.Store.registrarSalida(asistenciaId, v.cumplimiento, v.observaciones);
          return `Salida registrada: ${L.nombreCompleto(p)} a las ${r.horaSalida} hs (${r.cumplimiento})`;
        },
      });
    },

    anular(asistenciaId) {
      const a = L.byId(S().asistencias, asistenciaId);
      const p = window.Store.persona(a.personaId);
      UI.confirmar('Anular ingreso', `Se eliminará el ingreso de <strong>${UI.esc(L.nombreCompleto(p))}</strong> de las ${a.horaIngreso} hs.`, () => { window.Store.anularIngreso(asistenciaId); return 'Ingreso anulado.'; }, { etiqueta: 'Anular', peligro: true });
    },

    filasDelDia() {
      const hoy = window.Store.hoy();
      const q = UI.filtros.registroDia || '';
      const ids = L.buscarPersonas(S().personas, q).map((p) => p.id);
      return S().asistencias.filter((a) => a.fecha === hoy && ids.includes(a.personaId)).sort((a, b) => b.horaIngreso.localeCompare(a.horaIngreso));
    },

    pintarRegistro() {
      const filas = V.filasDelDia().map((a) => {
        const p = window.Store.persona(a.personaId);
        const t = L.byId(S().turnos, a.turnoId);
        const cump = a.cumplimiento ? UI.badge(a.cumplimiento, { Completa: 'ok', Parcial: 'alerta', 'No realizada': 'error' }[a.cumplimiento]) : UI.badge('Entrenando', 'info');
        return [
          `<span class="font-mono text-cyan-300">${a.horaIngreso}</span>`,
          `<strong>${UI.esc(L.nombreCompleto(p))}</strong><span class="block text-[11px] text-slate-500 font-mono">${p.dni}</span>`,
          t ? UI.esc(L.etiquetaTurno(t, S())) : '<span class="text-slate-500">Sin turno</span>',
          a.horaSalida ? `<span class="font-mono">${a.horaSalida}</span>` : `<button class="btn-ghost btn-sm" onclick="Vistas.recepcion.registrarSalida(${a.id})">${UI.icono('log-out', 'w-3.5 h-3.5')} Registrar salida</button>`,
          cump,
          `<span class="text-slate-400">${UI.esc(a.observaciones || '—')}</span>`,
          a.horaSalida ? '' : `<button class="btn-icon" title="Anular ingreso" onclick="Vistas.recepcion.anular(${a.id})">${UI.icono('trash-2', 'w-3.5 h-3.5')}</button>`,
        ];
      });
      document.getElementById('registro-dia').innerHTML = UI.tabla(
        [{ t: 'Ingreso' }, { t: 'Socio' }, { t: 'Turno' }, { t: 'Salida' }, { t: 'Cumplimiento' }, { t: 'Observaciones' }, { t: '', cls: 'text-right' }],
        filas, 'Todavía no hay ingresos registrados hoy.');
      UI.iconos();
    },

    exportarCSV() {
      const filas = V.filasDelDia().map((a) => {
        const p = window.Store.persona(a.personaId);
        return [a.fecha, p.dni, L.nombreCompleto(p), a.turnoId || '', a.horaIngreso, a.horaSalida || '', a.cumplimiento || 'En curso', a.observaciones || ''];
      });
      UI.descargarCSV(`asistencias-${window.Store.hoy()}.csv`, ['Fecha', 'DNI', 'Socio', 'Turno', 'Ingreso', 'Salida', 'Cumplimiento', 'Observaciones'], filas);
    },
  };

  window.Vistas.recepcion = V;
  UI.registrar(V);
})();
