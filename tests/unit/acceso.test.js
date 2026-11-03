// RF-13 · RF-16 — incluye los errores reportados por el equipo
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { crearStore } = require('./helpers');

describe('RF-13 Control de acceso', () => {
  test('Busca por DNI parcial y por apellido sin importar tildes ni mayúsculas', () => {
    const { L, s } = crearStore();
    assert.equal(L.buscarPersonas(s().personas, '343212')[0].apellido, 'Tagliaferri');
    assert.equal(L.buscarPersonas(s().personas, 'albarracin')[0].dni, '39812401');
    assert.equal(L.buscarPersonas(s().personas, 'GÓMEZ')[0].nombre, 'Mariana');
  });

  test('Dado un socio al día con turno hoy, cuando ingresa, entonces se registra con su turno y su nombre (bug: no aparecía el nombre)', () => {
    const { Store, L, s } = crearStore();
    const a = Store.registrarIngreso(10);
    assert.equal(a.personaId, 10);
    assert.equal(a.turnoId, 'GYM-LUN-08');
    assert.equal(L.nombreCompleto(Store.persona(a.personaId)), 'Esteban Quiroga');
    assert.ok(s().asistencias.includes(a));
  });

  test('Dado un socio vencido, cuando quiere ingresar, entonces se bloquea; el ingreso excepcional exige motivo', () => {
    const { Store } = crearStore();
    assert.throws(() => Store.registrarIngreso(3), /Vencido/);
    assert.throws(() => Store.registrarIngreso(3, { excepcional: true, motivo: ' ' }), /motivo/);
    const a = Store.registrarIngreso(3, { excepcional: true, motivo: 'Paga mañana' });
    assert.match(a.observaciones, /Paga mañana/);
  });

  test('Dado un socio que ya está adentro, cuando se registra de nuevo, entonces se rechaza', () => {
    const { Store } = crearStore();
    Store.registrarIngreso(10);
    assert.throws(() => Store.registrarIngreso(10), /ingreso abierto/);
  });

  test('Dado un interesado con día de prueba hoy, cuando ingresa, entonces la prueba queda "Asistió"', () => {
    const { Store, L, s } = crearStore();
    Store.registrarIngreso(14);
    assert.equal(L.byId(s().pruebas, 1).estado, 'Asistió');
  });

  test('Dado un interesado sin prueba o un socio dado de baja, cuando quiere ingresar, entonces se rechaza', () => {
    const { Store } = crearStore();
    assert.throws(() => Store.registrarIngreso(15), /Interesado/);
    assert.throws(() => Store.registrarIngreso(13), /Inactivo/);
  });
});

describe('RF-16 Salida y cumplimiento', () => {
  test('Dados dos socios adentro, cuando se registra la salida de uno, entonces solo cambia ese ingreso (bug: abría otro alumno)', () => {
    const { Store, L, s } = crearStore();
    const a1 = Store.registrarIngreso(10);
    const a2 = Store.registrarIngreso(8);
    Store.registrarSalida(a2.id, 'Parcial', 'Se fue antes');
    assert.equal(L.byId(s().asistencias, a2.id).horaSalida, '18:30');
    assert.equal(L.byId(s().asistencias, a2.id).cumplimiento, 'Parcial');
    assert.equal(L.byId(s().asistencias, a1.id).horaSalida, null);
  });

  test('Dada una salida ya registrada o sin cumplimiento, cuando se intenta registrar, entonces se rechaza', () => {
    const { Store } = crearStore();
    const a = Store.registrarIngreso(10);
    assert.throws(() => Store.registrarSalida(a.id, 'Más o menos'), /cumplimiento/);
    Store.registrarSalida(a.id, 'Completa');
    assert.throws(() => Store.registrarSalida(a.id, 'Completa'), /ya estaba registrada/);
  });

  test('Cada socio tiene su propio historial de asistencias (bug: era el mismo para todos)', () => {
    const { s } = crearStore();
    const cuenta = (id) => s().asistencias.filter((a) => a.personaId === id).length;
    const valores = [1, 2, 3, 5, 7].map(cuenta);
    assert.ok(new Set(valores).size >= 4, `Historiales demasiado parecidos: ${valores}`);
  });
});
