/**
 * AGMEN — Utilidades de interfaz compartidas por todas las vistas:
 * escapado de HTML, badges, tablas, pestañas, modal, formularios, toasts y comprobante.
 */
(function (root) {
  'use strict';

  const L = root.Logic;

  const UI = {
    vistas: {},
    vistaActual: null,
    pestanas: {},
    filtros: {},

    /* ---------------- Helpers de HTML ---------------- */
    esc(valor) {
      return String(valor == null ? '' : valor).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },
    icono(nombre, cls = 'w-4 h-4') { return `<i data-lucide="${nombre}" class="${cls}"></i>`; },
    badge(texto, tipo = 'neutro') { return `<span class="badge badge-${tipo}">${UI.esc(texto)}</span>`; },
    plata: L.fmtMoney,
    fecha: L.fmtFecha,

    badgeCuenta(cuenta) {
      const tipo = { al_dia: 'ok', proximo: 'alerta', vencido: 'error', sin_pago: 'alerta', no_aplica: 'neutro' }[cuenta.codigo];
      return UI.badge(cuenta.etiqueta, tipo);
    },
    badgeEstadoPersona(estado) {
      const tipo = { Interesado: 'info', 'En Día de Prueba': 'alerta', 'Socio Activo': 'ok', 'Socio Inactivo/Baja': 'neutro' }[estado] || 'neutro';
      return UI.badge(estado, tipo);
    },
    barraCupo(oc) {
      if (oc.cupo == null) return `<p class="text-[11px] text-cyan-300">${oc.ocupados} inscriptos · sin límite de cupo</p>`;
      const color = oc.lleno ? '#f43f5e' : oc.ocupados >= oc.cupo - 1 ? '#f59e0b' : '#06b6d4';
      return `<div class="flex items-center gap-2"><div class="barra flex-1"><i style="width:${Math.min(oc.porcentaje, 100)}%;background:${color}"></i></div><span class="text-[11px] font-mono ${oc.lleno ? 'text-rose-300' : 'text-slate-300'}">${oc.ocupados}/${oc.cupo}</span></div>`;
    },

    encabezado(titulo, subtitulo, acciones = '') {
      return `<div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
        <div><h2 class="text-lg font-extrabold tracking-tight">${titulo}</h2>${subtitulo ? `<p class="text-xs text-slate-400 mt-0.5">${subtitulo}</p>` : ''}</div>
        <div class="flex flex-wrap gap-2">${acciones}</div></div>`;
    },

    tabla(columnas, filas, vacio = 'No hay registros para mostrar.') {
      const thead = columnas.map((c) => `<th class="${c.cls || ''}">${c.t}</th>`).join('');
      const tbody = filas.length
        ? filas.map((f) => `<tr>${f.map((celda, i) => `<td class="${columnas[i].cls || ''}">${celda}</td>`).join('')}</tr>`).join('')
        : `<tr><td class="vacio" colspan="${columnas.length}">${vacio}</td></tr>`;
      return `<div class="tabla-wrap"><table class="tabla"><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table></div>`;
    },

    buscador(clave, placeholder, onInput) {
      return `<div class="relative w-full sm:w-72">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">${UI.icono('search', 'w-4 h-4')}</span>
        <input type="search" class="input input-buscar" placeholder="${placeholder}" value="${UI.esc(UI.filtros[clave] || '')}" oninput="UI.filtros['${clave}']=this.value;${onInput}" aria-label="${placeholder}">
      </div>`;
    },

    opciones(lista, seleccionado) {
      return lista.map((o) => {
        const v = typeof o === 'object' ? o.value : o;
        const t = typeof o === 'object' ? o.label : o;
        return `<option value="${UI.esc(v)}" ${String(v) === String(seleccionado) ? 'selected' : ''}>${UI.esc(t)}</option>`;
      }).join('');
    },

    /* ---------------- Pestañas internas de cada módulo ---------------- */
    pestana(vistaId, porDefecto) { return UI.pestanas[vistaId] || porDefecto; },
    tabsHTML(vistaId, tabs, porDefecto) {
      const actual = UI.pestana(vistaId, porDefecto);
      return `<div class="tabs no-print" role="tablist">${tabs.map((t) => `<button role="tab" class="tab ${t.id === actual ? 'activo' : ''}" onclick="UI.cambiarPestana('${vistaId}','${t.id}')">${t.label}</button>`).join('')}</div>`;
    },
    cambiarPestana(vistaId, tab) {
      UI.pestanas[vistaId] = tab;
      UI.renderVista();
    },

    /* ---------------- Navegación del panel ---------------- */
    registrar(vista) { UI.vistas[vista.id] = vista; },

    vistasPermitidas() {
      const rol = root.Store.rol();
      return Object.values(UI.vistas).filter((v) => !v.roles || v.roles.includes(rol));
    },

    irA(vistaId, pestana) {
      if (pestana) UI.pestanas[vistaId] = pestana;
      UI.vistaActual = vistaId;
      UI.renderPanel();
      window.scrollTo({ top: 0 });
    },

    renderPanel() {
      const permitidas = UI.vistasPermitidas();
      if (!permitidas.some((v) => v.id === UI.vistaActual)) UI.vistaActual = permitidas[0].id;
      document.getElementById('nav-principal').innerHTML = permitidas.map((v) =>
        `<button class="nav-item ${v.id === UI.vistaActual ? 'activo' : ''}" onclick="UI.irA('${v.id}')" data-vista="${v.id}">${UI.icono(v.icono, 'w-4 h-4')}${v.label}</button>`).join('');
      const s = root.Store.state.sesion;
      document.getElementById('usuario-actual').textContent = `${s.nombre} · ${s.rol}`;
      UI.renderKpis();
      UI.renderVista();
    },

    renderVista() {
      const cont = document.getElementById('vista');
      const vista = UI.vistas[UI.vistaActual];
      if (!vista) return;
      cont.innerHTML = vista.render();
      if (vista.despues) vista.despues();
      UI.iconos();
    },

    /** Barra superior: solo contadores, sin listar alumnos. */
    renderKpis() {
      const s = root.Store.state;
      const hoy = root.Store.hoy();
      const activos = s.personas.filter((p) => p.estado === 'Socio Activo');
      const cuentas = activos.map((p) => L.estadoCuenta(p, s, hoy));
      const adentro = s.asistencias.filter((a) => a.fecha === hoy && !a.horaSalida).length;
      const ingresos = s.asistencias.filter((a) => a.fecha === hoy).length;
      const cobrosHoy = s.cobros.filter((c) => c.fecha === hoy && c.estado === 'Aprobado').reduce((t, c) => t + c.total, 0) + s.ventas.filter((v) => v.fecha === hoy && v.estado === 'Entregado').reduce((t, v) => t + v.total, 0);
      const vencidos = cuentas.filter((c) => c.codigo === 'vencido' || c.codigo === 'sin_pago').length;
      const kpi = (label, valor, cls = 'text-white', vista) => `<button ${vista ? `onclick="UI.irA('${vista[0]}','${vista[1]}')"` : 'disabled style="cursor:default;opacity:1"'} class="flex items-center gap-2 hover:text-white"><span class="text-slate-400">${label}</span><strong class="${cls}">${valor}</strong></button>`;
      document.getElementById('barra-kpis').innerHTML = `<div class="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap gap-x-6 gap-y-1 text-xs">
        ${kpi('Socios activos', activos.length)}
        ${kpi('Entrenando ahora', adentro, 'text-cyan-300', ['recepcion', 'hoy'])}
        ${kpi('Ingresos de hoy', ingresos, 'text-emerald-300', ['recepcion', 'hoy'])}
        ${kpi('Caja del día', UI.plata(cobrosHoy), 'text-emerald-300', ['caja', 'movimientos'])}
        ${kpi('Cuotas a cobrar', vencidos, vencidos ? 'text-rose-300' : 'text-white', ['caja', 'cuotas'])}
      </div>`;
    },

    iconos() { if (root.lucide) root.lucide.createIcons(); },

    /* ---------------- Modal ---------------- */
    modal({ titulo, subtitulo = '', cuerpo, pie = '', ancho = '' }) {
      const caja = document.getElementById('modal-caja');
      caja.className = `mx-auto my-8 card w-full max-w-lg ${ancho}`;
      caja.innerHTML = `<div class="flex items-start justify-between gap-3 p-5 border-b border-slate-800">
          <div><h3 class="font-bold text-sm">${titulo}</h3>${subtitulo ? `<p class="text-[11px] text-slate-400 mt-0.5">${subtitulo}</p>` : ''}</div>
          <button class="btn-icon" onclick="UI.cerrarModal()" aria-label="Cerrar">${UI.icono('x')}</button>
        </div>
        <div class="p-5 text-xs space-y-4" id="modal-cuerpo">${cuerpo}</div>
        ${pie ? `<div class="px-5 pb-5 flex flex-wrap justify-end gap-2">${pie}</div>` : ''}`;
      document.getElementById('modal').classList.remove('hidden');
      UI.iconos();
    },
    cerrarModal() {
      document.getElementById('modal').classList.add('hidden');
      document.getElementById('modal-caja').innerHTML = '';
    },

    confirmar(titulo, texto, alAceptar, { etiqueta = 'Confirmar', peligro = false } = {}) {
      UI._alConfirmar = alAceptar;
      UI.modal({
        titulo, cuerpo: `<p class="text-slate-300 leading-relaxed">${texto}</p>`,
        pie: `<button class="btn-ghost" onclick="UI.cerrarModal()">Cancelar</button>
              <button class="${peligro ? 'btn-danger' : 'btn-primary'}" onclick="const f=UI._alConfirmar;UI.cerrarModal();UI.ejecutar(f)">${etiqueta}</button>`,
      });
    },

    /**
     * Formulario genérico.
     * campos: [{ name, label, type, options, required, placeholder, ayuda, full, min, max, step, rows }]
     * onSubmit(valores) -> string (mensaje de éxito) | void. Si lanza ReglaError, el error se muestra dentro del modal.
     */
    form({ titulo, subtitulo, campos, valores = {}, enviar = 'Guardar', ancho = '', preview, onSubmit, despues }) {
      const campoHTML = (c) => {
        const v = valores[c.name] != null ? valores[c.name] : (c.value != null ? c.value : '');
        const req = c.required ? 'required' : '';
        const attrs = `name="${c.name}" ${req} ${c.placeholder ? `placeholder="${UI.esc(c.placeholder)}"` : ''} ${c.min != null ? `min="${c.min}"` : ''} ${c.max != null ? `max="${c.max}"` : ''} ${c.step ? `step="${c.step}"` : ''} ${c.pattern ? `pattern="${c.pattern}"` : ''} ${c.disabled ? 'disabled' : ''}`;
        let control;
        if (c.type === 'select') control = `<select class="input" ${attrs}>${c.vacio ? `<option value="">${c.vacio}</option>` : ''}${UI.opciones(c.options, v)}</select>`;
        else if (c.type === 'textarea') control = `<textarea class="input" rows="${c.rows || 3}" ${attrs}>${UI.esc(v)}</textarea>`;
        else if (c.type === 'checks') {
          const sel = (Array.isArray(v) ? v : []).map(String);
          control = `<div class="grid ${c.columnas || 'grid-cols-1 sm:grid-cols-2'} gap-1.5">${c.options.map((o) => {
            const val = typeof o === 'object' ? o.value : o;
            const lab = typeof o === 'object' ? o.label : o;
            const dis = typeof o === 'object' && o.disabled;
            return `<label class="check ${dis ? 'deshabilitado' : ''}"><input type="checkbox" name="${c.name}" value="${UI.esc(val)}" ${sel.includes(String(val)) ? 'checked' : ''} ${dis ? 'disabled' : ''}><span>${lab}</span></label>`;
          }).join('')}</div>`;
        } else if (c.type === 'html') control = c.html;
        else control = `<input class="input" type="${c.type || 'text'}" value="${UI.esc(v)}" ${attrs}>`;
        return `<label class="campo ${c.full || c.type === 'textarea' || c.type === 'checks' || c.type === 'html' ? 'sm:col-span-2' : ''}"><span>${c.label}${c.required ? ' *' : ''}</span>${control}${c.ayuda ? `<span class="ayuda">${c.ayuda}</span>` : ''}</label>`;
      };

      UI._form = { onSubmit, preview, campos };
      UI.modal({
        titulo, subtitulo, ancho,
        cuerpo: `<form id="form-modal" class="space-y-4" novalidate>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">${campos.map(campoHTML).join('')}</div>
            ${preview ? '<div id="form-preview"></div>' : ''}
            <div id="form-error" class="error-form hidden" role="alert"></div>
            <div class="flex justify-end gap-2 pt-1">
              <button type="button" class="btn-ghost" onclick="UI.cerrarModal()">Cancelar</button>
              <button type="submit" class="btn-primary">${enviar}</button>
            </div>
          </form>`,
      });
      const form = document.getElementById('form-modal');
      form.addEventListener('submit', (e) => { e.preventDefault(); UI._enviarForm(); });
      if (preview) {
        const actualizar = () => { document.getElementById('form-preview').innerHTML = preview(UI.valoresForm()); UI.iconos(); };
        form.addEventListener('input', actualizar);
        form.addEventListener('change', actualizar);
        actualizar();
      }
      if (despues) despues(form);
      const primero = form.querySelector('input:not([type=checkbox]):not([disabled]),select,textarea');
      if (primero) primero.focus();
    },

    valoresForm() {
      const form = document.getElementById('form-modal');
      const valores = {};
      UI._form.campos.forEach((c) => {
        if (c.type === 'checks') valores[c.name] = [...form.querySelectorAll(`input[name="${c.name}"]:checked`)].map((i) => i.value);
        else if (c.type !== 'html' && form.elements[c.name]) valores[c.name] = form.elements[c.name].value;
      });
      form.querySelectorAll('[data-extra]').forEach((el) => { valores[el.name] = el.type === 'checkbox' ? el.checked : el.value; });
      return valores;
    },

    _enviarForm() {
      const form = document.getElementById('form-modal');
      const error = document.getElementById('form-error');
      const faltante = UI._form.campos.find((c) => c.required && c.type !== 'checks' && form.elements[c.name] && !String(form.elements[c.name].value).trim());
      if (faltante) {
        error.textContent = `Completá el campo "${faltante.label}".`;
        error.classList.remove('hidden');
        form.elements[faltante.name].focus();
        return;
      }
      try {
        const resultado = UI._form.onSubmit(UI.valoresForm());
        if (resultado === false) return;
        if (document.getElementById('form-modal')) UI.cerrarModal();
        if (typeof resultado === 'string') UI.toast(resultado, 'ok');
      } catch (e) {
        if (!(e instanceof root.Store.ReglaError)) { console.error(e); }
        error.textContent = e instanceof root.Store.ReglaError ? e.message : 'Ocurrió un error inesperado. Revisá la consola.';
        error.classList.remove('hidden');
      }
    },

    /** Ejecuta una acción y muestra el resultado como toast (errores de negocio incluidos). */
    ejecutar(fn, mensajeOk) {
      try {
        const r = fn();
        const msg = typeof mensajeOk === 'function' ? mensajeOk(r) : mensajeOk || (typeof r === 'string' ? r : null);
        if (msg) UI.toast(msg, 'ok');
        return r;
      } catch (e) {
        if (e instanceof root.Store.ReglaError) UI.toast(e.message, 'error');
        else { console.error(e); UI.toast('Ocurrió un error inesperado.', 'error'); }
        return null;
      }
    },

    toast(msg, tipo = 'info') {
      const estilos = { ok: ['check-circle-2', 'border-emerald-500/40 text-emerald-200'], error: ['alert-triangle', 'border-rose-500/40 text-rose-200'], info: ['info', 'border-cyan-500/40 text-cyan-200'] }[tipo];
      const t = document.createElement('div');
      t.className = `toast ${estilos[1]}`;
      t.setAttribute('role', 'status');
      t.innerHTML = `${UI.icono(estilos[0], 'w-4 h-4 shrink-0')}<span>${UI.esc(msg)}</span>`;
      document.getElementById('toasts').appendChild(t);
      UI.iconos();
      setTimeout(() => t.remove(), 4000);
    },

    /* ---------------- Comprobante (RF-11) ---------------- */
    verComprobante(comprobanteId) {
      const s = root.Store.state;
      const c = L.byId(s.comprobantes, Number(comprobanteId));
      const p = L.byId(s.personas, c.personaId);
      const filasDesc = c.descuentos.length
        ? c.descuentos.map((d) => `<div class="flex justify-between text-emerald-700"><span>${UI.esc(d.nombre)}</span><span class="font-mono">− ${UI.plata(d.monto)}</span></div>`).join('')
        : '<div class="flex justify-between text-slate-500"><span>Sin descuentos</span><span class="font-mono">$ 0</span></div>';
      document.getElementById('comprobante-hoja').innerHTML = `
        <div class="flex justify-between items-start border-b pb-3">
          <div><p class="font-extrabold text-base">AGMEN · A CONCIENCIA</p><p class="text-[10px] text-slate-500">Gimnasio & Running · Nueva Córdoba y Parque Sarmiento</p><p class="text-[10px] text-slate-400">@agmen.cba</p></div>
          <span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">PAGO APROBADO</span>
        </div>
        <div class="grid grid-cols-2 gap-3 py-3 border-b">
          <div><span class="text-slate-500 block">Socio</span><strong class="block">${UI.esc(L.nombreCompleto(p))}</strong><span class="text-slate-500">DNI ${p.dni}</span></div>
          <div class="text-right"><span class="text-slate-500 block">Comprobante N°</span><strong class="block font-mono">${c.numero}</strong><span class="text-slate-500">Emitido ${UI.fecha(c.fecha)}</span></div>
        </div>
        <div class="py-3 space-y-1.5 border-b">
          <div class="flex justify-between"><span>${UI.esc(c.planNombre)}</span><span class="font-mono">${UI.plata(c.base)}</span></div>
          ${filasDesc}
          <div class="flex justify-between font-extrabold text-sm pt-2 border-t"><span>Total abonado</span><span class="font-mono text-emerald-700">${UI.plata(c.total)}</span></div>
        </div>
        <div class="grid grid-cols-2 gap-3 py-3 text-[11px]">
          <div><span class="text-slate-500 block">Medio de pago</span><strong>${UI.esc(c.medio)}</strong></div>
          <div class="text-right"><span class="text-slate-500 block">Período de vigencia</span><strong>${UI.fecha(c.vigenciaDesde)} al ${UI.fecha(c.vigenciaHasta)}</strong></div>
        </div>
        <p class="text-[10px] text-slate-400">Comprobante guardado en el legajo digital del socio. Conservalo como constancia de pago.</p>
        <div class="no-print mt-5 pt-3 border-t flex justify-end gap-2">
          <button class="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold flex items-center gap-1.5" onclick="UI.imprimirComprobante()">${UI.icono('printer', 'w-3.5 h-3.5')} Imprimir / Guardar PDF</button>
          <button class="px-4 py-2 bg-slate-900 hover:bg-slate-700 text-white rounded-xl font-bold" onclick="document.getElementById('comprobante').classList.add('hidden')">Cerrar</button>
        </div>`;
      document.getElementById('comprobante').classList.remove('hidden');
      UI.iconos();
    },

    imprimirComprobante() {
      document.body.classList.add('imprimiendo-comprobante');
      window.print();
      document.body.classList.remove('imprimiendo-comprobante');
    },

    imprimirReporte() {
      document.body.classList.add('imprimiendo-reporte');
      window.print();
      document.body.classList.remove('imprimiendo-reporte');
    },

    descargarCSV(nombre, encabezados, filas) {
      const celda = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
      const csv = [encabezados, ...filas].map((f) => f.map(celda).join(';')).join('\n');
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = nombre;
      a.click();
      URL.revokeObjectURL(a.href);
    },

    infoISSD() {
      UI.modal({
        titulo: 'Proyecto académico — ISSD 2026',
        cuerpo: `<div class="space-y-1.5 text-slate-300">
          <p><strong>Institución:</strong> Instituto Superior Santo Domingo (ISSD)</p>
          <p><strong>Materia:</strong> Práctica Profesional I</p>
          <p><strong>Empresa relevada:</strong> AGMEN (Nueva Córdoba y Parque Sarmiento) · @agmen.cba</p>
          <p><strong>Integrantes:</strong> Máximo Bertinotti · Manuel García Badillo · Facundo Sanucci Picco</p>
          <p><strong>Docente:</strong> Roger Damián Martínez</p></div>`,
        pie: '<button class="btn-primary" onclick="UI.cerrarModal()">Cerrar</button>',
      });
    },

    /** Lista de socios para selects: "Apellido, Nombre · DNI". */
    opcionesPersonas(filtro) {
      return root.Store.state.personas.filter(filtro || (() => true))
        .sort((a, b) => a.apellido.localeCompare(b.apellido))
        .map((p) => ({ value: p.id, label: `${p.apellido}, ${p.nombre} · DNI ${p.dni}` }));
    },
    opcionesProfesionales(soloActivos = true) {
      return root.Store.state.profesionales.filter((p) => !soloActivos || p.activo).map((p) => ({ value: p.id, label: p.nombre }));
    },
    nombreProfesional(id) {
      const p = L.byId(root.Store.state.profesionales, id);
      return p ? p.nombre : '—';
    },
  };

  root.UI = UI;
  root.Vistas = root.Vistas || {};
})(window);
