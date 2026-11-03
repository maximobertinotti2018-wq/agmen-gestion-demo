// RF-01 · RF-02 · RF-04 — Formato: Dado → Cuando → Entonces
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { crearStore } = require('./helpers');

const nuevo = { nombre: 'Ana', apellido: 'López', dni: '45111222', telefono: '351-5551234', email: 'ana@mail.com', fechaNac: '2001-05-04', emergencia: 'Juan López · 351-1112233' };

describe('RF-01 Registro de interesados y alta de socios', () => {
  test('Dado un interesado nuevo, cuando se registra, entonces queda como "Interesado" con todos sus datos', () => {
    const { Store } = crearStore();
    const p = Store.guardarPersona(nuevo);
    assert.equal(p.estado, 'Interesado');
    assert.equal(p.emergencia, nuevo.emergencia);
    assert.equal(p.fechaNac, nuevo.fechaNac);
  });

  test('Dado un DNI ya registrado, cuando se intenta registrar otra persona con ese DNI, entonces se rechaza', () => {
    const { Store } = crearStore();
    assert.throws(() => Store.guardarPersona({ ...nuevo, dni: '34321248' }), /Ya existe una persona con DNI/);
  });

  test('Dado un DNI con puntos o un email mal escrito, cuando se guarda, entonces se informa el error', () => {
    const { Store } = crearStore();
    assert.throws(() => Store.guardarPersona({ ...nuevo, dni: '45.111.222' }), /7 u 8 dígitos/);
    assert.throws(() => Store.guardarPersona({ ...nuevo, email: 'ana@' }), /email/);
  });

  test('Dado un socio existente, cuando se modifican sus datos de contacto, entonces se actualizan sin cambiar su estado', () => {
    const { Store } = crearStore();
    const p = Store.guardarPersona({ id: 1, ...Store.persona(1), telefono: '351-0000000' });
    assert.equal(p.telefono, '351-0000000');
    assert.equal(p.estado, 'Socio Activo');
  });

  test('Dado un interesado, cuando se lo activa sin plan, entonces se rechaza', () => {
    const { Store } = crearStore();
    assert.throws(() => Store.cambiarEstadoPersona(15, 'Socio Activo', 'NO-EXISTE'), /plan vigente/);
  });

  test('Dado un interesado, cuando se lo da de alta como socio, entonces debe UNA sola cuota (bug reportado: aparecían dos)', () => {
    const { Store, L, s, hoy } = crearStore();
    Store.cambiarEstadoPersona(15, 'Socio Activo', 'PL-2');
    const cuenta = L.estadoCuenta(Store.persona(15), s(), hoy);
    assert.equal(cuenta.codigo, 'sin_pago');
    assert.equal(cuenta.cuotasAdeudadas, 1);
    assert.equal(cuenta.deuda, 66000);
  });

  test('Dado un socio con turnos, cuando se le da la baja, entonces se liberan sus cupos', () => {
    const { Store, L, s } = crearStore();
    const turno = L.byId(s().turnos, 'GYM-LUN-08');
    assert.equal(L.ocupacion(turno, s()).ocupados, 5);
    Store.cambiarEstadoPersona(5, 'Socio Inactivo/Baja');
    assert.equal(L.ocupacion(turno, s()).ocupados, 4);
    assert.deepEqual(Store.persona(5).turnosFijos, []);
    assert.equal(Store.persona(5).fechaBaja, '2026-11-02');
  });
});

describe('RF-02 Días de prueba', () => {
  test('Dado un interesado, cuando se agenda una prueba con un entrenador disponible, entonces queda "En Día de Prueba"', () => {
    const { Store } = crearStore();
    const prueba = Store.guardarPrueba({ personaId: 15, fecha: '2026-11-04', desde: '10:00', profesionalId: 'P2', actividadId: 'GYM' });
    assert.equal(prueba.estado, 'Agendada');
    assert.equal(Store.persona(15).estado, 'En Día de Prueba');
  });

  test('Dado un entrenador que no trabaja en ese horario, cuando se agenda, entonces se rechaza', () => {
    const { Store } = crearStore();
    assert.throws(() => Store.guardarPrueba({ personaId: 15, fecha: '2026-11-04', desde: '18:00', profesionalId: 'P2' }), /no trabaja/);
  });

  test('Dada una fecha pasada o una prueba ya agendada, cuando se agenda otra, entonces se rechaza', () => {
    const { Store } = crearStore();
    assert.throws(() => Store.guardarPrueba({ personaId: 15, fecha: '2026-10-01', desde: '10:00', profesionalId: 'P2' }), /anterior a hoy/);
    assert.throws(() => Store.guardarPrueba({ personaId: 14, fecha: '2026-11-05', desde: '10:00', profesionalId: 'P2' }), /ya tiene un día de prueba/);
  });

  test('Dada una prueba agendada, cuando se modifica fecha y entrenador, entonces se guardan los nuevos datos', () => {
    const { Store, L, s } = crearStore();
    Store.guardarPrueba({ id: 1, personaId: 14, fecha: '2026-11-06', desde: '09:00', profesionalId: 'P2', actividadId: 'GYM' });
    const p = L.byId(s().pruebas, 1);
    assert.equal(p.fecha, '2026-11-06');
    assert.equal(p.profesionalId, 'P2');
  });

  test('Dada una prueba, cuando el interesado no asiste, entonces vuelve a estado "Interesado"', () => {
    const { Store } = crearStore();
    Store.cambiarEstadoPrueba(1, 'No asistió');
    assert.equal(Store.persona(14).estado, 'Interesado');
  });
});

describe('RF-04 Grupos familiares', () => {
  test('Dados dos socios activos, cuando se vinculan, entonces se crea el grupo con identificador', () => {
    const { Store } = crearStore();
    const g = Store.guardarGrupo({ nombre: 'Familia Ferrero', miembros: ['5', '6'] });
    assert.match(g.id, /^FAM-\d+/);
    assert.deepEqual(g.miembros, [5, 6]);
  });

  test('Dado un solo socio, un no activo o uno que ya está en otro grupo, cuando se vincula, entonces se rechaza', () => {
    const { Store } = crearStore();
    assert.throws(() => Store.guardarGrupo({ nombre: 'X', miembros: [5] }), /al menos 2/);
    assert.throws(() => Store.guardarGrupo({ nombre: 'X', miembros: [5, 15] }), /no es socio activo/);
    assert.throws(() => Store.guardarGrupo({ nombre: 'X', miembros: [5, 1] }), /ya pertenece/);
  });

  test('Dado un grupo de 2, cuando se quita un integrante, entonces el grupo se disuelve', () => {
    const { Store, s } = crearStore();
    const sigue = Store.quitarDeGrupo('FAM-01', 2);
    assert.equal(sigue, false);
    assert.equal(s().grupos.length, 0);
  });
});
