// RF-05 · RF-06 · RF-10 · RF-11 · RF-12
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { crearStore } = require('./helpers');

describe('RF-12 Vigencia y alertas de vencimiento', () => {
  test('Clasifica al día, próximo a vencer (≤5 días), vencido y primera cuota', () => {
    const { Store, L, s, hoy } = crearStore();
    const cod = (id) => L.estadoCuenta(Store.persona(id), s(), hoy).codigo;
    assert.equal(cod(1), 'al_dia');
    assert.equal(cod(2), 'proximo');
    assert.equal(cod(3), 'vencido');
    assert.equal(cod(12), 'sin_pago');
  });

  test('Dado un socio vencido hace 41 días, entonces debe 2 cuotas; a los 23 días debe 1', () => {
    const { Store, L, s, hoy } = crearStore();
    const g = L.estadoCuenta(Store.persona(9), s(), hoy);
    assert.equal(g.diasAtraso, 41);
    assert.equal(g.cuotasAdeudadas, 2);
    assert.equal(g.deuda, 132000);
    assert.equal(L.estadoCuenta(Store.persona(3), s(), hoy).cuotasAdeudadas, 1);
  });

  test('Dado el paso del tiempo, cuando cambia la fecha, entonces el estado se recalcula solo', () => {
    const { Store, L, s } = crearStore();
    assert.equal(L.estadoCuenta(Store.persona(1), s(), '2026-11-16').codigo, 'proximo');
    assert.equal(L.estadoCuenta(Store.persona(1), s(), '2026-11-21').codigo, 'vencido');
  });
});

describe('RF-06 Descuentos automáticos', () => {
  test('Dado un socio de grupo familiar con plan combinado, entonces se aplican ambos descuentos del 10%', () => {
    const { Store, L, s } = crearStore();
    const liq = L.liquidar(Store.persona(1), L.byId(s().planes, 'PL-COMB'), s());
    assert.deepEqual(liq.items.map((i) => i.id), ['D-FAM', 'D-COMB']);
    assert.equal(liq.total, 92000);
  });

  test('Dado un descuento manual de monto fijo, cuando se elige, entonces se resta su valor', () => {
    const { Store, L, s } = crearStore();
    const liq = L.liquidar(Store.persona(3), L.byId(s().planes, 'PL-3'), s(), ['D-REF']);
    assert.equal(liq.total, 87000 - 5000);
  });

  test('Dado un porcentaje mayor a 100 o sin ser personal del gimnasio, cuando se guarda la regla, entonces se rechaza', () => {
    const { Store } = crearStore();
    assert.throws(() => Store.guardarDescuento({ nombre: 'X', tipo: 'Porcentaje', valor: 120, aplicaA: 'Manual' }), /100%/);
    const r = crearStore({ rol: 'Socio' });
    assert.throws(() => r.Store.guardarDescuento({ nombre: 'X', tipo: 'Porcentaje', valor: 10, aplicaA: 'Manual' }), /requiere el rol/);
  });
});

describe('RF-10 / RF-11 Cobro de cuotas y comprobantes', () => {
  test('Dado un cobro aprobado, entonces se emite comprobante numerado con todos los datos y el socio queda al día', () => {
    const { Store, L, s, hoy } = crearStore();
    const antes = s().comprobantes.length;
    const { cobro, comprobante } = Store.registrarCobro({ personaId: 12, medio: 'Tarjeta de Crédito', estado: 'Aprobado' });
    assert.equal(s().comprobantes.length, antes + 1);
    assert.equal(comprobante.numero, L.numeroComprobante(comprobante.id));
    assert.equal(comprobante.medio, 'Tarjeta de Crédito');
    assert.equal(comprobante.planNombre, 'Gimnasio 2 veces por semana');
    assert.deepEqual([comprobante.vigenciaDesde, comprobante.vigenciaHasta], ['2026-11-02', '2026-12-02']);
    assert.equal(cobro.comprobanteId, comprobante.id);
    assert.equal(L.estadoCuenta(Store.persona(12), s(), hoy).codigo, 'al_dia');
  });

  test('Dado un socio moroso, cuando paga una cuota, entonces la vigencia continúa desde su último vencimiento', () => {
    const { Store } = crearStore();
    const { comprobante } = Store.registrarCobro({ personaId: 3, medio: 'Efectivo', estado: 'Aprobado' });
    assert.equal(comprobante.vigenciaDesde, '2026-10-10');
    assert.equal(comprobante.vigenciaHasta, '2026-11-10');
  });

  test('Dado un cobro pendiente, entonces no hay comprobante hasta aprobarlo; uno rechazado nunca lo genera', () => {
    const { Store, s } = crearStore();
    const { cobro, comprobante } = Store.registrarCobro({ personaId: 12, medio: 'Transferencia Bancaria', estado: 'Pendiente' });
    assert.equal(comprobante, null);
    assert.throws(() => Store.registrarCobro({ personaId: 12, medio: 'Efectivo', estado: 'Aprobado' }), /cobro pendiente/);
    const r = Store.resolverCobro(cobro.id, 'Aprobado');
    assert.ok(r.comprobante);
    const rech = Store.registrarCobro({ personaId: 3, medio: 'Tarjeta de Crédito', estado: 'Rechazado' });
    assert.equal(rech.comprobante, null);
    assert.equal(s().cobros.find((c) => c.id === rech.cobro.id).estado, 'Rechazado');
  });

  test('Dado un interesado o un medio de pago inválido, cuando se cobra, entonces se rechaza', () => {
    const { Store } = crearStore();
    assert.throws(() => Store.registrarCobro({ personaId: 15, medio: 'Efectivo', estado: 'Aprobado' }), /socios activos/);
    assert.throws(() => Store.registrarCobro({ personaId: 1, medio: 'Bitcoin', estado: 'Aprobado' }), /Medio de pago/);
  });

  test('Los números de comprobante son únicos y correlativos', () => {
    const { Store, s } = crearStore();
    Store.registrarCobro({ personaId: 12, medio: 'Efectivo', estado: 'Aprobado' });
    Store.registrarCobro({ personaId: 3, medio: 'Efectivo', estado: 'Aprobado' });
    const nums = s().comprobantes.map((c) => c.numero);
    assert.equal(new Set(nums).size, nums.length);
  });
});

describe('RF-05 Actividades y planes', () => {
  test('Dado un plan nuevo, cuando se guarda con frecuencia por actividad, entonces queda disponible', () => {
    const { Store } = crearStore();
    const p = Store.guardarPlan({ nombre: 'Running 1x', precio: '40000', frec_RUN: '1', frec_GYM: '0', frec_TALLER: '0' });
    assert.deepEqual(p.frecuencia, { RUN: 1 });
  });

  test('Dado un plan sin actividades o con valor 0, cuando se guarda, entonces se rechaza', () => {
    const { Store } = crearStore();
    assert.throws(() => Store.guardarPlan({ nombre: 'X', precio: '1000' }), /al menos una actividad/);
    assert.throws(() => Store.guardarPlan({ nombre: 'X', precio: '0', frec_GYM: '1' }), /mayor a cero/);
  });

  test('Dada una actividad con socios asignados, cuando se la da de baja, entonces se rechaza', () => {
    const { Store } = crearStore();
    assert.throws(() => Store.alternarActividad('GYM'), /hay socios/);
    const a = Store.alternarActividad('TALLER');
    assert.equal(a.activa, false);
  });
});
