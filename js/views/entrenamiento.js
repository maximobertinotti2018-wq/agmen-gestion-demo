/**
 * Vista ENTRENAMIENTO — RF-03 (valoración funcional e historia motriz), RF-14 (rutinas personalizadas),
 * RF-15 (consulta en sesión, adaptaciones, progresión y evolución), RF-16 (consulta de cumplimiento).
 */
(function () {
  'use strict';
  const L = window.Logic;
  const S = () => window.Store.state;
  const St = () => window.Store;

  const TIPOS_SEGUIMIENTO = ['Adaptación de ejercicio', 'Progresión de carga', 'Observación de desempeño'];
  const OBJETIVOS = ['Fuerza', 'Salud', 'Rendimiento', 'Readaptación'];

  const V = {
    id: 'entrenamiento', label: 'Entrenamiento', icono: 'dumbbell',
    personaId: null,
    borrador: null,

    render() {
      return `${UI.encabezado('Entrenamiento', 'Ficha técnica y clínica, rutinas personalizadas y seguimiento de la evolución de cada alumno.')}
        <div class="grid lg:grid-cols-4 gap-5">
          <aside class="card p-4 lg:col-span-1 space-y-3 h-fit">
            ${UI.buscador('entrenamiento', 'Buscar alumno', 'Vistas.entrenamiento.pintarLista()')}
            <div id="lista-alumnos" class="space-y-1 max-h-[60vh] overflow-y-auto pr-1"></div>
          </aside>
          <section class="lg:col-span-3" id="panel-alumno"></section>
        </div>`;
    },

    despues() {
      V.pintarLista();
      V.pintarPanel();
    },

    pintarLista() {
      const lista = L.buscarPersonas(S().personas, UI.filtros.entrenamiento || '', ['Socio Activo', 'En Día de Prueba'])
        .sort((a, b) => a.apellido.localeCompare(b.apellido));
      document.getElementById('lista-alumnos').innerHTML = lista.map((p) => {
        const alerta = [p.ficha.lesiones, p.ficha.limitaciones].some((x) => x && !/^(ninguna?|sin antecedentes\.?)$/i.test(x.trim()));
        return `<button class="w-full text-left px-3 py-2 rounded-lg border ${p.id === V.personaId ? 'border-cyan-500/50 bg-cyan-500/10' : 'border-transparent hover:bg-slate-800/60'}" onclick="Vistas.entrenamiento.elegir(${p.id})">
          <span class="flex items-center justify-between gap-2"><strong class="text-xs">${UI.esc(p.apellido)}, ${UI.esc(p.nombre)}</strong>${alerta ? `<span title="Tiene alertas físicas" class="text-amber-300">${UI.icono('heart-pulse', 'w-3.5 h-3.5')}</span>` : ''}</span>
          <span class="text-[10px] text-slate-500">${p.rutina.sesiones.length ? `${p.rutina.sesiones.length} sesión(es) de rutina` : 'Sin rutina cargada'}</span></button>`;
      }).join('') || '<p class="text-xs text-slate-500">Sin resultados.</p>';
      UI.iconos();
    },

    elegir(id) {
      V.personaId = id;
      V.borrador = null;
      V.pintarLista();
      V.pintarPanel();
    },

    pintarPanel() {
      const cont = document.getElementById('panel-alumno');
      const p = V.personaId && St().persona(V.personaId);
      if (!p) {
        cont.innerHTML = `<div class="card p-10 text-center text-slate-500 text-xs">${UI.icono('mouse-pointer-click', 'w-6 h-6 mx-auto mb-2')}Elegí un alumno de la lista para ver su ficha y su rutina.</div>`;
        UI.iconos();
        return;
      }
      const tab = UI.pestana('entrenamiento', 'sesion');
      cont.innerHTML = `<div class="card p-5">
          <div class="flex flex-wrap justify-between gap-3 mb-1">
            <div><p class="text-lg font-extrabold">${UI.esc(L.nombreCompleto(p))}</p>
              <p class="text-[11px] text-slate-400">DNI ${p.dni} · ${UI.esc(L.byId(S().planes, p.planId)?.nombre || p.estado)}${p.fechaNac ? ` · ${Math.floor(L.diffDays(p.fechaNac, St().hoy()) / 365.25)} años` : ''}</p></div>
            ${p.ficha.objetivo ? UI.badge(`Objetivo: ${p.ficha.objetivo}`, 'info') : ''}
          </div>
          ${UI.tabsHTML('entrenamiento', [
            { id: 'sesion', label: 'En sesión y evolución (RF-15)' },
            { id: 'ficha', label: 'Ficha técnica y clínica (RF-03)' },
            { id: 'rutina', label: 'Rutina (RF-14)' },
          ], 'sesion')}
          <div id="contenido-alumno">${({ sesion: V.htmlSesion, ficha: V.htmlFicha, rutina: V.htmlRutina }[tab])(p)}</div>
        </div>`;
      UI.iconos();
    },

    alertasHTML(p) {
      const f = p.ficha;
      const items = [['Lesiones previas', f.lesiones], ['Limitaciones', f.limitaciones], ['Cirugías', f.cirugias], ['Patologías', f.patologias]]
        .filter(([, v]) => v && !/^(ninguna?|sin antecedentes\.?)$/i.test(v.trim()));
      if (!items.length) return '<div class="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-[11px] text-emerald-200">Sin alertas físicas ni motrices registradas.</div>';
      return `<div class="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-[11px] text-amber-100 space-y-1">
        <p class="font-bold flex items-center gap-1">${UI.icono('heart-pulse', 'w-3.5 h-3.5')} Alertas físicas y motrices</p>
        ${items.map(([k, v]) => `<p><span class="text-amber-300">${k}:</span> ${UI.esc(v)}</p>`).join('')}
        ${f.fmsObservaciones ? `<p><span class="text-amber-300">Valoración funcional (${UI.esc(f.fmsPuntaje || 's/p')}):</span> ${UI.esc(f.fmsObservaciones)}</p>` : ''}</div>`;
    },

    /** Usada también por Recepción para la consulta rápida. */
    rutinaSoloLectura(p) {
      if (!p.rutina.sesiones.length) return '<p class="text-slate-500">El alumno todavía no tiene rutina cargada.</p>';
      return `${V.alertasHTML(p)}
        ${p.rutina.observacionFms ? `<p class="text-[11px] text-cyan-200 bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-2.5"><strong>Indicación según la valoración funcional:</strong> ${UI.esc(p.rutina.observacionFms)}</p>` : ''}
        ${p.rutina.sesiones.map((s) => `<div><p class="font-bold mb-1">${UI.esc(s.nombre)}</p>
          ${UI.tabla([{ t: 'Ejercicio' }, { t: 'Series' }, { t: 'Reps' }, { t: 'Carga' }, { t: 'Pausa' }], s.ejercicios.map((e) => [UI.esc(e.ejercicio), e.series, UI.esc(e.reps), UI.esc(e.carga), UI.esc(e.pausa)]))}</div>`).join('')}`;
    },

    /* ---------------- En sesión ---------------- */
    htmlSesion(p) {
      const ejercicios = p.rutina.sesiones.flatMap((s) => s.ejercicios.map((e) => e.ejercicio));
      const asistencias = S().asistencias.filter((a) => a.personaId === p.id).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.horaIngreso.localeCompare(a.horaIngreso));
      const ultimas = asistencias.slice(0, 8);
      const historial = p.seguimiento.slice().reverse();
      const hoy = St().hoy();
      const profeDeHoy = (L.turnosDeHoy(p, S(), hoy)[0] || {}).profesionalId;
      return `<div class="grid xl:grid-cols-2 gap-5">
        <div class="space-y-3"><p class="font-bold text-sm">Rutina activa</p>${V.rutinaSoloLectura(p)}</div>
        <div class="space-y-4">
          <form class="card-sub p-4 space-y-3" onsubmit="event.preventDefault();Vistas.entrenamiento.registrarSeguimiento(this)">
            <p class="font-bold text-sm">Registrar en la sesión de hoy</p>
            <div class="grid sm:grid-cols-3 gap-2">
              <label class="campo"><span>Tipo</span><select name="tipo" class="input">${UI.opciones(TIPOS_SEGUIMIENTO)}</select></label>
              <label class="campo"><span>Ejercicio</span><select name="ejercicio" class="input"><option value="">General</option>${UI.opciones(ejercicios)}</select></label>
              <label class="campo"><span>Entrenador</span><select name="profesionalId" class="input">${UI.opciones(UI.opcionesProfesionales(), profeDeHoy)}</select></label>
            </div>
            <label class="campo"><span>Detalle *</span><textarea name="detalle" class="input" rows="2" required placeholder="Ej: subió a 55 kg en sentadilla frontal, 4x8 con buena profundidad"></textarea></label>
            <button class="btn-primary">${UI.icono('plus')} Registrar</button>
          </form>
          <div><p class="font-bold text-sm mb-2">Evolución y seguimiento</p>
            <div class="space-y-2">${historial.length ? historial.map((h) => `<div class="card-sub p-3">
              <div class="flex justify-between gap-2 text-[11px]"><span>${UI.badge(h.tipo, h.tipo === 'Progresión de carga' ? 'ok' : h.tipo === 'Adaptación de ejercicio' ? 'alerta' : 'neutro')} ${h.ejercicio ? `<strong class="ml-1">${UI.esc(h.ejercicio)}</strong>` : ''}</span><span class="text-slate-500">${UI.fecha(h.fecha)} · ${UI.esc(UI.nombreProfesional(h.profesionalId))}</span></div>
              <p class="mt-1.5 text-slate-300">${UI.esc(h.detalle)}</p></div>`).join('') : '<p class="text-xs text-slate-500">Sin registros de seguimiento todavía.</p>'}</div></div>
          <div><p class="font-bold text-sm mb-2">Cumplimiento de las últimas sesiones (RF-16)</p>
            ${UI.tabla([{ t: 'Fecha' }, { t: 'Ingreso' }, { t: 'Salida' }, { t: 'Cumplimiento' }], ultimas.map((a) => [UI.fecha(a.fecha), a.horaIngreso, a.horaSalida || '—', a.cumplimiento ? UI.badge(a.cumplimiento, { Completa: 'ok', Parcial: 'alerta', 'No realizada': 'error' }[a.cumplimiento]) : UI.badge('En curso', 'info')]), 'Sin asistencias registradas.')}</div>
        </div></div>`;
    },

    registrarSeguimiento(form) {
      const datos = { tipo: form.tipo.value, ejercicio: form.ejercicio.value, profesionalId: form.profesionalId.value, detalle: form.detalle.value };
      UI.ejecutar(() => St().agregarSeguimiento(V.personaId, datos), 'Registro de seguimiento guardado.');
    },

    /* ---------------- Ficha técnica ---------------- */
    htmlFicha(p) {
      const f = p.ficha;
      const area = (name, label, ph) => `<label class="campo"><span>${label}</span><textarea name="${name}" class="input" rows="2" placeholder="${ph}">${UI.esc(f[name])}</textarea></label>`;
      return `<form id="form-ficha" class="space-y-4" onsubmit="event.preventDefault();Vistas.entrenamiento.guardarFicha(this)">
        <p class="text-[11px] text-slate-400">Última actualización: ${f.actualizada ? UI.fecha(f.actualizada) : 'nunca'}</p>
        <div class="grid sm:grid-cols-3 gap-3">
          <label class="campo"><span>Puntaje de valoración funcional (FMS)</span><input name="fmsPuntaje" class="input" value="${UI.esc(f.fmsPuntaje)}" placeholder="Ej: 15/21"></label>
          <label class="campo"><span>Objetivo principal</span><select name="objetivo" class="input"><option value="">Sin definir</option>${UI.opciones(OBJETIVOS, f.objetivo)}</select></label>
          <label class="campo"><span>Detalle del objetivo</span><input name="objetivoDetalle" class="input" value="${UI.esc(f.objetivoDetalle)}" placeholder="Ej: correr 10K"></label>
        </div>
        ${area('fmsObservaciones', 'Resultados de la valoración funcional del movimiento', 'Patrones evaluados, asimetrías, compensaciones…')}
        <div class="grid sm:grid-cols-2 gap-3">
          ${area('lesiones', 'Lesiones previas', 'Ej: esguince de tobillo 2023')}
          ${area('limitaciones', 'Limitaciones articulares o musculares', 'Ej: dorsiflexión reducida')}
          ${area('cirugias', 'Cirugías', 'Ninguna')}
          ${area('patologias', 'Patologías relevantes', 'Ej: asma, hipertensión')}
        </div>
        ${area('experiencia', 'Experiencia deportiva previa', 'Deportes, años de práctica…')}
        <div class="flex justify-end"><button class="btn-primary">${UI.icono('save')} Guardar ficha</button></div>
      </form>`;
    },

    guardarFicha(form) {
      const datos = {};
      ['fmsPuntaje', 'objetivo', 'objetivoDetalle', 'fmsObservaciones', 'lesiones', 'limitaciones', 'cirugias', 'patologias', 'experiencia'].forEach((k) => { datos[k] = form[k].value.trim(); });
      UI.ejecutar(() => St().guardarFicha(V.personaId, datos), 'Ficha técnica y clínica actualizada.');
    },

    /* ---------------- Editor de rutina ---------------- */
    htmlRutina(p) {
      if (!V.borrador) V.borrador = JSON.parse(JSON.stringify(p.rutina));
      const b = V.borrador;
      return `<div class="space-y-4">
        ${V.alertasHTML(p)}
        <label class="campo"><span>Indicación vinculada a la valoración funcional</span>
          <textarea class="input" rows="2" oninput="Vistas.entrenamiento.borrador.observacionFms=this.value" placeholder="Ej: priorizar movilidad de tobillo antes de cargar sentadilla">${UI.esc(b.observacionFms)}</textarea></label>
        <div id="editor-sesiones" class="space-y-4">${V.htmlSesiones()}</div>
        <div class="flex flex-wrap justify-between gap-2">
          <button class="btn-ghost" onclick="Vistas.entrenamiento.agregarSesion()">${UI.icono('plus')} Agregar sesión / día</button>
          <div class="flex gap-2"><button class="btn-ghost" onclick="Vistas.entrenamiento.descartarRutina()">Descartar cambios</button>
            <button class="btn-primary" onclick="Vistas.entrenamiento.guardarRutina()">${UI.icono('save')} Guardar rutina</button></div>
        </div></div>`;
    },

    htmlSesiones() {
      const campo = (i, j, k, ph, w) => `<input class="input py-1.5 ${w}" value="${UI.esc(V.borrador.sesiones[i].ejercicios[j][k])}" placeholder="${ph}" oninput="Vistas.entrenamiento.borrador.sesiones[${i}].ejercicios[${j}]['${k}']=this.value">`;
      return V.borrador.sesiones.map((s, i) => `<div class="card-sub p-4 space-y-3">
          <div class="flex gap-2 items-center">
            <input class="input font-bold" value="${UI.esc(s.nombre)}" placeholder="Nombre de la sesión (ej: Día A · Tren inferior)" oninput="Vistas.entrenamiento.borrador.sesiones[${i}].nombre=this.value">
            <button class="btn-icon" title="Eliminar sesión" onclick="Vistas.entrenamiento.quitarSesion(${i})">${UI.icono('trash-2', 'w-3.5 h-3.5')}</button>
          </div>
          <div class="tabla-wrap"><table class="tabla"><thead><tr><th>Ejercicio</th><th>Series</th><th>Reps</th><th>Carga sugerida</th><th>Pausa</th><th></th></tr></thead><tbody>
            ${s.ejercicios.map((e, j) => `<tr><td>${campo(i, j, 'ejercicio', 'Ej: Sentadilla goblet', 'min-w-[11rem]')}</td><td>${campo(i, j, 'series', '3', 'w-16')}</td><td>${campo(i, j, 'reps', '10', 'w-20')}</td><td>${campo(i, j, 'carga', '20 kg', 'w-28')}</td><td>${campo(i, j, 'pausa', '90 s', 'w-20')}</td>
              <td><button class="btn-icon" title="Quitar ejercicio" onclick="Vistas.entrenamiento.quitarEjercicio(${i},${j})">${UI.icono('x', 'w-3.5 h-3.5')}</button></td></tr>`).join('')}
          </tbody></table></div>
          <button class="btn-ghost btn-sm" onclick="Vistas.entrenamiento.agregarEjercicio(${i})">${UI.icono('plus', 'w-3.5 h-3.5')} Agregar ejercicio</button>
        </div>`).join('') || '<p class="text-xs text-slate-500">La rutina no tiene sesiones. Agregá la primera.</p>';
    },

    repintarEditor() {
      document.getElementById('editor-sesiones').innerHTML = V.htmlSesiones();
      UI.iconos();
    },
    agregarSesion() { V.borrador.sesiones.push({ nombre: `Día ${String.fromCharCode(65 + V.borrador.sesiones.length)}`, ejercicios: [{ ejercicio: '', series: 3, reps: '10', carga: '', pausa: '60 s' }] }); V.repintarEditor(); },
    quitarSesion(i) { V.borrador.sesiones.splice(i, 1); V.repintarEditor(); },
    agregarEjercicio(i) { V.borrador.sesiones[i].ejercicios.push({ ejercicio: '', series: 3, reps: '10', carga: '', pausa: '60 s' }); V.repintarEditor(); },
    quitarEjercicio(i, j) { V.borrador.sesiones[i].ejercicios.splice(j, 1); V.repintarEditor(); },

    descartarRutina() {
      V.borrador = null;
      V.pintarPanel();
    },

    guardarRutina() {
      const ok = UI.ejecutar(() => St().guardarRutina(V.personaId, JSON.parse(JSON.stringify(V.borrador))), 'Rutina guardada y asignada al alumno.');
      if (ok) V.borrador = null;
    },
  };

  window.Vistas.entrenamiento = V;
  UI.registrar(V);
})();
