// RF-07 · RF-08 · RF-09
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { crearStore } = require('./helpers');

describe('RF-08 Grilla de turnos (horarios pedidos por AGMEN)', () => {
  test('Gimnasio: lunes a viernes de 08 a 12 y de 14 a 21, bloques de 1 hora con cupo 5', () => {
    const { s } = crearStore();
    const gym = s().turnos.filter((t) => t.actividadId === 'GYM');
    assert.equal(gym.length, 5 * 11);
    for (const t of gym) {
      assert.equal(Number(t.hasta.slice(0, 2)) - Number(t.desde.slice(0, 2)), 1);
      assert.equal(t.cupo, 5);
      assert.ok((t.desde >= '08:00' && t.hasta <= '12:00') || (t.desde >= '14:00' && t.hasta <= '21:00'), `${t.id} fuera de horario`);
    }
  });

  test('Running: lunes y miércoles de 19:30 a 21:00, sin límite de cupo', () => {
    const { s } = crearStore();
    const run = s().turnos.filter((t) => t.actividadId === 'RUN');
    assert.deepEqual(run.map((t) => [t.dia, t.desde, t.hasta, t.cupo]), [['Lunes', '19:30', '21:00', null], ['Miércoles', '19:30', '21:00', null]]);
  });

  test('Dado un turno con lugar, cuando se asigna un socio, entonces la ocupación cambia (bug reportado: no cambiaba)', () => {
    const { Store, L, s } = crearStore();
    const t = L.byId(s().turnos, 'GYM-MAR-10');
    const antes = L.ocupacion(t, s()).ocupados;
    Store.asignarTurnosFijos(6, ['GYM-MAR-10', 'GYM-JUE-08']);
    assert.equal(L.ocupacion(t, s()).ocupados, antes + 1);
  });

  test('Dado Running sin cupo, cuando se inscriben muchos socios, entonces nunca se llena', () => {
    const { Store, L, s } = crearStore();
    for (const id of [5, 6, 7, 8, 9, 10, 11]) {
      Store.cambiarEstadoPersona(id, 'Socio Activo', 'PL-RUN');
      Store.asignarTurnosFijos(id, ['RUN-LUN-1930', 'RUN-MIE-1930']);
    }
    const oc = L.ocupacion(L.byId(s().turnos, 'RUN-LUN-1930'), s());
    assert.ok(oc.ocupados >= 9);
    assert.equal(oc.lleno, false);
  });

  test('Dado un turno completo (5/5), cuando se asigna otro socio, entonces se rechaza', () => {
    const { Store } = crearStore();
    assert.throws(() => Store.asignarTurnosFijos(11, ['GYM-LUN-08', 'GYM-JUE-18', 'GYM-VIE-18']), /está completo/);
  });

  test('Dado un plan de 2 veces por semana, cuando se eligen 3 turnos o una actividad que no incluye, entonces se rechaza', () => {
    const { Store } = crearStore();
    assert.throws(() => Store.asignarTurnosFijos(2, ['GYM-MAR-10', 'GYM-JUE-10', 'GYM-VIE-10']), /permite 2/);
    assert.throws(() => Store.asignarTurnosFijos(2, ['RUN-LUN-1930']), /no incluye/);
  });
});

describe('RF-09 Reprogramación y recupero', () => {
  test('Dado un socio, cuando registra un recupero, entonces libera su lugar esa fecha y ocupa el destino', () => {
    const { Store, L, s } = crearStore();
    const origen = L.byId(s().turnos, 'GYM-LUN-19');
    const destino = L.byId(s().turnos, 'GYM-MAR-19');
    const antesDestino = L.ocupacion(destino, s(), '2026-11-03').ocupados;
    Store.registrarReprogramacion({ personaId: 3, tipo: 'Recupero', turnoOrigenId: 'GYM-LUN-19', fechaOrigen: '2026-11-09', turnoDestinoId: 'GYM-MAR-19', fechaDestino: '2026-11-03' });
    assert.equal(L.ocupacion(destino, s(), '2026-11-03').ocupados, antesDestino + 1);
    assert.equal(L.ocupacion(origen, s(), '2026-11-09').inscriptos.includes(3), false);
  });

  test('Dado un destino completo o una fecha que no coincide con el día, cuando se reprograma, entonces se rechaza', () => {
    const { Store } = crearStore();
    assert.throws(() => Store.registrarReprogramacion({ personaId: 2, tipo: 'Recupero', turnoOrigenId: 'GYM-MAR-10', fechaOrigen: '2026-11-03', turnoDestinoId: 'GYM-LUN-08', fechaDestino: '2026-11-09' }), /No hay cupo/);
    assert.throws(() => Store.registrarReprogramacion({ personaId: 2, tipo: 'Recupero', turnoOrigenId: 'GYM-MAR-10', fechaOrigen: '2026-11-04', turnoDestinoId: 'GYM-MIE-10', fechaDestino: '2026-11-04' }), /debe ser un Martes/);
  });

  test('Dado un cambio de turno fijo, cuando se registra, entonces el cupo anterior se libera automáticamente', () => {
    const { Store, L, s } = crearStore();
    const viejo = L.byId(s().turnos, 'GYM-MAR-10');
    const antes = L.ocupacion(viejo, s()).ocupados;
    Store.registrarReprogramacion({ personaId: 2, tipo: 'Cambio de turno fijo', turnoOrigenId: 'GYM-MAR-10', turnoDestinoId: 'GYM-MIE-15' });
    assert.ok(Store.persona(2).turnosFijos.includes('GYM-MIE-15'));
    assert.equal(L.ocupacion(viejo, s()).ocupados, antes - 1);
  });
});

describe('RF-07 Profesionales y disponibilidad', () => {
  test('Dada una disponibilidad escrita por línea, cuando se guarda el profesional, entonces se interpreta en franjas', () => {
    const { Store } = crearStore();
    const p = Store.guardarProfesional({ nombre: 'Tomás Paz', dni: '33444555', telefono: '351-1', rol: 'Entrenador', especialidades: ['Musculación'], disponibilidad: 'Lunes 12:00-14:00\nmiercoles 12:00-14:00' });
    assert.deepEqual(p.disponibilidad.map((d) => d.dia), ['Lunes', 'Miércoles']);
  });

  test('Dada una franja mal escrita o sin especialidad, cuando se guarda, entonces se informa', () => {
    const { Store } = crearStore();
    assert.throws(() => Store.guardarProfesional({ nombre: 'X', dni: '33444555', telefono: '1', especialidades: ['Running'], disponibilidad: 'Lunes de 8 a 12' }), /No entendí la franja/);
    assert.throws(() => Store.guardarProfesional({ nombre: 'X', dni: '33444555', telefono: '1', especialidades: [], disponibilidad: 'Lunes 08:00-12:00' }), /especialidad/);
  });

  test('Dado un profesor no disponible o con otro turno en ese horario, cuando se crea el turno, entonces se rechaza', () => {
    const { Store } = crearStore();
    assert.throws(() => Store.guardarTurno({ actividadId: 'GYM', dia: 'Lunes', desde: '12:00', hasta: '13:00', profesionalId: 'P2', cupo: 5 }), /no está disponible/);
    assert.throws(() => Store.guardarTurno({ actividadId: 'TALLER', dia: 'Lunes', desde: '08:00', hasta: '09:00', profesionalId: 'P2', cupo: 5 }), /ya tiene el turno/);
  });

  test('Dado un profesional con turnos en la grilla, cuando se lo da de baja, entonces se pide reasignar primero', () => {
    const { Store } = crearStore();
    assert.throws(() => Store.alternarProfesional('P1'), /Reasigná/);
  });
});
