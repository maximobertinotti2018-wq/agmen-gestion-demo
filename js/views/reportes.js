/**
 * Vista REPORTES — RF-21: ocupación de horarios, morosidad y cobranzas, asistencia y retención.
 * Filtros por rango de fechas, actividad y profesor.
 */
(function () {
  'use strict';
  const L = window.Logic;
  const S = () => window.Store.state;
  const St = () => window.Store;

  const V = {
    id: 'reportes', label: 'Reportes', icono: 'bar-chart-3',

    filtros() {
      const hoy = St().hoy();
      UI.filtros.rep = UI.filtros.rep || { desde: L.addDays(hoy, -29), hasta: hoy, actividadId: '', profesionalId: '' };
      return UI.filtros.rep;
    },

    render() {
      const f = V.filtros();
      const hoy = St().hoy();
      const oc = L.reporteOcupacion(S(), f);
      const mo = L.reporteMorosidad(S(), hoy, f);
      const as = L.reporteAsistencia(S(), hoy, f);
      const set = (k) => `onchange="Vistas.reportes.filtros()['${k}']=this.value;UI.renderVista()"`;
      const kpi = (titulo, valor, detalle, color = 'text-white') => `<div class="card p-4"><p class="text-[11px] text-slate-400">${titulo}</p><p class="text-2xl font-extrabold ${color}">${valor}</p><p class="text-[11px] text-slate-500">${detalle}</p></div>`;
      const barra = (pct, color = '#06b6d4') => `<div class="barra"><i style="width:${Math.min(pct, 100)}%;background:${color}"></i></div>`;

      return `${UI.encabezado('Reportes gerenciales', 'Información para la toma de decisiones de directores y coordinadores.', `<button class="btn-ghost" onclick="UI.imprimirReporte()">${UI.icono('printer')} Imprimir</button>`)}
        <div class="card p-4 mb-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 no-print">
          <label class="campo"><span>Desde</span><input type="date" class="input" value="${f.desde}" max="${f.hasta}" ${set('desde')}></label>
          <label class="campo"><span>Hasta</span><input type="date" class="input" value="${f.hasta}" min="${f.desde}" ${set('hasta')}></label>
          <label class="campo"><span>Actividad</span><select class="input" ${set('actividadId')}><option value="">Todas</option>${UI.opciones(S().actividades.map((a) => ({ value: a.id, label: a.nombre })), f.actividadId)}</select></label>
          <label class="campo"><span>Profesor</span><select class="input" ${set('profesionalId')}><option value="">Todos</option>${UI.opciones(UI.opcionesProfesionales(false), f.profesionalId)}</select></label>
        </div>
        <p class="text-[11px] text-slate-500 mb-4">Período: ${UI.fecha(f.desde)} al ${UI.fecha(f.hasta)}${f.actividadId ? ` · ${UI.esc(L.byId(S().actividades, f.actividadId).nombre)}` : ''}${f.profesionalId ? ` · ${UI.esc(UI.nombreProfesional(f.profesionalId))}` : ''}</p>

        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          ${kpi('Ocupación de cupos', `${oc.total.porcentaje}%`, `${oc.total.ocupados} de ${oc.total.cupos} cupos (gimnasio)`, 'text-cyan-300')}
          ${kpi('Presentismo', `${as.presentismo}%`, `${as.presentes} de ${as.esperadas} clases esperadas`, 'text-emerald-300')}
          ${kpi('Conversión días de prueba', `${as.conversion}%`, `${as.pruebasConvertidas} de ${as.pruebasRealizadas} pruebas realizadas`)}
          ${kpi('Deuda acumulada', UI.plata(mo.deudaTotal), `${mo.morosos.length} socio(s) con cuotas vencidas`, 'text-rose-300')}
        </div>

        <section class="card p-5 mb-5">
          <p class="font-bold text-sm mb-1">1 · Tasa de ocupación de horarios</p>
          <p class="text-[11px] text-slate-500 mb-4">Cupos utilizados vs. disponibles. Running no tiene límite de cupo, por eso se informa solo la cantidad de inscriptos.</p>
          <div class="grid lg:grid-cols-2 gap-5">
            <div><p class="text-xs font-bold text-slate-400 mb-2">Por franja horaria</p>
              ${oc.porFranja.map((r) => `<div class="grid grid-cols-[6.5rem_1fr_5.5rem] items-center gap-3 py-1 text-xs"><span class="font-mono">${r.clave}</span>${barra(r.porcentaje, r.porcentaje >= 80 ? '#f43f5e' : '#06b6d4')}<span class="text-right font-mono">${r.ocupados}/${r.cupos} · ${r.porcentaje}%</span></div>`).join('') || '<p class="text-xs text-slate-500">Sin turnos con cupo para el filtro elegido.</p>'}</div>
            <div><p class="text-xs font-bold text-slate-400 mb-2">Por entrenador</p>
              ${oc.porProfesional.map((r) => `<div class="grid grid-cols-[8rem_1fr_5.5rem] items-center gap-3 py-1 text-xs"><span>${UI.esc(UI.nombreProfesional(r.clave))}</span>${barra(r.porcentaje)}<span class="text-right font-mono">${r.ocupados}/${r.cupos} · ${r.porcentaje}%</span></div>`).join('')}
              ${oc.filas.filter((r) => r.cupo == null).map((r) => `<div class="grid grid-cols-[8rem_1fr_5.5rem] items-center gap-3 py-1 text-xs"><span>${UI.esc(UI.nombreProfesional(r.turno.profesionalId))}</span><span class="text-cyan-300">Running ${r.turno.dia} ${r.turno.desde}</span><span class="text-right font-mono">${r.ocupados} insc.</span></div>`).join('')}</div>
          </div>
        </section>

        <section class="card p-5 mb-5">
          <div class="flex flex-wrap justify-between gap-2 mb-3"><div><p class="font-bold text-sm">2 · Morosidad y estado de cobranzas</p><p class="text-[11px] text-slate-500">Socios con cuotas vencidas a hoy e ingresos percibidos en el período.</p></div>
            <button class="btn-ghost btn-sm no-print" onclick="Vistas.reportes.exportarMorosos()">${UI.icono('download', 'w-3.5 h-3.5')} Listado CSV</button></div>
          <div class="grid lg:grid-cols-3 gap-5">
            <div class="lg:col-span-2">${UI.tabla([{ t: 'Socio' }, { t: 'Plan' }, { t: 'Venció' }, { t: 'Días de atraso', cls: 'text-right' }, { t: 'Cuotas', cls: 'text-right' }, { t: 'Deuda', cls: 'text-right' }], mo.morosos.map((r) => [
              `<strong>${UI.esc(L.nombreCompleto(r.persona))}</strong><span class="block text-[11px] text-slate-500">${UI.esc(r.persona.telefono)}</span>`, UI.esc(r.plan.nombre),
              r.cuenta.vencimiento ? UI.fecha(r.cuenta.vencimiento) : 'Sin pagos', `<span class="font-mono">${r.cuenta.diasAtraso}</span>`, `<span class="font-mono">${r.cuenta.cuotasAdeudadas}</span>`, `<strong class="font-mono text-rose-300">${UI.plata(r.cuenta.deuda)}</strong>`,
            ]), 'No hay socios morosos.')}</div>
            <div><p class="text-xs font-bold text-slate-400 mb-2">Ingresos por tipo de plan · ${UI.plata(mo.ingresosTotal)}</p>
              ${mo.ingresosPorPlan.map((r) => `<div class="py-1.5"><div class="flex justify-between text-xs mb-1"><span>${UI.esc(L.byId(S().planes, r.planId).nombre)}</span><span class="font-mono">${UI.plata(r.total)}</span></div>${barra(mo.ingresosTotal ? (r.total / mo.ingresosTotal) * 100 : 0, '#34d399')}<p class="text-[10px] text-slate-500 mt-0.5">${r.cantidad} cobro(s)</p></div>`).join('') || '<p class="text-xs text-slate-500">Sin cobros en el período.</p>'}</div>
          </div>
        </section>

        <section class="card p-5">
          <p class="font-bold text-sm mb-1">3 · Asistencia y retención de alumnos</p>
          <p class="text-[11px] text-slate-500 mb-4">Presentismo sobre los turnos fijos asignados, conversión de días de prueba y altas/bajas del período.</p>
          <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div class="card-sub p-4"><p class="text-[11px] text-slate-400">Presentismo vs. ausentismo</p><p class="text-lg font-bold"><span class="text-emerald-300">${as.presentismo}%</span> / <span class="text-rose-300">${as.ausentismo}%</span></p>${barra(as.presentismo, '#34d399')}<p class="text-[10px] text-slate-500 mt-1">${as.ausentes} ausencias en ${as.esperadas} clases</p></div>
            <div class="card-sub p-4"><p class="text-[11px] text-slate-400">Días de prueba</p><p class="text-lg font-bold">${as.pruebas} agendados</p><p class="text-[10px] text-slate-500">${as.pruebasRealizadas} realizados · ${as.pruebasConvertidas} convertidos en socios (${as.conversion}%)</p></div>
            <div class="card-sub p-4"><p class="text-[11px] text-slate-400">Retención del período</p><p class="text-lg font-bold text-cyan-300">${as.retencion}%</p><p class="text-[10px] text-slate-500">de ${as.activosAlInicio} socios activos al inicio</p></div>
            <div class="card-sub p-4"><p class="text-[11px] text-slate-400">Altas y bajas</p><p class="text-lg font-bold"><span class="text-emerald-300">+${as.altas}</span> / <span class="text-rose-300">−${as.bajas}</span></p><p class="text-[10px] text-slate-500">nuevos socios / bajas registradas</p></div>
          </div>
        </section>`;
    },

    exportarMorosos() {
      const mo = L.reporteMorosidad(S(), St().hoy(), V.filtros());
      UI.descargarCSV(`morosos-${St().hoy()}.csv`, ['DNI', 'Socio', 'Teléfono', 'Plan', 'Vencimiento', 'Días de atraso', 'Cuotas adeudadas', 'Deuda'],
        mo.morosos.map((r) => [r.persona.dni, L.nombreCompleto(r.persona), r.persona.telefono, r.plan.nombre, r.cuenta.vencimiento || 'Sin pagos', r.cuenta.diasAtraso, r.cuenta.cuotasAdeudadas, r.cuenta.deuda]));
    },
  };

  window.Vistas.reportes = V;
  UI.registrar(V);
})();
