/**
 * AGMEN — Datos de demostración.
 * Las fechas se calculan relativas a "hoy" para que la demo siempre muestre
 * casos vigentes (al día, próximo a vencer, vencido, socio nuevo, etc.).
 */
(function (root) {
  'use strict';

  const L = typeof module === 'object' && module.exports ? require('./logic.js') : root.Logic;

  const ABREV = { Lunes: 'LUN', Martes: 'MAR', 'Miércoles': 'MIE', Jueves: 'JUE', Viernes: 'VIE' };

  /** Grilla oficial: Gimnasio L a V 08–12 y 14–21 (bloques de 1 h, máx. 5) · Running Lun y Mié 19:30–21:00 (sin cupo). */
  function crearGrilla() {
    const turnos = [];
    const horas = [8, 9, 10, 11, 14, 15, 16, 17, 18, 19, 20];
    for (const dia of L.DIAS_HABILES) {
      for (const h of horas) {
        const desde = `${String(h).padStart(2, '0')}:00`;
        turnos.push({
          id: `GYM-${ABREV[dia]}-${String(h).padStart(2, '0')}`,
          actividadId: 'GYM',
          dia,
          desde,
          hasta: `${String(h + 1).padStart(2, '0')}:00`,
          profesionalId: h < 12 ? 'P2' : 'P3',
          cupo: 5,
          activo: true,
        });
      }
    }
    for (const dia of ['Lunes', 'Miércoles']) {
      turnos.push({ id: `RUN-${ABREV[dia]}-1930`, actividadId: 'RUN', dia, desde: '19:30', hasta: '21:00', profesionalId: 'P1', cupo: null, activo: true });
    }
    return turnos;
  }

  function fichaVacia() {
    return { fmsPuntaje: '', fmsObservaciones: '', lesiones: '', limitaciones: '', cirugias: '', patologias: '', experiencia: '', objetivo: '', objetivoDetalle: '', actualizada: null };
  }

  function persona(base) {
    return Object.assign(
      { email: '', telefono: '', fechaNac: '', emergencia: '', interes: 'GYM', planId: null, turnosFijos: [], inicioCuenta: null, fechaBaja: null, ficha: fichaVacia(), rutina: { observacionFms: '', sesiones: [] }, seguimiento: [] },
      base
    );
  }

  /** Pseudo-aleatorio determinístico: misma semilla => mismo resultado. */
  function azar(semilla) {
    let h = 2166136261;
    for (const c of semilla) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return ((h >>> 0) % 1000) / 1000;
  }

  function crearEstadoInicial(hoy) {
    const d = (n) => L.addDays(hoy, n);

    const actividades = [
      { id: 'GYM', nombre: 'Gimnasio / Musculación', nombreCorto: 'Gimnasio', sede: 'Nueva Córdoba', descripcion: 'Fuerza y acondicionamiento en grupos reducidos (máximo 5 por profesor).', activa: true },
      { id: 'RUN', nombre: 'Running en Parque Sarmiento', nombreCorto: 'Running', sede: 'Parque Sarmiento', descripcion: 'Técnica de carrera, pasadas y fondo. Grupo abierto, sin límite de cupo.', activa: true },
      { id: 'TALLER', nombre: 'Talleres Técnicos', nombreCorto: 'Taller', sede: 'Nueva Córdoba', descripcion: 'Talleres de técnica de sentadilla, peso muerto y prevención de lesiones.', activa: true },
    ];

    const planes = [
      { id: 'PL-1', nombre: 'Gimnasio 1 vez por semana', frecuencia: { GYM: 1 }, precio: 54000, activo: true },
      { id: 'PL-2', nombre: 'Gimnasio 2 veces por semana', frecuencia: { GYM: 2 }, precio: 66000, activo: true },
      { id: 'PL-3', nombre: 'Gimnasio 3 veces por semana', frecuencia: { GYM: 3 }, precio: 87000, activo: true },
      { id: 'PL-5', nombre: 'Pase Libre (5 veces por semana)', frecuencia: { GYM: 5 }, precio: 110000, activo: true },
      { id: 'PL-RUN', nombre: 'Running (lunes y miércoles)', frecuencia: { RUN: 2 }, precio: 54000, activo: true },
      { id: 'PL-COMB', nombre: 'Combinado Gimnasio 3x + Running', frecuencia: { GYM: 3, RUN: 2 }, precio: 115000, activo: true },
    ];

    const descuentos = [
      { id: 'D-FAM', nombre: 'Descuento Grupo Familiar', tipo: 'Porcentaje', valor: 10, aplicaA: 'Grupo Familiar', activo: true },
      { id: 'D-COMB', nombre: 'Descuento Gimnasio + Running', tipo: 'Porcentaje', valor: 10, aplicaA: 'Combinación de Actividades', activo: true },
      { id: 'D-REF', nombre: 'Bonificación por referido', tipo: 'Monto fijo', valor: 5000, aplicaA: 'Manual', activo: true },
    ];

    const profesionales = [
      { id: 'P1', nombre: 'Matías Fernández', dni: '30111222', telefono: '351-5129384', email: 'matias@agmen.com.ar', rol: 'Coordinador', especialidades: ['Running'], disponibilidad: [{ dia: 'Lunes', desde: '19:30', hasta: '21:00' }, { dia: 'Miércoles', desde: '19:30', hasta: '21:00' }], activo: true },
      { id: 'P2', nombre: 'Sofía Varela', dni: '31222333', telefono: '351-4829101', email: 'sofia@agmen.com.ar', rol: 'Entrenador', especialidades: ['Musculación', 'Talleres Técnicos'], disponibilidad: L.DIAS_HABILES.map((dia) => ({ dia, desde: '08:00', hasta: '12:00' })), activo: true },
      { id: 'P3', nombre: 'Lucas Giménez', dni: '32333444', telefono: '351-6938201', email: 'lucas@agmen.com.ar', rol: 'Entrenador', especialidades: ['Musculación'], disponibilidad: L.DIAS_HABILES.map((dia) => ({ dia, desde: '14:00', hasta: '21:00' })), activo: true },
    ];

    const personas = [
      persona({
        id: 1, nombre: 'Mauro', apellido: 'Tagliaferri', dni: '34321248', fechaNac: '1989-02-14', telefono: '351-2849926', email: 'mauro89@hotmail.com',
        emergencia: 'Florencia Cavallo (pareja) · 351-5123987', estado: 'Socio Activo', interes: 'RUN', planId: 'PL-COMB',
        turnosFijos: ['GYM-MAR-09', 'GYM-JUE-09', 'GYM-VIE-18', 'RUN-LUN-1930', 'RUN-MIE-1930'], inicioCuenta: d(-200),
        ficha: { fmsPuntaje: '16/21', fmsObservaciones: 'Buena movilidad general. Sentadilla profunda estable con leve rotación externa del pie izquierdo.', lesiones: 'Esguince de tobillo izquierdo (2023), rehabilitado.', limitaciones: 'Dorsiflexión de tobillo izquierdo reducida.', cirugias: 'Ninguna', patologias: 'Ninguna', experiencia: 'Corre 10K recreativos desde 2021.', objetivo: 'Rendimiento', objetivoDetalle: 'Bajar de 50 min en 10K.', actualizada: d(-40) },
        rutina: {
          observacionFms: 'Priorizar movilidad de tobillo izquierdo antes de cargas en sentadilla.',
          sesiones: [
            { nombre: 'Día A · Fuerza tren inferior', ejercicios: [
              { ejercicio: 'Movilidad de tobillo con miniband', series: 2, reps: '10 c/lado', carga: '—', pausa: '30 s' },
              { ejercicio: 'Sentadilla frontal', series: 4, reps: '8', carga: '50 kg', pausa: '2 min' },
              { ejercicio: 'Peso muerto rumano unilateral', series: 3, reps: '12', carga: '14 kg', pausa: '90 s' },
            ] },
            { nombre: 'Día B · Running', ejercicios: [
              { ejercicio: 'Pasadas en Parque Sarmiento', series: 6, reps: '400 m', carga: 'Ritmo 4:50/km', pausa: '90 s trote' },
            ] },
          ],
        },
        seguimiento: [
          { fecha: d(-19), tipo: 'Progresión de carga', ejercicio: 'Sentadilla frontal', detalle: '45 kg → completó 4x8 sin molestias en el tobillo.', profesionalId: 'P2' },
          { fecha: d(-8), tipo: 'Progresión de carga', ejercicio: 'Sentadilla frontal', detalle: 'Subió a 50 kg. Muy buena estabilidad de core.', profesionalId: 'P2' },
        ],
      }),
      persona({
        id: 2, nombre: 'Florencia', apellido: 'Cavallo', dni: '38245102', fechaNac: '1994-07-22', telefono: '351-5123987', email: 'flor.cavallo@gmail.com',
        emergencia: 'Mauro Tagliaferri · 351-2849926', estado: 'Socio Activo', planId: 'PL-2', turnosFijos: ['GYM-MAR-10', 'GYM-JUE-10'], inicioCuenta: d(-150),
        ficha: { fmsPuntaje: '18/21', fmsObservaciones: 'Excelente estabilidad escapular y fuerza de core.', lesiones: 'Sin antecedentes.', limitaciones: 'Ninguna', cirugias: 'Ninguna', patologias: 'Ninguna', experiencia: 'Pilates 2 años.', objetivo: 'Salud', objetivoDetalle: 'Postura y fuerza compensatoria.', actualizada: d(-90) },
        rutina: { observacionFms: 'Sin restricciones.', sesiones: [{ nombre: 'Día A · Full body', ejercicios: [
          { ejercicio: 'Sentadilla goblet', series: 4, reps: '10', carga: '20 kg', pausa: '90 s' },
          { ejercicio: 'Remo con mancuerna', series: 3, reps: '12', carga: '12 kg', pausa: '60 s' },
          { ejercicio: 'Hip thrust', series: 4, reps: '12', carga: '40 kg', pausa: '90 s' },
        ] }] },
      }),
      persona({
        id: 3, nombre: 'Ignacio', apellido: 'Pereyra', dni: '40112984', fechaNac: '1997-03-30', telefono: '351-4998231', email: 'nacho.pereyra@yahoo.com',
        emergencia: 'Silvia Pereyra (madre) · 351-8761234', estado: 'Socio Activo', planId: 'PL-3', turnosFijos: ['GYM-LUN-19', 'GYM-MIE-19', 'GYM-VIE-19'], inicioCuenta: d(-180),
        ficha: { fmsPuntaje: '12/21', fmsObservaciones: 'Rotación torácica limitada y molestia en abducción de hombro derecho.', lesiones: 'Tendinitis del manguito rotador derecho.', limitaciones: 'Evitar press tras nuca y agarres abiertos.', cirugias: 'Ninguna', patologias: 'Ninguna', experiencia: 'Musculación 1 año.', objetivo: 'Readaptación', objetivoDetalle: 'Fortalecer cintura escapular sin dolor.', actualizada: d(-60) },
        rutina: { observacionFms: 'Solo agarre neutro en empujes. Movilidad escapular al inicio.', sesiones: [{ nombre: 'Día A · Tren superior seguro', ejercicios: [
          { ejercicio: 'Movilidad escapular con foam roller', series: 2, reps: '10', carga: '—', pausa: '30 s' },
          { ejercicio: 'Press plano neutro con mancuernas', series: 3, reps: '10', carga: '12 kg', pausa: '90 s' },
          { ejercicio: 'Face pull', series: 4, reps: '15', carga: 'Banda media', pausa: '60 s' },
        ] }] },
        seguimiento: [{ fecha: d(-35), tipo: 'Adaptación de ejercicio', ejercicio: 'Press banca', detalle: 'Se reemplazó press con barra por mancuernas en agarre neutro.', profesionalId: 'P3' }],
      }),
      persona({
        id: 4, nombre: 'Camila', apellido: 'Benítez', dni: '41982334', fechaNac: '1999-10-11', telefono: '351-3871234', email: 'cami.benitez@outlook.com',
        emergencia: 'Lucas Benítez (hermano) · 351-9012384', estado: 'Socio Activo', interes: 'RUN', planId: 'PL-RUN', turnosFijos: ['RUN-LUN-1930', 'RUN-MIE-1930'], inicioCuenta: d(-95),
        ficha: { fmsPuntaje: '17/21', fmsObservaciones: 'Patrón de carrera armónico, buena cadencia.', lesiones: 'Ninguna', limitaciones: 'Ninguna', cirugias: 'Ninguna', patologias: 'Asma leve controlada.', experiencia: 'Running recreativo.', objetivo: 'Salud', objetivoDetalle: 'Correr 5K continuos.', actualizada: d(-95) },
      }),
      persona({ id: 5, nombre: 'Joaquín', apellido: 'Ferrero', dni: '36891450', telefono: '351-6612045', estado: 'Socio Activo', planId: 'PL-3', turnosFijos: ['GYM-LUN-08', 'GYM-MIE-08', 'GYM-VIE-08'], inicioCuenta: d(-240),
        ficha: Object.assign(fichaVacia(), { fmsPuntaje: '14/21', lesiones: 'Lumbalgia mecánica en 2024.', limitaciones: 'Cuidar zona lumbar en peso muerto.', objetivo: 'Fuerza', actualizada: d(-120) }) }),
      persona({ id: 6, nombre: 'Lucía', apellido: 'Vélez', dni: '43120556', telefono: '351-7718203', estado: 'Socio Activo', planId: 'PL-2', turnosFijos: ['GYM-LUN-08', 'GYM-JUE-08'], inicioCuenta: d(-70) }),
      persona({ id: 7, nombre: 'Martín', apellido: 'Rossi', dni: '35770981', telefono: '351-5530921', estado: 'Socio Activo', planId: 'PL-5', turnosFijos: ['GYM-LUN-18', 'GYM-MAR-18', 'GYM-MIE-18', 'GYM-JUE-18', 'GYM-VIE-18'], inicioCuenta: d(-310) }),
      persona({ id: 8, nombre: 'Sofía', apellido: 'Peralta', dni: '42003118', telefono: '351-6024471', estado: 'Socio Activo', planId: 'PL-1', turnosFijos: ['GYM-LUN-08'], inicioCuenta: d(-50) }),
      persona({ id: 9, nombre: 'Gonzalo', apellido: 'Arias', dni: '38990221', telefono: '351-4410298', estado: 'Socio Activo', planId: 'PL-2', turnosFijos: ['GYM-LUN-08', 'GYM-MIE-09'], inicioCuenta: d(-160) }),
      persona({ id: 10, nombre: 'Esteban', apellido: 'Quiroga', dni: '37015447', telefono: '351-3302176', estado: 'Socio Activo', planId: 'PL-1', turnosFijos: ['GYM-LUN-08'], inicioCuenta: d(-130) }),
      persona({ id: 11, nombre: 'Mariana', apellido: 'Gómez', dni: '39540112', telefono: '351-2208413', estado: 'Socio Activo', planId: 'PL-3', turnosFijos: ['GYM-MAR-18', 'GYM-JUE-18', 'GYM-VIE-18'], inicioCuenta: d(-55) }),
      persona({ id: 12, nombre: 'Julián', apellido: 'Soria', dni: '44012876', telefono: '351-6609912', email: 'julisoria@gmail.com', estado: 'Socio Activo', planId: 'PL-2', turnosFijos: ['GYM-MAR-19', 'GYM-JUE-19'], inicioCuenta: hoy }),
      persona({ id: 13, nombre: 'Carla', apellido: 'Zanetti', dni: '36500210', telefono: '351-7123345', estado: 'Socio Inactivo/Baja', planId: 'PL-2', turnosFijos: [], inicioCuenta: d(-200), fechaBaja: d(-10) }),
      persona({ id: 14, nombre: 'Federico', apellido: 'Albarracín', dni: '39812401', fechaNac: '1996-04-12', telefono: '351-6192843', email: 'fede.albarracin@gmail.com', emergencia: 'Marisa Albarracín (madre) · 351-4829102', estado: 'En Día de Prueba', interes: 'GYM' }),
      persona({ id: 15, nombre: 'Valentina', apellido: 'Rossi', dni: '42194820', fechaNac: '2000-08-19', telefono: '351-5719283', email: 'valen.rossi@yahoo.com', emergencia: 'Claudio Rossi (padre) · 351-3918290', estado: 'Interesado', interes: 'GYM' }),
      persona({ id: 16, nombre: 'Tomás', apellido: 'Heredia', dni: '37482910', fechaNac: '1993-11-05', telefono: '351-4091823', email: 'tomas.heredia@hotmail.com', estado: 'En Día de Prueba', interes: 'RUN' }),
      persona({ id: 17, nombre: 'Paula', apellido: 'Ríos', dni: '41233087', telefono: '351-5590321', estado: 'Interesado', interes: 'GYM' }),
    ];

    const grupos = [{ id: 'FAM-01', nombre: 'Familia Tagliaferri – Cavallo', miembros: [1, 2], creado: d(-150) }];

    const pruebas = [
      { id: 1, personaId: 14, fecha: hoy, desde: '18:00', actividadId: 'GYM', profesionalId: 'P3', estado: 'Agendada', notas: 'Quiere ganar fuerza, sin lesiones.' },
      { id: 2, personaId: 16, fecha: d(2), desde: '19:30', actividadId: 'RUN', profesionalId: 'P1', estado: 'Agendada', notas: 'Corrió media maratón en 2024.' },
      { id: 3, personaId: 15, fecha: d(-5), desde: '10:00', actividadId: 'GYM', profesionalId: 'P2', estado: 'Asistió', notas: '' },
      { id: 4, personaId: 17, fecha: d(-12), desde: '17:00', actividadId: 'GYM', profesionalId: 'P3', estado: 'No asistió', notas: '' },
      { id: 5, personaId: 12, fecha: d(-3), desde: '19:00', actividadId: 'GYM', profesionalId: 'P3', estado: 'Convertido', notas: '' },
      { id: 6, personaId: 11, fecha: d(-57), desde: '18:00', actividadId: 'GYM', profesionalId: 'P3', estado: 'Convertido', notas: '' },
    ];

    const reprogramaciones = [
      { id: 1, personaId: 1, tipo: 'Recupero', turnoOrigenId: 'GYM-MAR-09', fechaOrigen: proximoDia(hoy, 'Martes'), turnoDestinoId: 'GYM-MIE-09', fechaDestino: proximoDia(hoy, 'Miércoles'), motivo: 'Compromiso laboral', creado: d(-1) },
    ];

    // Historial de cobros: [personaId, último "vigente hasta" (offset), meses pagados, medio]
    const historial = [
      [1, 18, 4, 'Transferencia Bancaria'], [2, 3, 4, 'Tarjeta de Débito'], [3, -23, 4, 'Efectivo'], [4, 9, 3, 'Transferencia Bancaria'],
      [5, 25, 6, 'Tarjeta de Crédito'], [6, 12, 2, 'Efectivo'], [7, 14, 6, 'Transferencia Bancaria'], [8, 20, 1, 'Efectivo'],
      [9, -41, 3, 'Efectivo'], [10, 1, 4, 'Tarjeta de Débito'], [11, 5, 2, 'Transferencia Bancaria'], [13, -10, 6, 'Efectivo'],
    ];

    const state = {
      version: 1,
      secuencias: { comprobante: 0, cobro: 0, asistencia: 0, persona: 17, prueba: 6, reprogramacion: 1, venta: 0, solicitud: 0, cotizacion: 0, orden: 0, recepcion: 0, factura: 0, pagoProveedor: 0, item: 0, proveedor: 0, profesional: 3, grupo: 1 },
      usuarios: [
        { usuario: 'recepcion', clave: 'recepcion', rol: 'Recepción', nombre: 'Recepción' },
      ],
      sesion: null,
      actividades, planes, descuentos, profesionales,
      turnos: crearGrilla(),
      personas, grupos, pruebas, reprogramaciones,
      cobros: [], comprobantes: [], asistencias: [],
      inventario: [
        { id: 1, tipo: 'Comercial', nombre: 'Avena instantánea 500 g', categoria: 'Dietética', precio: 2800, stock: 18, stockMin: 8, unidad: 'paquetes', activo: true },
        { id: 2, tipo: 'Comercial', nombre: 'Mix frutos secos 150 g', categoria: 'Dietética', precio: 3500, stock: 15, stockMin: 6, unidad: 'bolsas', activo: true },
        { id: 3, tipo: 'Comercial', nombre: 'Proteína whey isolate 1 kg', categoria: 'Suplementos', precio: 38000, stock: 8, stockMin: 4, unidad: 'doypacks', activo: true },
        { id: 4, tipo: 'Comercial', nombre: 'Creatina monohidrato 300 g', categoria: 'Suplementos', precio: 34500, stock: 6, stockMin: 3, unidad: 'potes', activo: true },
        { id: 5, tipo: 'Comercial', nombre: 'Barra proteica 45 g', categoria: 'Snacks', precio: 2500, stock: 4, stockMin: 10, unidad: 'unidades', activo: true },
        { id: 6, tipo: 'Comercial', nombre: 'Granola con miel 500 g', categoria: 'Dietética', precio: 3200, stock: 0, stockMin: 8, unidad: 'paquetes', activo: true },
        { id: 7, tipo: 'Comercial', nombre: 'Bebida isotónica 500 ml', categoria: 'Bebidas', precio: 2200, stock: 24, stockMin: 10, unidad: 'botellas', activo: true },
        { id: 8, tipo: 'Comercial', nombre: 'Agua mineral 500 ml', categoria: 'Bebidas', precio: 1200, stock: 45, stockMin: 15, unidad: 'botellas', activo: true },
        { id: 9, tipo: 'Comercial', nombre: 'Yerba mate 500 g', categoria: 'Snacks', precio: 3200, stock: 12, stockMin: 5, unidad: 'paquetes', activo: true },
        { id: 10, tipo: 'Material interno', nombre: 'Minibands (set x5)', categoria: 'Material gimnasio', precio: 0, stock: 8, stockMin: 12, unidad: 'sets', activo: true },
        { id: 11, tipo: 'Material interno', nombre: 'Colchonetas alta densidad', categoria: 'Material gimnasio', precio: 0, stock: 15, stockMin: 10, unidad: 'unidades', activo: true },
        { id: 12, tipo: 'Material interno', nombre: 'Conos y vallas de running', categoria: 'Material running', precio: 0, stock: 20, stockMin: 15, unidad: 'unidades', activo: true },
      ],
      ventas: [],
      proveedores: [
        { id: 1, nombre: 'NutriSport Córdoba', cuit: '30-71492819-3', contacto: 'Rodrigo Morales', telefono: '351-4229102', email: 'ventas@nutrisportcba.com.ar', rubro: 'Bebidas y suplementos', activo: true },
        { id: 2, nombre: 'Distribuidora San Jerónimo', cuit: '30-68192019-1', contacto: 'Ana Belén Ruiz', telefono: '351-4891029', email: 'pedidos@sanjeronimo.com.ar', rubro: 'Snacks y dietética', activo: true },
        { id: 3, nombre: 'FitEquipment Mediterráneo', cuit: '33-72819204-9', contacto: 'Esteban Rossi', telefono: '351-5128392', email: 'ventas@fitequipment.com.ar', rubro: 'Materiales y accesorios', activo: true },
      ],
      solicitudes: [], cotizaciones: [], ordenes: [], recepciones: [], facturas: [], pagosProveedor: [],
    };

    const seq = (k) => ++state.secuencias[k];

    // Cobros y comprobantes del historial (todos aprobados, en orden cronológico)
    const pagos = [];
    for (const [personaId, offsetHasta, meses, medio] of historial) {
      const p = personas.find((x) => x.id === personaId);
      for (let k = meses - 1; k >= 0; k--) {
        const hasta = L.addMonths(d(offsetHasta), -k);
        pagos.push({ p, desde: L.addMonths(hasta, -1), hasta, medio });
      }
    }
    pagos.sort((a, b) => a.desde.localeCompare(b.desde));
    for (const pago of pagos) {
      const plan = planes.find((x) => x.id === pago.p.planId);
      const liq = L.liquidar(pago.p.estado === 'Socio Activo' ? pago.p : Object.assign({}, pago.p, { estado: 'Socio Activo' }), plan, state);
      const cobroId = seq('cobro');
      const comp = { id: seq('comprobante'), cobroId, personaId: pago.p.id, fecha: pago.desde, planId: plan.id, planNombre: plan.nombre, base: liq.base, descuentos: liq.items, total: liq.total, medio: pago.medio, vigenciaDesde: pago.desde, vigenciaHasta: pago.hasta };
      comp.numero = L.numeroComprobante(comp.id);
      state.cobros.push({ id: cobroId, personaId: pago.p.id, fecha: pago.desde, planId: plan.id, base: liq.base, descuentos: liq.items, total: liq.total, medio: pago.medio, estado: 'Aprobado', vigenciaDesde: pago.desde, vigenciaHasta: pago.hasta, comprobanteId: comp.id });
      state.comprobantes.push(comp);
    }
    // Un pago rechazado y uno pendiente para mostrar los estados de transacción (RF-10)
    const planIgnacio = planes.find((x) => x.id === 'PL-3');
    state.cobros.push({ id: seq('cobro'), personaId: 3, fecha: d(-6), planId: 'PL-3', base: planIgnacio.precio, descuentos: [], total: planIgnacio.precio, medio: 'Tarjeta de Crédito', estado: 'Rechazado', vigenciaDesde: null, vigenciaHasta: null, comprobanteId: null });
    state.cobros.push({ id: seq('cobro'), personaId: 9, fecha: d(-1), planId: 'PL-2', base: 66000, descuentos: [], total: 66000, medio: 'Transferencia Bancaria', estado: 'Pendiente', vigenciaDesde: null, vigenciaHasta: null, comprobanteId: null });

    // Asistencias de las últimas 4 semanas, distintas para cada socio (RF-13/RF-16)
    const tasa = { 1: 0.92, 2: 0.85, 3: 0.55, 4: 0.8, 5: 0.95, 6: 0.75, 7: 0.7, 8: 0.9, 9: 0.5, 10: 0.88, 11: 0.83, 13: 0.6 };
    for (const fecha of L.rangoFechas(d(-28), d(-1))) {
      const dia = L.diaSemana(fecha);
      for (const p of personas) {
        if (!p.inicioCuenta || fecha < p.inicioCuenta || (p.fechaBaja && fecha >= p.fechaBaja)) continue;
        const fijos = p.estado === 'Socio Inactivo/Baja' ? ['GYM-MAR-10', 'GYM-JUE-10'] : p.turnosFijos;
        for (const tId of fijos) {
          const t = state.turnos.find((x) => x.id === tId);
          if (t.dia !== dia) continue;
          const r = azar(`${p.id}|${fecha}|${tId}`);
          if (r > (tasa[p.id] || 0.8)) continue;
          const parcial = r > (tasa[p.id] || 0.8) - 0.08;
          state.asistencias.push({
            id: seq('asistencia'), personaId: p.id, fecha, turnoId: tId,
            horaIngreso: sumarMinutos(t.desde, Math.floor(r * 10) - 3), horaSalida: parcial ? sumarMinutos(t.hasta, -25) : t.hasta,
            cumplimiento: parcial ? 'Parcial' : 'Completa', observaciones: parcial ? 'Se retiró antes por cansancio.' : '', registradoPor: 'Recepción',
          });
        }
      }
    }
    if (personas.find((x) => x.id === 13).estado === 'Socio Inactivo/Baja') {
      personas.find((x) => x.id === 13).turnosFijos = [];
    }

    // Ventas del mostrador y de la tienda del portal
    const ventas = [[1, 1, 1, -1, 'Efectivo'], [3, 4, 1, -1, 'Tarjeta de Débito'], [4, 3, 1, -2, 'Transferencia Bancaria'], [6, 2, 2, -2, 'Efectivo'], [1, 7, 1, 0, 'Efectivo'], [5, 8, 2, 0, 'Efectivo']];
    for (const [personaId, itemId, cantidad, off, medio] of ventas) {
      const item = state.inventario.find((x) => x.id === itemId);
      state.ventas.push({ id: seq('venta'), fecha: d(off), personaId, itemId, cantidad, total: item.precio * cantidad, medio, estado: 'Entregado' });
    }
    state.secuencias.item = state.inventario.length;
    state.secuencias.proveedor = state.proveedores.length;

    // Circuito de compras: solicitud → cotizaciones → OC → recepción → factura → pago
    state.solicitudes.push({ id: seq('solicitud'), itemId: 5, cantidad: 30, fecha: d(-20), estado: 'Con orden de compra' });
    state.solicitudes.push({ id: seq('solicitud'), itemId: 10, cantidad: 10, fecha: d(-6), estado: 'Con orden de compra' });
    state.solicitudes.push({ id: seq('solicitud'), itemId: 6, cantidad: 20, fecha: d(-2), estado: 'Cotizada' });
    state.cotizaciones.push({ id: seq('cotizacion'), solicitudId: 1, proveedorId: 1, precioUnit: 1600, disponibilidad: 'Inmediata', plazoDias: 2, fecha: d(-19), estado: 'Aprobada' });
    state.cotizaciones.push({ id: seq('cotizacion'), solicitudId: 2, proveedorId: 3, precioUnit: 4500, disponibilidad: 'Inmediata', plazoDias: 5, fecha: d(-5), estado: 'Aprobada' });
    state.cotizaciones.push({ id: seq('cotizacion'), solicitudId: 3, proveedorId: 2, precioUnit: 1900, disponibilidad: 'Inmediata', plazoDias: 3, fecha: d(-1), estado: 'Recibida' });
    state.cotizaciones.push({ id: seq('cotizacion'), solicitudId: 3, proveedorId: 1, precioUnit: 2150, disponibilidad: 'En 7 días', plazoDias: 7, fecha: d(-1), estado: 'Recibida' });
    state.ordenes.push({ id: seq('orden'), numero: 'OC-0001', cotizacionId: 1, proveedorId: 1, itemId: 5, cantidad: 30, precioUnit: 1600, total: 48000, fecha: d(-18), aprobadaPor: 'Recepción', estado: 'Recibida conforme' });
    state.ordenes.push({ id: seq('orden'), numero: 'OC-0002', cotizacionId: 2, proveedorId: 3, itemId: 10, cantidad: 10, precioUnit: 4500, total: 45000, fecha: d(-4), aprobadaPor: 'Recepción', estado: 'Emitida' });
    state.recepciones.push({ id: seq('recepcion'), ordenId: 1, fecha: d(-16), cantidadRecibida: 30, resultado: 'Conforme', observaciones: 'Cantidad y vencimientos correctos.', reclamo: null });
    state.facturas.push({ id: seq('factura'), proveedorId: 1, ordenId: 1, numero: 'A-0004-00019284', fecha: d(-16), importe: 48000 });
    state.pagosProveedor.push({ id: seq('pagoProveedor'), facturaId: 1, fecha: d(-10), importe: 20000, medio: 'Transferencia Bancaria' });

    // Hoy: dos socios ya entrenando (ingreso sin salida) si hoy tienen turno
    const enGimnasio = personas.filter((p) => p.estado === 'Socio Activo' && L.estadoCuenta(p, state, hoy).codigo !== 'vencido' && L.turnosDeHoy(p, state, hoy).length).slice(0, 2);
    for (const p of enGimnasio) {
      const t = L.turnosDeHoy(p, state, hoy)[0];
      state.asistencias.push({ id: seq('asistencia'), personaId: p.id, fecha: hoy, turnoId: t.id, horaIngreso: t.desde, horaSalida: null, cumplimiento: null, observaciones: '', registradoPor: 'Recepción' });
    }

    return state;
  }

  function proximoDia(desde, diaNombre) {
    let f = L.addDays(desde, 1);
    while (L.diaSemana(f) !== diaNombre) f = L.addDays(f, 1);
    return f;
  }

  function sumarMinutos(hhmm, min) {
    const [h, m] = hhmm.split(':').map(Number);
    const total = h * 60 + m + min;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  const Data = { crearEstadoInicial, crearGrilla, fichaVacia, persona, proximoDia };
  if (typeof module === 'object' && module.exports) module.exports = Data;
  else root.Data = Data;
})(typeof window !== 'undefined' ? window : globalThis);
