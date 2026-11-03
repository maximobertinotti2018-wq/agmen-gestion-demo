/**
 * Vista STOCK Y COMPRAS — RF-17 (inventario y stock mínimo), RF-18 (proveedores, solicitudes, cotizaciones y OC),
 * RF-19 (recepción y control de calidad), RF-20 (facturas y cuenta corriente).
 * Circuito: alerta de stock → solicitud → cotizaciones → OC aprobada → recepción → factura → pago.
 */
(function () {
  'use strict';
  const L = window.Logic;
  const S = () => window.Store.state;
  const St = () => window.Store;
  const item = (id) => L.byId(S().inventario, id);
  const proveedor = (id) => L.byId(S().proveedores, id);

  const V = {
    id: 'stock', label: 'Stock y compras', icono: 'package',

    render() {
      const tab = UI.pestana('stock', 'inventario');
      const alertas = S().inventario.filter(L.enAlertaStock).length;
      return UI.encabezado('Stock y compras', 'Del aviso de stock mínimo al pago al proveedor, paso a paso.') +
        UI.tabsHTML('stock', [
          { id: 'inventario', label: `Inventario (RF-17)${alertas ? ` · ${alertas} en alerta` : ''}` },
          { id: 'compras', label: 'Solicitudes y cotizaciones (RF-18)' },
          { id: 'ordenes', label: 'Órdenes y recepción (RF-18/19)' },
          { id: 'proveedores', label: 'Proveedores y cuenta corriente (RF-20)' },
        ], 'inventario') +
        ({ inventario: V.renderInventario, compras: V.renderCompras, ordenes: V.renderOrdenes, proveedores: V.renderProveedores }[tab])();
    },

    despues() {
      if (UI.pestana('stock', 'inventario') === 'inventario') V.pintarInventario();
    },

    /* ---------------- Inventario ---------------- */
    renderInventario() {
      const alertas = S().inventario.filter(L.enAlertaStock);
      const pedidos = S().ventas.filter((v) => v.estado === 'Pendiente de entrega');
      return `${alertas.length ? `<div class="rounded-xl border border-amber-500/40 bg-amber-950/20 p-4 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div><p class="font-bold text-amber-200 flex items-center gap-2">${UI.icono('alert-triangle')} ${alertas.length} artículo(s) en o por debajo del stock mínimo</p>
            <p class="text-[11px] text-amber-100/80 mt-1">${alertas.map((i) => `${UI.esc(i.nombre)} (${i.stock}/${i.stockMin})`).join(' · ')}</p></div>
          <button class="btn-primary shrink-0" onclick="Vistas.stock.generarSolicitudes()">${UI.icono('file-plus-2')} Generar solicitudes de compra</button></div>` : ''}
        ${pedidos.length ? `<div class="card p-5 mb-5"><p class="font-bold text-sm mb-3">Pedidos de la tienda del portal (${pedidos.length})</p>
          ${UI.tabla([{ t: 'Fecha' }, { t: 'Socio' }, { t: 'Producto' }, { t: 'Cant.' }, { t: 'Total' }, { t: '' }], pedidos.map((v) => [UI.fecha(v.fecha), UI.esc(L.nombreCompleto(St().persona(v.personaId))), UI.esc(item(v.itemId).nombre), v.cantidad, UI.plata(v.total),
            `<div class="flex gap-1 justify-end"><button class="btn-ok btn-sm" onclick="Vistas.stock.entregar(${v.id})">Entregar y cobrar</button><button class="btn-icon" title="Cancelar pedido" onclick="UI.ejecutar(()=>Store.cancelarPedido(${v.id}),'Pedido cancelado y stock devuelto.')">${UI.icono('x', 'w-3.5 h-3.5')}</button></div>`]))}</div>` : ''}
        <div class="card p-5">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
            <div class="flex gap-1">${['Todos', 'Comercial', 'Material interno'].map((t) => `<button class="nav-item ${(UI.filtros.tipoItem || 'Todos') === t ? 'activo' : ''}" onclick="UI.filtros.tipoItem='${t}';UI.renderVista()">${t}</button>`).join('')}</div>
            <div class="flex gap-2">${UI.buscador('inventario', 'Buscar artículo', 'Vistas.stock.pintarInventario()')}<button class="btn-primary" onclick="Vistas.stock.formItem()">${UI.icono('plus')} Nuevo artículo</button></div>
          </div><div id="tabla-inventario"></div></div>`;
    },

    pintarInventario() {
      const q = L.normalizar(UI.filtros.inventario || '');
      const tipo = UI.filtros.tipoItem || 'Todos';
      const filas = S().inventario.filter((i) => (tipo === 'Todos' || i.tipo === tipo) && (!q || L.normalizar(i.nombre + i.categoria).includes(q)))
        .sort((a, b) => Number(L.enAlertaStock(b)) - Number(L.enAlertaStock(a)) || a.nombre.localeCompare(b.nombre))
        .map((i) => {
          const alerta = L.enAlertaStock(i);
          return [
            `<strong>${UI.esc(i.nombre)}</strong><span class="block text-[11px] text-slate-500">${UI.esc(i.categoria)}</span>`,
            UI.badge(i.tipo, i.tipo === 'Comercial' ? 'info' : 'neutro'),
            i.tipo === 'Comercial' ? `<span class="font-mono">${UI.plata(i.precio)}</span>` : '<span class="text-slate-500">Uso interno</span>',
            `<span class="font-mono font-bold ${alerta ? 'text-rose-300' : ''}">${i.stock}</span> <span class="text-[11px] text-slate-500">${UI.esc(i.unidad)}</span>`,
            `<span class="font-mono">${i.stockMin}</span>`,
            i.stock === 0 ? UI.badge('Sin stock', 'error') : alerta ? UI.badge('Reponer', 'alerta') : UI.badge('OK', 'ok'),
            `<div class="flex gap-1 justify-end"><button class="btn-icon" title="Modificar artículo y stock" onclick="Vistas.stock.formItem(${i.id})">${UI.icono('pencil', 'w-3.5 h-3.5')}</button></div>`,
          ];
        });
      document.getElementById('tabla-inventario').innerHTML = UI.tabla([{ t: 'Artículo' }, { t: 'Tipo' }, { t: 'Precio' }, { t: 'Existencia' }, { t: 'Stock mín.' }, { t: 'Alerta' }, { t: '' }], filas, 'No hay artículos con ese criterio.');
      UI.iconos();
    },

    formItem(id) {
      const i = id ? item(id) : { tipo: 'Comercial', unidad: 'unidades', stock: 0, stockMin: 5 };
      UI.form({
        titulo: id ? 'Modificar artículo y existencias' : 'Nuevo artículo', subtitulo: 'Productos para la venta o materiales de uso interno', valores: i,
        campos: [
          { name: 'nombre', label: 'Nombre', required: true, full: true },
          { name: 'tipo', label: 'Tipo', type: 'select', options: ['Comercial', 'Material interno'] },
          { name: 'categoria', label: 'Categoría', required: true, placeholder: 'Ej: Bebidas, Material gimnasio' },
          { name: 'precio', label: 'Precio de venta ($)', type: 'number', min: 0, ayuda: 'Solo para productos comerciales.' },
          { name: 'unidad', label: 'Unidad', placeholder: 'unidades, botellas…' },
          { name: 'stock', label: 'Existencia actual', type: 'number', min: 0, required: true },
          { name: 'stockMin', label: 'Stock mínimo (punto de pedido)', type: 'number', min: 0, required: true },
        ],
        onSubmit: (v) => { St().guardarItem(Object.assign({ id }, v)); return 'Artículo guardado.'; },
      });
    },

    entregar(ventaId) {
      UI.form({
        titulo: 'Entregar pedido', enviar: 'Confirmar entrega', valores: { medio: 'Efectivo' },
        campos: [{ name: 'medio', label: 'Medio de pago', type: 'select', options: L.MEDIOS_PAGO, full: true }],
        onSubmit: (v) => { St().entregarVenta(ventaId, v.medio); return 'Pedido entregado y registrado en caja.'; },
      });
    },

    generarSolicitudes() {
      const nuevas = UI.ejecutar(() => St().generarSolicitudesDesdeAlertas());
      if (!nuevas) return;
      UI.toast(nuevas.length ? `Se generaron ${nuevas.length} solicitud(es) de compra.` : 'Todos los artículos en alerta ya tienen una compra en curso.', nuevas.length ? 'ok' : 'info');
      UI.irA('stock', 'compras');
    },

    /* ---------------- Solicitudes y cotizaciones ---------------- */
    renderCompras() {
      const puedeEditar = St().rol() === 'Recepción';
      const solicitudes = S().solicitudes.slice().sort((a, b) => b.id - a.id);
      const tipoSol = { Abierta: 'info', Cotizada: 'alerta', 'Con orden de compra': 'ok' };
      return `<div class="flex justify-between items-center mb-4"><p class="text-xs text-slate-400">${puedeEditar ? 'Aprobá la mejor cotización para emitir la orden de compra.' : 'La aprobación de cotizaciones la realiza Recepción.'}</p>
          <button class="btn-primary" onclick="Vistas.stock.generarSolicitudes()">${UI.icono('file-plus-2')} Generar desde alertas</button></div>
        <div class="space-y-4">${solicitudes.map((sol) => {
          const it = item(sol.itemId);
          const cots = S().cotizaciones.filter((c) => c.solicitudId === sol.id).sort((a, b) => a.precioUnit - b.precioUnit);
          return `<div class="card p-5">
            <div class="flex flex-wrap justify-between gap-3 mb-3">
              <div><p class="font-bold">Solicitud #${sol.id} · ${UI.esc(it.nombre)}</p><p class="text-[11px] text-slate-500">${sol.cantidad} ${UI.esc(it.unidad)} · ${UI.fecha(sol.fecha)} · stock actual ${it.stock}/${it.stockMin}</p></div>
              <div class="flex items-center gap-2">${UI.badge(sol.estado, tipoSol[sol.estado])}${sol.estado !== 'Con orden de compra' ? `<button class="btn-ghost btn-sm" onclick="Vistas.stock.formCotizacion(${sol.id})">${UI.icono('plus', 'w-3.5 h-3.5')} Cargar cotización</button>` : ''}</div>
            </div>
            ${UI.tabla([{ t: 'Proveedor' }, { t: 'Precio unit.' }, { t: 'Total' }, { t: 'Disponibilidad' }, { t: 'Plazo' }, { t: 'Estado' }, { t: '' }], cots.map((c, idx) => [
              `<strong>${UI.esc(proveedor(c.proveedorId).nombre)}</strong>${idx === 0 && cots.length > 1 ? ' <span class="badge badge-ok">Mejor precio</span>' : ''}`,
              `<span class="font-mono">${UI.plata(c.precioUnit)}</span>`, `<span class="font-mono">${UI.plata(c.precioUnit * sol.cantidad)}</span>`, UI.esc(c.disponibilidad), `${c.plazoDias} días`,
              UI.badge(c.estado, { Recibida: 'info', Aprobada: 'ok', Descartada: 'neutro' }[c.estado]),
              c.estado === 'Recibida' && puedeEditar ? `<button class="btn-primary btn-sm" onclick="Vistas.stock.aprobar(${c.id})">Aprobar y emitir OC</button>` : '',
            ]), 'Todavía no hay cotizaciones cargadas.')}</div>`;
        }).join('') || '<p class="text-xs text-slate-500">No hay solicitudes de compra.</p>'}</div>`;
    },

    formCotizacion(solicitudId) {
      UI.form({
        titulo: 'Registrar cotización recibida', subtitulo: `Solicitud #${solicitudId}`, valores: { solicitudId, disponibilidad: 'Inmediata', plazoDias: 3 }, enviar: 'Registrar',
        campos: [
          { name: 'proveedorId', label: 'Proveedor', type: 'select', options: S().proveedores.filter((p) => p.activo).map((p) => ({ value: p.id, label: p.nombre })), required: true, full: true },
          { name: 'precioUnit', label: 'Precio unitario ($)', type: 'number', min: 1, required: true },
          { name: 'plazoDias', label: 'Plazo de entrega (días)', type: 'number', min: 0 },
          { name: 'disponibilidad', label: 'Disponibilidad', type: 'select', options: ['Inmediata', 'En 7 días', 'A confirmar'], full: true },
        ],
        onSubmit: (v) => { St().registrarCotizacion(Object.assign({ solicitudId }, v)); return 'Cotización registrada.'; },
      });
    },

    aprobar(cotizacionId) {
      const c = L.byId(S().cotizaciones, cotizacionId);
      const sol = L.byId(S().solicitudes, c.solicitudId);
      UI.confirmar('Emitir orden de compra', `Se aprueba la cotización de <strong>${UI.esc(proveedor(c.proveedorId).nombre)}</strong> por <strong>${UI.plata(c.precioUnit * sol.cantidad)}</strong> y se descartan las demás.`,
        () => { const oc = St().aprobarCotizacion(cotizacionId); UI.pestanas.stock = 'ordenes'; return `Orden ${oc.numero} emitida.`; }, { etiqueta: 'Emitir OC' });
    },

    /* ---------------- Órdenes y recepción ---------------- */
    renderOrdenes() {
      const tipo = { Emitida: 'info', 'Recibida conforme': 'ok', 'Recibida no conforme': 'error' };
      const filas = S().ordenes.slice().sort((a, b) => b.id - a.id).map((o) => {
        const rec = S().recepciones.filter((r) => r.ordenId === o.id).pop();
        return [
          `<span class="font-mono font-bold">${o.numero}</span><span class="block text-[11px] text-slate-500">${UI.fecha(o.fecha)} · aprobó ${UI.esc(o.aprobadaPor)}</span>`,
          UI.esc(proveedor(o.proveedorId).nombre),
          `${o.cantidad} × ${UI.esc(item(o.itemId).nombre)}`,
          `<span class="font-mono">${UI.plata(o.total)}</span>`,
          UI.badge(o.estado, tipo[o.estado]),
          rec ? `<span class="text-[11px] text-slate-400">${UI.fecha(rec.fecha)} · ${rec.cantidadRecibida} u. · ${UI.esc(rec.observaciones || rec.resultado)}</span>` : '<span class="text-slate-500">—</span>',
          o.estado === 'Emitida' ? `<button class="btn-primary btn-sm" onclick="Vistas.stock.formRecepcion(${o.id})">${UI.icono('package-check', 'w-3.5 h-3.5')} Recibir</button>` : '',
        ];
      });
      const reclamos = S().recepciones.filter((r) => r.reclamo);
      return `<div class="card p-5 mb-5"><p class="font-bold text-sm mb-3">Órdenes de compra</p>
          ${UI.tabla([{ t: 'Orden' }, { t: 'Proveedor' }, { t: 'Detalle' }, { t: 'Total' }, { t: 'Estado' }, { t: 'Recepción' }, { t: '' }], filas, 'No hay órdenes emitidas.')}</div>
        <div class="card p-5"><p class="font-bold text-sm mb-3">Reclamos a proveedores por mercadería no conforme (RF-19)</p>
          ${UI.tabla([{ t: 'Orden' }, { t: 'Proveedor' }, { t: 'Reclamo' }, { t: 'Fecha' }, { t: 'Estado' }, { t: '' }], reclamos.map((r) => {
            const o = L.byId(S().ordenes, r.ordenId);
            return [`<span class="font-mono">${o.numero}</span>`, UI.esc(proveedor(o.proveedorId).nombre), UI.esc(r.reclamo.detalle), UI.fecha(r.reclamo.fecha), UI.badge(r.reclamo.estado, r.reclamo.estado === 'Abierto' ? 'alerta' : 'ok'),
              r.reclamo.estado === 'Abierto' ? `<button class="btn-ghost btn-sm" onclick="UI.confirmar('Resolver reclamo','El proveedor reenvía la mercadería: la orden vuelve a quedar pendiente de recepción.',()=>{Store.resolverReclamo(${r.id});return 'Reclamo resuelto.'},{etiqueta:'Marcar resuelto'})">Resolver</button>` : ''];
          }), 'No hay reclamos registrados.')}</div>`;
    },

    formRecepcion(ordenId) {
      const o = L.byId(S().ordenes, ordenId);
      UI.form({
        titulo: `Recepción de mercadería · ${o.numero}`, subtitulo: `${proveedor(o.proveedorId).nombre} · pedido: ${o.cantidad} × ${item(o.itemId).nombre}`, ancho: 'medio',
        valores: { cantidadRecibida: o.cantidad, resultado: 'Conforme' }, enviar: 'Registrar recepción',
        campos: [
          { name: 'cantidadRecibida', label: 'Cantidad recibida', type: 'number', min: 0, required: true },
          { name: 'resultado', label: 'Inspección física y de calidad', type: 'select', options: ['Conforme', 'No conforme'] },
          { name: 'observaciones', label: 'Observaciones de la inspección', full: true, placeholder: 'Estado del embalaje, vencimientos, roturas…' },
          { name: 'reclamo', label: 'Reclamo al proveedor (obligatorio si es no conforme)', type: 'textarea', rows: 2 },
        ],
        preview: (v) => v.resultado === 'Conforme'
          ? `<p class="text-[11px] text-emerald-300">Al confirmar, se suman ${Number(v.cantidadRecibida) || 0} unidades al stock.</p>`
          : '<p class="text-[11px] text-amber-300">No conforme: el stock no se modifica y queda un reclamo abierto al proveedor.</p>',
        onSubmit: (v) => { St().registrarRecepcion(Object.assign({ ordenId }, v)); return v.resultado === 'Conforme' ? 'Mercadería recibida y stock actualizado.' : 'Recepción no conforme registrada con reclamo.'; },
      });
    },

    /* ---------------- Proveedores, facturas y cuenta corriente ---------------- */
    renderProveedores() {
      const puedeEditar = St().rol() === 'Recepción';
      const filasProv = S().proveedores.map((p) => {
        const cc = L.cuentaCorriente(p.id, S());
        return [
          `<strong>${UI.esc(p.nombre)}</strong><span class="block text-[11px] text-slate-500 font-mono">CUIT ${p.cuit}</span>`, UI.esc(p.rubro),
          `${UI.esc(p.contacto)}<span class="block text-[11px] text-slate-500">${UI.esc(p.telefono)} · ${UI.esc(p.email)}</span>`,
          `<span class="font-mono">${UI.plata(cc.facturado)}</span>`, `<span class="font-mono">${UI.plata(cc.pagado)}</span>`,
          `<strong class="font-mono ${cc.saldo > 0 ? 'text-amber-300' : 'text-emerald-300'}">${UI.plata(cc.saldo)}</strong>`,
          `<div class="flex gap-1 justify-end"><button class="btn-icon" title="Modificar" onclick="Vistas.stock.formProveedor(${p.id})">${UI.icono('pencil', 'w-3.5 h-3.5')}</button>
            <button class="btn-ghost btn-sm" onclick="Vistas.stock.verCuenta(${p.id})">Cuenta corriente</button></div>`,
        ];
      });
      const sinFactura = S().ordenes.filter((o) => o.estado === 'Recibida conforme' && !S().facturas.some((f) => f.ordenId === o.id));
      const filasFact = S().facturas.slice().sort((a, b) => b.id - a.id).map((f) => {
        const saldo = L.saldoFactura(f, S());
        return [`<span class="font-mono">${UI.esc(f.numero)}</span>`, UI.esc(proveedor(f.proveedorId).nombre), `<span class="font-mono">${L.byId(S().ordenes, f.ordenId).numero}</span>`, UI.fecha(f.fecha),
          `<span class="font-mono">${UI.plata(f.importe)}</span>`, saldo > 0 ? UI.badge(`Saldo ${UI.plata(saldo)}`, 'alerta') : UI.badge('Pagada', 'ok'),
          saldo > 0 && puedeEditar ? `<button class="btn-primary btn-sm" onclick="Vistas.stock.formPago(${f.id})">Registrar pago</button>` : ''];
      });
      return `<div class="card p-5 mb-5"><div class="flex justify-between items-center mb-3"><p class="font-bold text-sm">Padrón de proveedores</p><button class="btn-primary btn-sm" onclick="Vistas.stock.formProveedor()">${UI.icono('plus', 'w-3.5 h-3.5')} Nuevo proveedor</button></div>
          ${UI.tabla([{ t: 'Proveedor' }, { t: 'Rubro' }, { t: 'Contacto' }, { t: 'Facturado' }, { t: 'Pagado' }, { t: 'Saldo' }, { t: '' }], filasProv)}</div>
        <div class="card p-5">
          <div class="flex flex-wrap justify-between items-center gap-2 mb-3"><p class="font-bold text-sm">Facturas de proveedores</p>
            ${puedeEditar ? `<button class="btn-primary btn-sm" ${sinFactura.length ? '' : 'disabled title="No hay órdenes recibidas conformes sin factura"'} onclick="Vistas.stock.formFactura()">${UI.icono('receipt', 'w-3.5 h-3.5')} Cargar factura${sinFactura.length ? ` (${sinFactura.length} OC pendiente)` : ''}</button>` : '<span class="text-[11px] text-slate-500">La carga de facturas y pagos la realiza Recepción.</span>'}</div>
          ${UI.tabla([{ t: 'Factura' }, { t: 'Proveedor' }, { t: 'Orden' }, { t: 'Fecha' }, { t: 'Importe' }, { t: 'Estado' }, { t: '' }], filasFact, 'No hay facturas cargadas.')}</div>`;
    },

    formProveedor(id) {
      const p = id ? proveedor(id) : {};
      UI.form({
        titulo: id ? 'Modificar proveedor' : 'Nuevo proveedor', valores: p,
        campos: [
          { name: 'nombre', label: 'Razón social', required: true, full: true },
          { name: 'cuit', label: 'CUIT', required: true, placeholder: '30-12345678-9' },
          { name: 'rubro', label: 'Rubro' },
          { name: 'contacto', label: 'Persona de contacto' },
          { name: 'telefono', label: 'Teléfono' },
          { name: 'email', label: 'Email', type: 'email', full: true },
        ],
        onSubmit: (v) => { St().guardarProveedor(Object.assign({ id }, v)); return 'Proveedor guardado.'; },
      });
    },

    formFactura() {
      const ordenes = S().ordenes.filter((o) => o.estado === 'Recibida conforme' && !S().facturas.some((f) => f.ordenId === o.id));
      UI.form({
        titulo: 'Cargar factura de proveedor', subtitulo: 'Solo para órdenes recibidas en conformidad', valores: { fecha: St().hoy() },
        campos: [
          { name: 'ordenId', label: 'Orden de compra', type: 'select', options: ordenes.map((o) => ({ value: o.id, label: `${o.numero} · ${proveedor(o.proveedorId).nombre} · ${UI.plata(o.total)}` })), required: true, full: true },
          { name: 'numero', label: 'Número de factura', required: true, placeholder: 'A-0001-00001234' },
          { name: 'fecha', label: 'Fecha de emisión', type: 'date', required: true },
          { name: 'importe', label: 'Importe ($)', type: 'number', min: 1, required: true },
        ],
        preview: (v) => {
          const o = v.ordenId && L.byId(S().ordenes, Number(v.ordenId));
          return o && Number(v.importe) && Number(v.importe) !== o.total ? `<p class="text-[11px] text-amber-300">El importe difiere del total de la OC (${UI.plata(o.total)}). Verificá la factura.</p>` : '';
        },
        onSubmit: (v) => { St().registrarFactura(v); return 'Factura registrada en la cuenta corriente.'; },
      });
    },

    formPago(facturaId) {
      const f = L.byId(S().facturas, facturaId);
      const saldo = L.saldoFactura(f, S());
      UI.form({
        titulo: 'Registrar pago a proveedor', subtitulo: `Factura ${f.numero} · saldo ${UI.plata(saldo)}`, valores: { importe: saldo, medio: 'Transferencia Bancaria' },
        campos: [
          { name: 'importe', label: 'Importe a pagar ($)', type: 'number', min: 1, max: saldo, required: true },
          { name: 'medio', label: 'Medio de pago', type: 'select', options: ['Transferencia Bancaria', 'Efectivo', 'Cheque'] },
        ],
        onSubmit: (v) => { St().registrarPagoProveedor(Object.assign({ facturaId }, v)); return 'Pago registrado y cuenta corriente actualizada.'; },
      });
    },

    verCuenta(proveedorId) {
      const p = proveedor(proveedorId);
      const cc = L.cuentaCorriente(proveedorId, S());
      const mov = [
        ...cc.facturas.map((f) => ({ fecha: f.fecha, concepto: `Factura ${f.numero}`, debe: f.importe, haber: 0 })),
        ...cc.pagos.map((x) => ({ fecha: x.fecha, concepto: `Pago (${x.medio})`, debe: 0, haber: x.importe })),
      ].sort((a, b) => a.fecha.localeCompare(b.fecha));
      let saldo = 0;
      UI.modal({
        titulo: `Cuenta corriente · ${p.nombre}`, subtitulo: `Estado: ${cc.estado}`, ancho: 'medio',
        cuerpo: UI.tabla([{ t: 'Fecha' }, { t: 'Concepto' }, { t: 'Debe', cls: 'text-right' }, { t: 'Haber', cls: 'text-right' }, { t: 'Saldo', cls: 'text-right' }], mov.map((m) => {
          saldo += m.debe - m.haber;
          return [UI.fecha(m.fecha), UI.esc(m.concepto), m.debe ? UI.plata(m.debe) : '', m.haber ? UI.plata(m.haber) : '', `<strong>${UI.plata(saldo)}</strong>`];
        }), 'Sin movimientos con este proveedor.'),
        pie: '<button class="btn-primary" onclick="UI.cerrarModal()">Cerrar</button>',
      });
    },
  };

  window.Vistas.stock = V;
  UI.registrar(V);
})();
