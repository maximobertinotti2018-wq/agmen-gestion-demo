// RF-21 · RNF-02 (atomicidad)
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { crearStore, HOY } = require('./helpers');

const rango = { desde: '2026-10-04', hasta: HOY };

describe('RF-21 Reportes gerenciales', () => {
  test('Ocupación: cupos usados vs. disponibles por franja y por entrenador (Running fuera del % por no tener cupo)', () => {
    const { L, s } = crearStore();
    const r = L.reporteOcupacion(s(), {});
    assert.equal(r.total.cupos, 55 * 5);
    assert.ok(r.porFranja.find((f) => f.clave === '08:00–09:00').ocupados >= 5);
    assert.deepEqual(r.porProfesional.map((p) => p.clave).sort(), ['P2', 'P3']);
  });

  test('Filtro por profesor: solo cuenta los turnos de ese profesor', () => {
    const { L, s } = crearStore();
    const r = L.reporteOcupacion(s(), { profesionalId: 'P2' });
    assert.ok(r.filas.every((f) => f.turno.profesionalId === 'P2'));
  });

  test('Morosidad: lista socios vencidos y con primera cuota, días de atraso, deuda e ingresos por plan', () => {
    const { L, s } = crearStore();
    const r = L.reporteMorosidad(s(), HOY, rango);
    assert.deepEqual(r.morosos.map((m) => m.persona.id), [9, 3, 12]);
    assert.equal(r.deudaTotal, 132000 + 87000 + 66000);
    assert.ok(r.ingresosTotal > 0);
    assert.ok(r.ingresosPorPlan.every((x) => x.total > 0));
  });

  test('Asistencia y retención: presentismo, conversión de pruebas y bajas del período', () => {
    const { L, s } = crearStore();
    const r = L.reporteAsistencia(s(), HOY, rango);
    assert.ok(r.esperadas > 0 && r.presentes > 0);
    assert.equal(r.presentismo + r.ausentismo, 100);
    assert.equal(r.bajas, 1);
    assert.equal(r.conversion, 50);
  });
});

describe('RNF-02 Integridad', () => {
  test('Si una operación falla a mitad de camino, el estado queda exactamente como estaba', () => {
    const { Store, s } = crearStore();
    const antes = JSON.stringify(s());
    assert.throws(() => Store.tx((st) => { st.personas[0].nombre = 'Roto'; throw new Store.ReglaError('falla'); }));
    assert.equal(JSON.stringify(s()), antes);
  });
});
