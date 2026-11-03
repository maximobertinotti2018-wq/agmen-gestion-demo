/**
 * Vista CAJA Y CUOTAS — RF-05 (actividades y planes), RF-06 (descuentos), RF-10 (cobro), RF-11 (comprobantes),
 * RF-12 (vigencia y alertas de vencimiento). También registra las ventas del mostrador.
 */
(function () {
  'use strict';
  const L = window.Logic;
  const S = () => window.Store.state;
  const St = () => window.Store;

  const V = {
    id: 'caja', label: 'Caja y cuotas', icono: 'wallet',

    render() {
      const tab = UI.pestana('caja', 'cuotas');
      const acciones = `<button class="btn-ghost" onclick="Vistas.caja.formVenta()">${UI.icono('shopping-bag')} Venta de mostrador</button>
        <button class="btn-primary" onclick="Vistas.caja.cobrar()">${UI.icono('banknote')} Cobrar cuota</button>`;
      return UI.encabezado('Caja y cuotas', 'Cobros mensuales, comprobantes, vencimientos y tarifario vigente.', acciones) +
        UI.tabsHTML('caja', [
          { id: 'cuotas', label: 'Estado de cuotas (RF-10)' },
          { id: 'movimientos', label: 'Movimientos de caja' },
          { id: 'comprobantes', label: 'Comprobantes (RF-11)' },
          { id: 'vencimientos', label: 'Vencimientos (RF-12)' },
          { id: 'planes', label: 'Planes y actividades (RF-05)' },
          { id: 'descuentos', label: 'Descuentos (RF-06)' },
        ], 'cuotas') +
        ({ cuotas: V.renderCuotas, movimientos: V.renderMovimientos, comprobantes: V.renderComprobantes, vencimientos: V.renderVencimientos, planes: V.renderPlanes, descuentos: V.renderDescuentos }[tab])();
    },

    despues() {
      const tab = UI.pestana('caja', 'cuotas');
      if (tab === 'cuotas') V.pintarCuotas();
      if (tab === 'comprobantes') V.pintarComprobantes();
    },

    /* ---------------- Estado de cuotas ---------------- */
    renderCuotas() {
      const filtros = [['todos', 'Todos'], ['al_dia', 'Al día'], ['proximo', 'Próximos a vencer'], ['vencido', 'Vencidos'], ['sin_pago', 'Primera cuota']];
      const actual = UI.filtros.cuota || 'todos';
      return `<div class="card p-5">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div class="flex gap-1 flex-wrap">${filtros.map(([k, t]) => `<button class="nav-item ${actual === k ? 'activo' : ''}" onclick="UI.filtros.cuota='${k}';UI.renderVista()">${t}</button>`).join('')}</div>
          ${UI.buscador('cuotas', 'Buscar socio por nombre o DNI', 'Vistas.caja.pintarCuotas()')}
        </div><div id="tabla-cuotas"></div></div>`;
    },

    pintarCuotas() {
      const hoy = St().hoy();
      const filtro = UI.filtros.cuota || 'todos';
      const filas = L.buscarPersonas(S().personas, UI.filtros.cuotas || '', ['Socio Activo'])
        .map((p) => ({ p, cuenta: L.estadoCuenta(p, S(), hoy), plan: L.byId(S().planes, p.planId) }))
        .filter((r) => filtro === 'todos' || r.cuenta.codigo === filtro)
        .sort((a, b) => b.cuenta.diasAtraso - a.cuenta.diasAtraso || a.p.apellido.localeCompare(b.p.apellido))
        .map(({ p, cuenta, plan }) => {
          const cuota = L.liquidar(p, plan, S());
          const ultimo = S().comprobantes.filter((c) => c.personaId === p.id).sort((a, b) => b.id - a.id)[0];
          return [
            `<strong>${UI.esc(L.nombreCompleto(p))}</strong><span class="block text-[11px] text-slate-500 font-mono">DNI ${p.dni}</span>`,
            `${UI.esc(plan.nombre)}<span class="block text-[11px] text-slate-500">Cuota ${UI.plata(cuota.total)}${cuota.items.length ? ` (con ${cuota.items.length} desc.)` : ''}</span>`,
            cuenta.vencimiento ? UI.fecha(cuenta.vencimiento) : '<span class="text-slate-500">—</span>',
            UI.badgeCuenta(cuenta),
            cuenta.deuda ? `<strong class="text-rose-300">${UI.plata(cuenta.deuda)}</strong><span class="block text-[11px] text-slate-500">${cuenta.cuotasAdeudadas} cuota(s)${cuenta.diasAtraso ? ` · ${cuenta.diasAtraso} días de atraso` : ''}</span>` : '<span class="text-slate-500">$ 0</span>',
            `<div class="flex gap-1 justify-end">${ultimo ? `<button class="btn-icon" title="Último comprobante" onclick="UI.verComprobante(${ultimo.id})">${UI.icono('file-text', 'w-3.5 h-3.5')}</button>` : ''}
              <button class="btn-primary btn-sm" onclick="Vistas.caja.cobrar(${p.id})">${UI.icono('banknote', 'w-3.5 h-3.5')} Cobrar</button></div>`,
          ];
        });
      document.getElementById('tabla-cuotas').innerHTML = UI.tabla([{ t: 'Socio' }, { t: 'Plan' }, { t: 'Vence' }, { t: 'Estado' }, { t: 'Deuda' }, { t: '', cls: 'text-right' }], filas, 'No hay socios con ese filtro.');
      UI.iconos();
    },

    /** RF-10: liquidación con descuentos automáticos, medio de pago y estado de la transacción. */
    cobrar(personaId) {
      const manuales = S().descuentos.filter((d) => d.activo && d.aplicaA === 'Manual');
      UI.form({
        titulo: 'Cobrar cuota mensual', subtitulo: 'Los descuentos de grupo familiar y combinación se aplican solos', ancho: 'medio',
        valores: { personaId: personaId || '', medio: 'Efectivo', estado: 'Aprobado' }, enviar: 'Registrar cobro',
        campos: [
          { name: 'personaId', label: 'Socio', type: 'select', options: UI.opcionesPersonas((p) => p.estado === 'Socio Activo'), required: true, full: true, vacio: 'Elegí un socio…' },
          { name: 'medio', label: 'Medio de pago', type: 'select', options: L.MEDIOS_PAGO, required: true },
          { name: 'estado', label: 'Estado de la transacción', type: 'select', options: L.ESTADOS_TRANSACCION, required: true, ayuda: 'Pendiente: transferencia sin acreditar. Rechazado: tarjeta denegada.' },
          ...(manuales.length ? [{ name: 'descuentosManuales', label: 'Descuentos opcionales', type: 'checks', options: manuales.map((d) => ({ value: d.id, label: `${UI.esc(d.nombre)} (${d.tipo === 'Porcentaje' ? `${d.valor}%` : UI.plata(d.valor)})` })) }] : []),
        ],
        preview: (v) => {
          const enviar = document.querySelector('#form-modal button[type=submit]');
          if (!v.personaId) { enviar.disabled = false; return ''; }
          const pr = St().previsualizarCobro(v.personaId, v.descuentosManuales);
          const { liquidacion: liq, periodo, cuenta } = pr;
          // Un pago pendiente se resuelve acá mismo: así nunca se cobra dos veces el mismo período.
          const pendiente = S().cobros.find((c) => c.personaId === pr.persona.id && c.estado === 'Pendiente');
          enviar.disabled = !!pendiente;
          if (pendiente) {
            return `<div class="rounded-xl border border-amber-500/40 bg-amber-950/20 p-4 space-y-3" id="cobro-pendiente">
              <p class="font-bold text-amber-200 flex items-center gap-2">${UI.icono('hourglass')} Tiene un pago pendiente de confirmar</p>
              <p class="text-[11px] text-amber-100/90">${UI.esc(pendiente.medio)} por <strong>${UI.plata(pendiente.total)}</strong> registrado el ${UI.fecha(pendiente.fecha)}. Confirmá si se acreditó antes de cobrar otra cuota.</p>
              <div class="flex flex-wrap gap-2">
                <button type="button" class="btn-ok" onclick="Vistas.caja.resolverDesdeCobro(${pendiente.id},'Aprobado')">${UI.icono('check')} Se acreditó: aprobar</button>
                <button type="button" class="btn-danger" onclick="Vistas.caja.resolverDesdeCobro(${pendiente.id},'Rechazado')">${UI.icono('x')} No llegó: rechazar</button>
              </div></div>`;
          }
          return `<div class="card-sub p-4 space-y-1.5">
            <div class="flex justify-between"><span>${UI.esc(pr.plan.nombre)}</span><span class="font-mono">${UI.plata(liq.base)}</span></div>
            ${liq.items.map((i) => `<div class="flex justify-between text-emerald-300"><span>${UI.esc(i.nombre)}</span><span class="font-mono">− ${UI.plata(i.monto)}</span></div>`).join('')}
            <div class="flex justify-between font-extrabold text-sm border-t border-slate-800 pt-2"><span>Total a cobrar</span><span class="font-mono text-cyan-300">${UI.plata(liq.total)}</span></div>
            <p class="text-[11px] text-slate-400">Período que cubre: <strong class="text-slate-200">${UI.fecha(periodo.desde)} al ${UI.fecha(periodo.hasta)}</strong></p>
            <p class="text-[11px]">Estado actual: ${UI.badgeCuenta(cuenta)}${cuenta.cuotasAdeudadas > 1 ? ` <span class="text-amber-300">Debe ${cuenta.cuotasAdeudadas} cuotas: este cobro cancela la más antigua.</span>` : ''}</p>
            ${v.estado !== 'Aprobado' ? `<p class="text-[11px] text-amber-300">Con estado "${v.estado}" no se emite comprobante ni se extiende la vigencia.</p>` : ''}
          </div>`;
        },
        onSubmit: (v) => {
          const { cobro, comprobante } = St().registrarCobro(v);
          const p = St().persona(cobro.personaId);
          if (comprobante) setTimeout(() => UI.verComprobante(comprobante.id), 0);
          return `Cobro ${cobro.estado.toLowerCase()}: ${L.nombreCompleto(p)} · ${UI.plata(cobro.total)}`;
        },
      });
    },

    /** Aprueba o rechaza el pago pendiente sin cerrar el formulario y recalcula la liquidación. */
    resolverDesdeCobro(cobroId, estado) {
      const r = UI.ejecutar(() => St().resolverCobro(cobroId, estado),
        estado === 'Aprobado' ? 'Pago aprobado: se emitió su comprobante y se actualizó la vigencia.' : 'Pago rechazado. Ya podés registrar el cobro.');
      const form = document.getElementById('form-modal');
      if (r && form) form.dispatchEvent(new Event('change'));
    },

    /* ---------------- Movimientos del día ---------------- */
    renderMovimientos() {
      const fecha = UI.filtros.fechaCaja || St().hoy();
      const cobros = S().cobros.filter((c) => c.fecha === fecha);
      const ventas = S().ventas.filter((v) => v.fecha === fecha && v.estado === 'Entregado');
      const pendientes = S().cobros.filter((c) => c.estado === 'Pendiente');
      const porMedio = {};
      L.MEDIOS_PAGO.forEach((m) => { porMedio[m] = 0; });
      cobros.filter((c) => c.estado === 'Aprobado').forEach((c) => { porMedio[c.medio] += c.total; });
      ventas.forEach((v) => { porMedio[v.medio] = (porMedio[v.medio] || 0) + v.total; });
      const totalCuotas = cobros.filter((c) => c.estado === 'Aprobado').reduce((s, c) => s + c.total, 0);
      const totalVentas = ventas.reduce((s, v) => s + v.total, 0);

      const movimientos = [
        ...cobros.map((c) => ({ hora: c.hora || '—', tipo: 'Cuota', detalle: `${L.nombreCompleto(St().persona(c.personaId))} · ${L.byId(S().planes, c.planId).nombre}`, medio: c.medio, total: c.total, estado: c.estado, cobro: c })),
        ...ventas.map((v) => ({ hora: v.hora || '—', tipo: 'Venta', detalle: `${v.cantidad} × ${L.byId(S().inventario, v.itemId).nombre}${v.personaId ? ` · ${L.nombreCompleto(St().persona(v.personaId))}` : ''}`, medio: v.medio, total: v.total, estado: 'Aprobado' })),
      ].sort((a, b) => String(b.hora).localeCompare(String(a.hora)));

      const tipoEstado = { Aprobado: 'ok', Pendiente: 'alerta', Rechazado: 'error' };
      return `<div class="flex flex-wrap items-center gap-3 mb-4">
          <label class="text-xs text-slate-400 flex items-center gap-2">Fecha <input type="date" class="input w-auto" value="${fecha}" max="${St().hoy()}" onchange="UI.filtros.fechaCaja=this.value;UI.renderVista()"></label>
        </div>
        <div class="grid sm:grid-cols-3 gap-3 mb-5">
          <div class="card p-4"><p class="text-[11px] text-slate-400">Total del día</p><p class="text-2xl font-extrabold text-emerald-300">${UI.plata(totalCuotas + totalVentas)}</p></div>
          <div class="card p-4"><p class="text-[11px] text-slate-400">Cuotas cobradas</p><p class="text-xl font-bold">${UI.plata(totalCuotas)}</p><p class="text-[11px] text-slate-500">${cobros.filter((c) => c.estado === 'Aprobado').length} cobro(s)</p></div>
          <div class="card p-4"><p class="text-[11px] text-slate-400">Ventas de mostrador</p><p class="text-xl font-bold">${UI.plata(totalVentas)}</p><p class="text-[11px] text-slate-500">${ventas.length} venta(s)</p></div>
        </div>
        <div class="grid lg:grid-cols-3 gap-5">
          <div class="card p-5 lg:col-span-2"><p class="font-bold text-sm mb-3">Movimientos</p>
            ${UI.tabla([{ t: 'Hora' }, { t: 'Tipo' }, { t: 'Detalle' }, { t: 'Medio' }, { t: 'Estado' }, { t: 'Importe', cls: 'text-right' }, { t: '' }], movimientos.map((m) => [
              `<span class="font-mono">${m.hora}</span>`, UI.badge(m.tipo, m.tipo === 'Cuota' ? 'info' : 'neutro'), UI.esc(m.detalle), UI.esc(m.medio), UI.badge(m.estado, tipoEstado[m.estado]),
              `<span class="font-mono ${m.estado === 'Aprobado' ? '' : 'line-through text-slate-500'}">${UI.plata(m.total)}</span>`,
              m.cobro && m.cobro.comprobanteId ? `<button class="btn-icon" title="Ver comprobante" onclick="UI.verComprobante(${m.cobro.comprobanteId})">${UI.icono('file-text', 'w-3.5 h-3.5')}</button>` : '',
            ]), 'No hubo movimientos en esta fecha.')}</div>
          <div class="space-y-5">
            <div class="card p-5"><p class="font-bold text-sm mb-3">Por medio de pago</p>
              ${Object.entries(porMedio).map(([m, t]) => `<div class="flex justify-between py-1.5 border-b border-slate-800 last:border-0"><span class="text-slate-400">${m}</span><span class="font-mono">${UI.plata(t)}</span></div>`).join('')}</div>
            <div class="card p-5"><p class="font-bold text-sm mb-1">Cobros pendientes de confirmar</p><p class="text-[11px] text-slate-500 mb-3">Transferencias sin acreditar, de cualquier fecha</p>
              ${pendientes.length ? pendientes.map((c) => `<div class="card-sub p-3 mb-2">
                <p class="font-semibold">${UI.esc(L.nombreCompleto(St().persona(c.personaId)))} · ${UI.plata(c.total)}</p><p class="text-[11px] text-slate-500">${UI.fecha(c.fecha)} · ${UI.esc(c.medio)}</p>
                <div class="flex gap-1.5 mt-2"><button class="btn-ok btn-sm" onclick="Vistas.caja.resolver(${c.id},'Aprobado')">Aprobar</button><button class="btn-danger btn-sm" onclick="Vistas.caja.resolver(${c.id},'Rechazado')">Rechazar</button></div></div>`).join('') : '<p class="text-xs text-slate-500">No hay cobros pendientes.</p>'}</div>
          </div>
        </div>`;
    },

    resolver(cobroId, estado) {
      const r = UI.ejecutar(() => St().resolverCobro(cobroId, estado), `Cobro ${estado.toLowerCase()}.`);
      if (r && r.comprobante) UI.verComprobante(r.comprobante.id);
    },

    formVenta() {
      const items = S().inventario.filter((i) => i.activo && i.tipo === 'Comercial').map((i) => ({ value: i.id, label: `${i.nombre} · ${UI.plata(i.precio)} · stock ${i.stock}` }));
      UI.form({
        titulo: 'Venta de mostrador', subtitulo: 'Descuenta stock automáticamente (RF-17)', valores: { cantidad: 1, medio: 'Efectivo' }, enviar: 'Registrar venta',
        campos: [
          { name: 'itemId', label: 'Producto', type: 'select', options: items, required: true, full: true, vacio: 'Elegí un producto…' },
          { name: 'cantidad', label: 'Cantidad', type: 'number', min: 1, required: true },
          { name: 'medio', label: 'Medio de pago', type: 'select', options: L.MEDIOS_PAGO },
          { name: 'personaId', label: 'Socio (opcional)', type: 'select', options: UI.opcionesPersonas((p) => p.estado === 'Socio Activo'), vacio: 'Consumidor final', full: true },
        ],
        preview: (v) => {
          const item = v.itemId && L.byId(S().inventario, Number(v.itemId));
          return item ? `<p class="text-sm font-bold text-right">Total: <span class="text-cyan-300 font-mono">${UI.plata(item.precio * (Number(v.cantidad) || 0))}</span></p>` : '';
        },
        onSubmit: (v) => {
          const venta = St().venderItem(v.itemId, v.cantidad, v.personaId || null, v.medio);
          return `Venta registrada: ${UI.plata(venta.total)}.`;
        },
      });
    },

    /* ---------------- Comprobantes ---------------- */
    renderComprobantes() {
      return `<div class="card p-5"><div class="flex flex-col sm:flex-row justify-between gap-3 mb-4">
          <p class="text-xs text-slate-400">Repositorio documental: cada pago aprobado genera un comprobante numerado guardado en el legajo del socio.</p>
          ${UI.buscador('comprobantes', 'Buscar por socio, DNI o número', 'Vistas.caja.pintarComprobantes()')}</div><div id="tabla-comprobantes"></div></div>`;
    },

    pintarComprobantes() {
      const q = L.normalizar(UI.filtros.comprobantes || '');
      const filas = S().comprobantes.slice().sort((a, b) => b.id - a.id).filter((c) => {
        const p = St().persona(c.personaId);
        return !q || c.numero.includes(q) || p.dni.includes(q) || L.normalizar(L.nombreCompleto(p)).includes(q);
      }).slice(0, 100).map((c) => {
        const p = St().persona(c.personaId);
        return [`<span class="font-mono text-cyan-300">${c.numero}</span>`, UI.fecha(c.fecha), `<strong>${UI.esc(L.nombreCompleto(p))}</strong><span class="block text-[11px] text-slate-500 font-mono">${p.dni}</span>`,
          UI.esc(c.planNombre), UI.esc(c.medio), `${UI.fecha(c.vigenciaDesde)} → ${UI.fecha(c.vigenciaHasta)}`, `<span class="font-mono">${UI.plata(c.total)}</span>`,
          `<button class="btn-ghost btn-sm" onclick="UI.verComprobante(${c.id})">${UI.icono('file-down', 'w-3.5 h-3.5')} PDF</button>`];
      });
      document.getElementById('tabla-comprobantes').innerHTML = UI.tabla([{ t: 'Número' }, { t: 'Emitido' }, { t: 'Socio' }, { t: 'Plan' }, { t: 'Medio' }, { t: 'Vigencia' }, { t: 'Total' }, { t: '' }], filas, 'No se encontraron comprobantes.');
      UI.iconos();
    },

    /* ---------------- Vencimientos (RF-12) ---------------- */
    renderVencimientos() {
      const hoy = St().hoy();
      const filas = S().personas.filter((p) => p.estado === 'Socio Activo').map((p) => ({ p, c: L.estadoCuenta(p, S(), hoy) }));
      const proximos = filas.filter((r) => r.c.codigo === 'proximo').sort((a, b) => a.c.diasRestantes - b.c.diasRestantes);
      const vencidos = filas.filter((r) => r.c.codigo === 'vencido' || r.c.codigo === 'sin_pago').sort((a, b) => b.c.diasAtraso - a.c.diasAtraso);
      const item = ({ p, c }) => `<div class="card-sub p-3 flex items-center justify-between gap-3">
          <div><p class="font-semibold">${UI.esc(L.nombreCompleto(p))}</p><p class="text-[11px] text-slate-500">${UI.esc(p.telefono)} · ${c.vencimiento ? `vence/venció ${UI.fecha(c.vencimiento)}` : 'sin pagos registrados'}</p></div>
          <div class="flex items-center gap-2">${UI.badgeCuenta(c)}${c.deuda ? `<span class="font-mono text-rose-300 text-[11px]">${UI.plata(c.deuda)}</span>` : ''}<button class="btn-primary btn-sm" onclick="Vistas.caja.cobrar(${p.id})">Cobrar</button></div></div>`;
      return `<p class="text-xs text-slate-400 mb-4">El estado se recalcula automáticamente cada día: <strong>Al día</strong>, <strong>Próximo a vencer</strong> (${L.DIAS_AVISO_VENCIMIENTO} días antes) o <strong>Vencido</strong>.</p>
        <div class="grid lg:grid-cols-2 gap-5">
          <div class="card p-5"><p class="font-bold text-sm mb-3 flex items-center gap-2 text-amber-300">${UI.icono('alarm-clock')} Próximos a vencer (${proximos.length})</p><div class="space-y-2">${proximos.map(item).join('') || '<p class="text-xs text-slate-500">Nadie vence en los próximos días.</p>'}</div></div>
          <div class="card p-5"><p class="font-bold text-sm mb-3 flex items-center gap-2 text-rose-300">${UI.icono('alert-octagon')} Vencidos (${vencidos.length})</p><div class="space-y-2">${vencidos.map(item).join('') || '<p class="text-xs text-slate-500">No hay socios con deuda.</p>'}</div></div>
        </div>`;
    },

    /* ---------------- Planes y actividades (RF-05) ---------------- */
    renderPlanes() {
      const puedeEditar = St().rol() === 'Recepción';
      const filasAct = S().actividades.map((a) => [
        `<strong>${UI.esc(a.nombre)}</strong><span class="block text-[11px] text-slate-500">${UI.esc(a.descripcion)}</span>`, UI.esc(a.sede),
        a.id === 'RUN' ? 'Sin límite' : a.id === 'GYM' ? 'Máx. 5 por turno' : '—', a.activa ? UI.badge('Activa', 'ok') : UI.badge('Baja', 'neutro'),
        puedeEditar ? `<div class="flex gap-1 justify-end"><button class="btn-icon" onclick="Vistas.caja.formActividad('${a.id}')">${UI.icono('pencil', 'w-3.5 h-3.5')}</button><button class="btn-ghost btn-sm" onclick="UI.ejecutar(()=>Store.alternarActividad('${a.id}'),'Actividad actualizada.')">${a.activa ? 'Dar de baja' : 'Reactivar'}</button></div>` : '',
      ]);
      const filasPlan = S().planes.map((p) => [
        `<strong>${UI.esc(p.nombre)}</strong>`,
        Object.entries(p.frecuencia).map(([a, n]) => UI.badge(`${L.byId(S().actividades, a).nombreCorto} ${n}x/sem`, 'info')).join(' '),
        `<span class="font-mono font-bold">${UI.plata(p.precio)}</span>`,
        `${S().personas.filter((x) => x.estado === 'Socio Activo' && x.planId === p.id).length} socios`,
        p.activo ? UI.badge('Vigente', 'ok') : UI.badge('Discontinuado', 'neutro'),
        puedeEditar ? `<div class="flex gap-1 justify-end"><button class="btn-icon" onclick="Vistas.caja.formPlan('${p.id}')">${UI.icono('pencil', 'w-3.5 h-3.5')}</button><button class="btn-ghost btn-sm" onclick="UI.ejecutar(()=>Store.alternarPlan('${p.id}'),'Plan actualizado.')">${p.activo ? 'Discontinuar' : 'Reactivar'}</button></div>` : '',
      ]);
      return `${puedeEditar ? '' : '<p class="text-[11px] text-amber-300 mb-3">Solo Recepción puede modificar actividades, planes y valores.</p>'}
        <div class="card p-5 mb-5"><div class="flex justify-between items-center mb-3"><p class="font-bold text-sm">Planes mensuales y valores vigentes</p>${puedeEditar ? `<button class="btn-primary btn-sm" onclick="Vistas.caja.formPlan()">${UI.icono('plus', 'w-3.5 h-3.5')} Nuevo plan</button>` : ''}</div>
          ${UI.tabla([{ t: 'Plan' }, { t: 'Frecuencia semanal' }, { t: 'Valor mensual' }, { t: 'Socios' }, { t: 'Estado' }, { t: '' }], filasPlan)}</div>
        <div class="card p-5"><div class="flex justify-between items-center mb-3"><p class="font-bold text-sm">Disciplinas y actividades</p>${puedeEditar ? `<button class="btn-primary btn-sm" onclick="Vistas.caja.formActividad()">${UI.icono('plus', 'w-3.5 h-3.5')} Nueva actividad</button>` : ''}</div>
          ${UI.tabla([{ t: 'Actividad' }, { t: 'Sede' }, { t: 'Cupo' }, { t: 'Estado' }, { t: '' }], filasAct)}</div>`;
    },

    formActividad(id) {
      const a = id ? L.byId(S().actividades, id) : {};
      UI.form({
        titulo: id ? 'Modificar actividad' : 'Nueva actividad', valores: a,
        campos: [
          { name: 'nombre', label: 'Nombre', required: true, full: true },
          { name: 'nombreCorto', label: 'Nombre corto', placeholder: 'Ej: Gimnasio' },
          { name: 'sede', label: 'Sede', type: 'select', options: ['Nueva Córdoba', 'Parque Sarmiento'], required: true },
          { name: 'descripcion', label: 'Descripción', type: 'textarea', rows: 2 },
        ],
        onSubmit: (v) => { St().guardarActividad(Object.assign({ id }, v)); return 'Actividad guardada.'; },
      });
    },

    formPlan(id) {
      const p = id ? L.byId(S().planes, id) : { frecuencia: {} };
      const valores = Object.assign({}, p);
      S().actividades.forEach((a) => { valores[`frec_${a.id}`] = p.frecuencia[a.id] || 0; });
      UI.form({
        titulo: id ? 'Modificar plan' : 'Nuevo plan', subtitulo: 'Frecuencia semanal por actividad (0 = no incluida)', valores,
        campos: [
          { name: 'nombre', label: 'Nombre del plan', required: true, full: true },
          { name: 'precio', label: 'Valor mensual ($)', type: 'number', min: 1, required: true },
          ...S().actividades.filter((a) => a.activa).map((a) => ({ name: `frec_${a.id}`, label: `${a.nombreCorto}: veces por semana`, type: 'number', min: 0, max: 5 })),
        ],
        onSubmit: (v) => { St().guardarPlan(Object.assign({ id }, v)); return 'Plan guardado. El nuevo valor se usa en los próximos cobros.'; },
      });
    },

    /* ---------------- Descuentos (RF-06) ---------------- */
    renderDescuentos() {
      const puedeEditar = St().rol() === 'Recepción';
      const filas = S().descuentos.map((d) => [
        `<strong>${UI.esc(d.nombre)}</strong>`, UI.esc(d.tipo), `<span class="font-mono">${d.tipo === 'Porcentaje' ? `${d.valor}%` : UI.plata(d.valor)}</span>`,
        UI.badge(d.aplicaA === 'Manual' ? 'Se elige al cobrar' : `Automático: ${d.aplicaA}`, d.aplicaA === 'Manual' ? 'neutro' : 'info'),
        d.activo ? UI.badge('Vigente', 'ok') : UI.badge('Inactivo', 'neutro'),
        puedeEditar ? `<div class="flex gap-1 justify-end"><button class="btn-icon" onclick="Vistas.caja.formDescuento('${d.id}')">${UI.icono('pencil', 'w-3.5 h-3.5')}</button>
          <button class="btn-icon" onclick="UI.confirmar('Eliminar descuento','Se elimina la regla <strong>${UI.esc(d.nombre)}</strong>. Los comprobantes ya emitidos no cambian.',()=>{Store.eliminarDescuento('${d.id}');return 'Descuento eliminado.'},{peligro:true,etiqueta:'Eliminar'})">${UI.icono('trash-2', 'w-3.5 h-3.5')}</button></div>` : '',
      ]);
      return `<div class="card p-5"><div class="flex justify-between items-center mb-3"><p class="text-xs text-slate-400">Reglas por porcentaje o monto fijo. Las automáticas se aplican solas en cada cobro.</p>
        ${puedeEditar ? `<button class="btn-primary btn-sm" onclick="Vistas.caja.formDescuento()">${UI.icono('plus', 'w-3.5 h-3.5')} Nueva regla</button>` : ''}</div>
        ${UI.tabla([{ t: 'Nombre' }, { t: 'Tipo' }, { t: 'Valor' }, { t: 'Aplicación' }, { t: 'Estado' }, { t: '' }], filas)}</div>`;
    },

    formDescuento(id) {
      const d = id ? L.byId(S().descuentos, id) : { tipo: 'Porcentaje', aplicaA: 'Grupo Familiar', activo: true };
      UI.form({
        titulo: id ? 'Modificar descuento' : 'Nueva regla de descuento', valores: Object.assign({}, d, { activo: String(d.activo) }),
        campos: [
          { name: 'nombre', label: 'Nombre', required: true, full: true },
          { name: 'tipo', label: 'Tipo', type: 'select', options: ['Porcentaje', 'Monto fijo'] },
          { name: 'valor', label: 'Valor (% o $)', type: 'number', min: 1, required: true },
          { name: 'aplicaA', label: 'Se aplica a', type: 'select', options: ['Grupo Familiar', 'Combinación de Actividades', 'Manual'] },
          { name: 'activo', label: 'Vigencia', type: 'select', options: [{ value: 'true', label: 'Vigente' }, { value: 'false', label: 'Inactivo' }] },
        ],
        onSubmit: (v) => { St().guardarDescuento(Object.assign({ id }, v)); return 'Regla de descuento guardada.'; },
      });
    },
  };

  window.Vistas.caja = V;
  UI.registrar(V);
})();
