// RF-17 · RF-18 · RF-19 · RF-20
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { crearStore } = require('./helpers');

describe('RF-17 Inventario y stock mínimo', () => {
  test('Marca en alerta los artículos con stock menor o igual al mínimo (comerciales y materiales internos)', () => {
    const { L, s } = crearStore();
    const alertas = s().inventario.filter(L.enAlertaStock).map((i) => i.id).sort((a, b) => a - b);
    assert.deepEqual(alertas, [5, 6, 10]);
  });

  test('Dada una venta, entonces descuenta stock; sin stock suficiente se rechaza', () => {
    const { Store, L, s } = crearStore();
    Store.venderItem(7, 2, null, 'Efectivo');
    assert.equal(L.byId(s().inventario, 7).stock, 22);
    assert.throws(() => Store.venderItem(6, 1), /Stock insuficiente/);
    assert.throws(() => Store.venderItem(10, 1), /no se venden/);
  });
});

describe('RF-18 Solicitudes, cotizaciones y órdenes de compra', () => {
  test('Genera solicitudes solo para artículos en alerta sin compra en curso, y no las duplica', () => {
    const { Store } = crearStore();
    const nuevas = Store.generarSolicitudesDesdeAlertas();
    assert.deepEqual(nuevas.map((x) => x.itemId), [5]);
    assert.equal(Store.generarSolicitudesDesdeAlertas().length, 0);
  });

  test('Dada una cotización, cuando la aprueba el encargado, entonces se emite la OC y se descartan las demás', () => {
    const { Store, L, s } = crearStore();
    const oc = Store.aprobarCotizacion(3);
    assert.equal(oc.estado, 'Emitida');
    assert.equal(oc.total, 1900 * 20);
    assert.equal(L.byId(s().cotizaciones, 4).estado, 'Descartada');
    assert.equal(L.byId(s().solicitudes, 3).estado, 'Con orden de compra');
  });

  test('Dado un socio, cuando intenta aprobar una cotización, entonces no tiene permiso', () => {
    const { Store } = crearStore({ rol: 'Socio' });
    assert.throws(() => Store.aprobarCotizacion(3), /requiere el rol Recepción/);
  });

  test('Valida CUIT del proveedor y precio de la cotización', () => {
    const { Store } = crearStore();
    assert.throws(() => Store.guardarProveedor({ nombre: 'X', cuit: '123' }), /formato/);
    assert.throws(() => Store.registrarCotizacion({ solicitudId: 3, proveedorId: 1, precioUnit: 0 }), /mayor a cero/);
  });
});

describe('RF-19 Recepción y control de calidad', () => {
  test('Dada una recepción conforme, entonces suma el stock y cierra la OC', () => {
    const { Store, L, s } = crearStore();
    Store.registrarRecepcion({ ordenId: 2, cantidadRecibida: 10, resultado: 'Conforme' });
    assert.equal(L.byId(s().inventario, 10).stock, 18);
    assert.equal(L.byId(s().ordenes, 2).estado, 'Recibida conforme');
  });

  test('Dada una cantidad distinta a la pedida, no puede ser conforme; no conforme exige reclamo y no toca el stock', () => {
    const { Store, L, s } = crearStore();
    assert.throws(() => Store.registrarRecepcion({ ordenId: 2, cantidadRecibida: 8, resultado: 'Conforme' }), /deben llegar 10/);
    assert.throws(() => Store.registrarRecepcion({ ordenId: 2, cantidadRecibida: 8, resultado: 'No conforme' }), /reclamo/);
    const r = Store.registrarRecepcion({ ordenId: 2, cantidadRecibida: 8, resultado: 'No conforme', reclamo: 'Faltan 2 sets' });
    assert.equal(r.reclamo.estado, 'Abierto');
    assert.equal(L.byId(s().inventario, 10).stock, 8);
  });
});

describe('RF-20 Facturas y cuenta corriente', () => {
  test('Calcula la cuenta corriente: facturado − pagado', () => {
    const { L, s } = crearStore();
    const cc = L.cuentaCorriente(1, s());
    assert.deepEqual([cc.facturado, cc.pagado, cc.saldo, cc.estado], [48000, 20000, 28000, 'Con saldo pendiente']);
  });

  test('Solo se factura una OC recibida conforme, una sola vez; el pago no puede superar el saldo', () => {
    const { Store, L, s } = crearStore();
    assert.throws(() => Store.registrarFactura({ ordenId: 2, numero: 'A-1', fecha: '2026-11-02', importe: 45000 }), /conformidad/);
    assert.throws(() => Store.registrarFactura({ ordenId: 1, numero: 'A-2', fecha: '2026-11-02', importe: 48000 }), /ya tiene factura/);
    assert.throws(() => Store.registrarPagoProveedor({ facturaId: 1, importe: 30000 }), /supera el saldo/);
    Store.registrarPagoProveedor({ facturaId: 1, importe: 28000 });
    assert.equal(L.cuentaCorriente(1, s()).estado, 'Al día');
  });
});
