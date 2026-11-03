// RF-03 · RF-14 · RF-15 — los entrenadores no tienen usuario: carga Recepción; el socio solo consulta
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { crearStore } = require('./helpers');

const comoSocio = (Store, personaId) => { Store.state.sesion = { tipo: 'socio', personaId, rol: 'Socio', nombre: 'Socio' }; };

describe('Usuarios del sistema', () => {
  test('Solo existe el usuario recepcion: ni administración ni entrenadores inician sesión', () => {
    const { Store, s } = crearStore();
    assert.deepEqual(s().usuarios.map((u) => u.usuario), ['recepcion']);
    assert.throws(() => Store.loginPersonal('entrenador', 'entrenador'), /incorrectos/);
    assert.throws(() => Store.loginPersonal('admin', 'admin'), /incorrectos/);
  });
});

describe('RF-03 Ficha técnica y clínica', () => {
  test('Dada recepción, cuando actualiza la ficha, entonces se guarda con la fecha de actualización', () => {
    const { Store } = crearStore({ rol: 'Recepción' });
    const p = Store.guardarFicha(12, { fmsPuntaje: '15/21', lesiones: 'Ninguna', cirugias: 'Menisco 2019', objetivo: 'Fuerza' });
    assert.equal(p.ficha.cirugias, 'Menisco 2019');
    assert.equal(p.ficha.actualizada, '2026-11-02');
  });

  test('Dado un socio, cuando intenta modificar su ficha clínica, entonces no tiene permiso', () => {
    const { Store } = crearStore();
    comoSocio(Store, 12);
    assert.throws(() => Store.guardarFicha(12, { lesiones: 'x' }), /requiere el rol/);
  });
});

describe('RF-14 Rutinas personalizadas', () => {
  const rutina = { observacionFms: 'Evitar impacto', sesiones: [{ nombre: 'Día A', ejercicios: [{ ejercicio: 'Sentadilla', series: '4', reps: '8', carga: '40 kg', pausa: '90 s' }] }] };

  test('Dada una rutina con sesiones y ejercicios, cuando se guarda, entonces queda asignada y vinculada a la valoración', () => {
    const { Store } = crearStore({ rol: 'Recepción' });
    const p = Store.guardarRutina(12, rutina);
    assert.equal(p.rutina.sesiones[0].ejercicios[0].carga, '40 kg');
    assert.equal(p.rutina.observacionFms, 'Evitar impacto');
  });

  test('Dado un socio, cuando intenta configurar o modificar su rutina (propia u ajena), entonces no tiene permiso', () => {
    const { Store } = crearStore();
    comoSocio(Store, 12);
    assert.throws(() => Store.guardarRutina(12, rutina), /requiere el rol/);
    assert.throws(() => Store.guardarRutina(1, rutina), /requiere el rol/);
  });

  test('Dada una rutina vacía o un ejercicio sin series, cuando se guarda, entonces se rechaza', () => {
    const { Store } = crearStore({ rol: 'Recepción' });
    assert.throws(() => Store.guardarRutina(12, { sesiones: [] }), /al menos una sesión/);
    assert.throws(() => Store.guardarRutina(12, { sesiones: [{ nombre: 'A', ejercicios: [{ ejercicio: 'Remo', series: '0' }] }] }), /al menos 1 serie/);
  });
});

describe('RF-15 Seguimiento en sesión', () => {
  test('Dada una progresión, cuando se registra indicando el entrenador, entonces se agrega a la evolución', () => {
    const { Store } = crearStore({ rol: 'Recepción' });
    const antes = Store.persona(1).seguimiento.length;
    Store.agregarSeguimiento(1, { tipo: 'Progresión de carga', ejercicio: 'Sentadilla frontal', detalle: 'Subió a 55 kg', profesionalId: 'P3' });
    assert.equal(Store.persona(1).seguimiento.length, antes + 1);
    assert.equal(Store.persona(1).seguimiento.at(-1).profesionalId, 'P3');
  });

  test('Dado un registro sin detalle o sin entrenador, cuando se guarda, entonces se pide completarlo', () => {
    const { Store } = crearStore({ rol: 'Recepción' });
    assert.throws(() => Store.agregarSeguimiento(1, { tipo: 'Observación de desempeño', detalle: 'ok' }), /Entrenador/);
    assert.throws(() => Store.agregarSeguimiento(1, { tipo: 'Observación de desempeño', detalle: '', profesionalId: 'P3' }), /obligatorio/);
  });
});
