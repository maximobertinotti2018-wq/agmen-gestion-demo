/**
 * PORTAL DEL SOCIO — cada alumno ve SUS datos reales: membresía, turnos, rutina, pagos, asistencias y tienda.
 */
(function () {
  'use strict';
  const L = window.Logic;
  const S = () => window.Store.state;
  const St = () => window.Store;

  const P = {
    tab: 'inicio',
    hechos: {},

    persona() { return St().persona(S().sesion.personaId); },

    render() {
      const p = P.persona();
      const tabs = [['inicio', 'home', 'Inicio'], ['rutina', 'dumbbell', 'Mi rutina'], ['asistencias', 'calendar-check', 'Mis asistencias'], ['pagos', 'receipt', 'Mis pagos'], ['tienda', 'shopping-bag', 'Tienda']];
      document.getElementById('pantalla-portal').innerHTML = `
        <header class="border-b border-slate-800 bg-slate-950/90 sticky top-0 z-30 backdrop-blur">
          <div class="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
            <img src="assets/agmen_logo_oficial.png" alt="AGMEN" class="w-9 h-9 rounded-full">
            <div class="min-w-0"><p class="text-[11px] text-slate-400">Portal del socio</p><p class="font-extrabold truncate">${UI.esc(L.nombreCompleto(p))}</p></div>
            <button class="btn-ghost text-xs ml-auto" onclick="App.logout()">${UI.icono('log-out')} Salir</button>
          </div>
          <nav class="max-w-4xl mx-auto px-4 pb-2 flex gap-1 overflow-x-auto text-xs font-semibold">${tabs.map(([id, ic, t]) => `<button class="nav-item ${P.tab === id ? 'activo' : ''}" onclick="Vistas.portal.ir('${id}')">${UI.icono(ic)}${t}</button>`).join('')}</nav>
        </header>
        <main class="max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-5">${P[P.tab](p)}</main>`;
      UI.iconos();
    },

    ir(tab) { P.tab = tab; P.render(); },

    inicio(p) {
      const hoy = St().hoy();
      const cuenta = L.estadoCuenta(p, S(), hoy);
      const plan = L.byId(S().planes, p.planId);
      const color = { al_dia: 'border-emerald-500/40 bg-emerald-950/20', proximo: 'border-amber-500/40 bg-amber-950/20', vencido: 'border-rose-500/40 bg-rose-950/20', sin_pago: 'border-amber-500/40 bg-amber-950/20' }[cuenta.codigo];
      const turnos = p.turnosFijos.map((id) => L.byId(S().turnos, id)).sort((a, b) => L.DIAS.indexOf(a.dia) - L.DIAS.indexOf(b.dia));
      const hoyTurnos = L.turnosDeHoy(p, S(), hoy);
      const recuperos = S().reprogramaciones.filter((r) => r.personaId === p.id && r.tipo === 'Recupero' && r.fechaDestino >= hoy);
      return `<div class="rounded-2xl border ${color} p-5">
          <p class="text-[11px] text-slate-400">Mi membresía · ${UI.esc(plan ? plan.nombre : '—')}</p>
          <div class="flex flex-wrap items-center gap-3 mt-1"><p class="text-2xl font-extrabold">${UI.esc(cuenta.etiqueta)}</p>${UI.badgeCuenta(cuenta)}</div>
          <p class="text-xs text-slate-300 mt-1">${cuenta.vencimiento ? `Vigente hasta el <strong>${UI.fecha(cuenta.vencimiento)}</strong>` : 'Todavía no registramos tu primer pago'}${cuenta.deuda ? ` · Saldo a abonar: <strong class="text-rose-300">${UI.plata(cuenta.deuda)}</strong> en recepción` : ''}</p>
        </div>
        <div class="grid sm:grid-cols-2 gap-5">
          <div class="card p-5"><p class="font-bold text-sm mb-3">Hoy · ${L.diaSemana(hoy)} ${UI.fecha(hoy)}</p>
            ${hoyTurnos.length ? hoyTurnos.map((t) => `<div class="card-sub p-3 mb-2"><p class="font-bold font-mono">${t.desde} – ${t.hasta}</p><p class="text-[11px] text-slate-400">${UI.esc(L.byId(S().actividades, t.actividadId).nombre)} · ${UI.esc(UI.nombreProfesional(t.profesionalId))}</p></div>`).join('') : '<p class="text-xs text-slate-500">Hoy no tenés turno asignado.</p>'}</div>
          <div class="card p-5"><p class="font-bold text-sm mb-3">Mis turnos fijos</p>
            ${turnos.length ? turnos.map((t) => `<div class="flex justify-between py-1.5 border-b border-slate-800 last:border-0 text-xs"><span>${t.dia}</span><span class="font-mono">${t.desde}–${t.hasta}</span><span class="text-slate-400">${UI.esc(L.byId(S().actividades, t.actividadId).nombreCorto)}</span></div>`).join('') : '<p class="text-xs text-slate-500">Todavía no tenés turnos asignados. Consultá en recepción.</p>'}
            ${recuperos.map((r) => `<p class="text-[11px] text-cyan-300 mt-2">Recupero: ${UI.fecha(r.fechaDestino)} ${L.byId(S().turnos, r.turnoDestinoId).desde} hs</p>`).join('')}
            <p class="text-[11px] text-slate-500 mt-3">Para cambiar un día u horario, pedilo en recepción (sujeto a cupo).</p></div>
        </div>`;
    },

    rutina(p) {
      if (!p.rutina.sesiones.length) return '<div class="card p-6 text-center text-xs text-slate-500">Tu rutina todavía no está cargada. Pedila en recepción.</div>';
      const total = p.rutina.sesiones.reduce((s, x) => s + x.ejercicios.length, 0);
      const hechos = Object.values(P.hechos).filter(Boolean).length;
      return `<p class="text-[11px] text-slate-500">La rutina la arma y la modifica el gimnasio. Marcá los ejercicios a medida que los hacés.</p>
        ${p.rutina.observacionFms ?`<div class="card p-4 text-xs text-cyan-200">${UI.icono('info', 'w-4 h-4 inline')} ${UI.esc(p.rutina.observacionFms)}</div>` : ''}
        <div class="card p-4 flex items-center gap-3"><div class="barra flex-1"><i style="width:${Math.round((hechos / total) * 100)}%;background:#06b6d4"></i></div><span class="text-xs font-mono">${hechos}/${total} hechos</span></div>
        ${p.rutina.sesiones.map((s, i) => `<div class="card p-5"><p class="font-bold mb-3">${UI.esc(s.nombre)}</p><div class="space-y-2">
          ${s.ejercicios.map((e, j) => {
            const k = `${i}-${j}`;
            return `<label class="check ${P.hechos[k] ? 'border-emerald-500/40 bg-emerald-950/20' : ''}"><input type="checkbox" ${P.hechos[k] ? 'checked' : ''} onchange="Vistas.portal.hechos['${k}']=this.checked;Vistas.portal.render()">
              <span class="flex-1"><strong>${UI.esc(e.ejercicio)}</strong><span class="block text-[11px] text-slate-400">${e.series} × ${UI.esc(e.reps)} · ${UI.esc(e.carga)} · pausa ${UI.esc(e.pausa)}</span></span></label>`;
          }).join('')}</div></div>`).join('')}`;
    },

    asistencias(p) {
      const hoy = St().hoy();
      const desde = L.addDays(hoy, -27);
      const lista = S().asistencias.filter((a) => a.personaId === p.id).sort((a, b) => b.fecha.localeCompare(a.fecha));
      const rep = L.reporteAsistencia({ ...S(), personas: [p] }, hoy, { desde, hasta: hoy });
      const mes = hoy.slice(0, 7);
      const esteMes = lista.filter((a) => a.fecha.startsWith(mes)).length;
      const completas = lista.filter((a) => a.cumplimiento === 'Completa').length;
      return `<div class="grid grid-cols-3 gap-3">
          <div class="card p-4"><p class="text-[11px] text-slate-400">Este mes</p><p class="text-2xl font-extrabold">${esteMes}</p><p class="text-[11px] text-slate-500">asistencias</p></div>
          <div class="card p-4"><p class="text-[11px] text-slate-400">Presentismo 4 semanas</p><p class="text-2xl font-extrabold text-emerald-300">${rep.presentismo}%</p><p class="text-[11px] text-slate-500">${rep.presentes} de ${rep.esperadas} clases</p></div>
          <div class="card p-4"><p class="text-[11px] text-slate-400">Sesiones completas</p><p class="text-2xl font-extrabold text-cyan-300">${lista.length ? Math.round((completas / lista.length) * 100) : 0}%</p><p class="text-[11px] text-slate-500">${completas} de ${lista.length}</p></div>
        </div>
        <div class="card p-5"><p class="font-bold text-sm mb-3">Historial</p>
          ${UI.tabla([{ t: 'Fecha' }, { t: 'Turno' }, { t: 'Ingreso' }, { t: 'Salida' }, { t: 'Cumplimiento' }], lista.slice(0, 30).map((a) => {
            const t = L.byId(S().turnos, a.turnoId);
            return [`${UI.fecha(a.fecha)} <span class="text-[11px] text-slate-500">${L.diaSemana(a.fecha)}</span>`, t ? UI.esc(L.byId(S().actividades, t.actividadId).nombreCorto) : '—', a.horaIngreso, a.horaSalida || '—',
              a.cumplimiento ? UI.badge(a.cumplimiento, { Completa: 'ok', Parcial: 'alerta', 'No realizada': 'error' }[a.cumplimiento]) : UI.badge('En curso', 'info')];
          }), 'Todavía no registramos asistencias.')}</div>`;
    },

    pagos(p) {
      const comps = S().comprobantes.filter((c) => c.personaId === p.id).sort((a, b) => b.id - a.id);
      return `<div class="card p-5"><p class="font-bold text-sm mb-3">Mis comprobantes de pago</p>
        ${UI.tabla([{ t: 'N°' }, { t: 'Fecha' }, { t: 'Período' }, { t: 'Medio' }, { t: 'Total' }, { t: '' }], comps.map((c) => [`<span class="font-mono">${c.numero}</span>`, UI.fecha(c.fecha), `${UI.fecha(c.vigenciaDesde)} → ${UI.fecha(c.vigenciaHasta)}`, UI.esc(c.medio), UI.plata(c.total),
          `<button class="btn-ghost btn-sm" onclick="UI.verComprobante(${c.id})">${UI.icono('file-down', 'w-3.5 h-3.5')} PDF</button>`]), 'Todavía no tenés pagos registrados.')}</div>`;
    },

    tienda(p) {
      const cat = P.cat || 'Todos';
      const items = S().inventario.filter((i) => i.activo && i.tipo === 'Comercial');
      const cats = ['Todos', ...new Set(items.map((i) => i.categoria))];
      const pedidos = S().ventas.filter((v) => v.personaId === p.id).sort((a, b) => b.id - a.id).slice(0, 10);
      return `<div class="flex gap-1 flex-wrap">${cats.map((c) => `<button class="nav-item ${c === cat ? 'activo' : ''}" onclick="Vistas.portal.cat='${c}';Vistas.portal.render()">${c}</button>`).join('')}</div>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">${items.filter((i) => cat === 'Todos' || i.categoria === cat).map((i) => `<div class="card p-4 flex flex-col">
          <p class="text-[10px] uppercase text-slate-500 font-bold">${UI.esc(i.categoria)}</p><p class="font-bold mt-0.5">${UI.esc(i.nombre)}</p>
          <p class="text-lg font-extrabold text-cyan-300 mt-2">${UI.plata(i.precio)}</p>
          <p class="text-[11px] ${i.stock ? 'text-slate-500' : 'text-rose-300'}">${i.stock ? `${i.stock} disponibles` : 'Sin stock'}</p>
          <button class="btn-primary mt-3 justify-center" ${i.stock ? '' : 'disabled'} onclick="Vistas.portal.pedir(${i.id})">${UI.icono('shopping-cart')} Pedir y retirar en recepción</button></div>`).join('')}</div>
        <div class="card p-5"><p class="font-bold text-sm mb-3">Mis pedidos</p>
          ${UI.tabla([{ t: 'Fecha' }, { t: 'Producto' }, { t: 'Cant.' }, { t: 'Total' }, { t: 'Estado' }], pedidos.map((v) => [UI.fecha(v.fecha), UI.esc(L.byId(S().inventario, v.itemId).nombre), v.cantidad, UI.plata(v.total), UI.badge(v.estado, v.estado === 'Entregado' ? 'ok' : 'alerta')]), 'Todavía no hiciste pedidos.')}</div>`;
    },

    pedir(itemId) {
      const r = UI.ejecutar(() => St().venderItem(itemId, 1, S().sesion.personaId, 'A pagar en recepción', 'Pendiente de entrega'), 'Pedido realizado: retiralo y abonalo en recepción.');
      if (r) P.render();
    },
  };

  window.Vistas.portal = P;
})();
