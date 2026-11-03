/**
 * Arma un Store aislado con fecha fija para tests deterministas.
 * HOY = lunes 02/11/2026 (los datos de ejemplo se generan relativos a esta fecha).
 */
const path = require('node:path');

const HOY = '2026-11-02';
const ROOT = path.join(__dirname, '..', '..', 'js');

function crearStore({ rol = 'Recepción', hoy = HOY } = {}) {
  for (const f of ['logic.js', 'data.js', 'store.js']) delete require.cache[require.resolve(path.join(ROOT, f))];
  const memoria = {};
  globalThis.localStorage = {
    getItem: (k) => (k in memoria ? memoria[k] : null),
    setItem: (k, v) => { memoria[k] = String(v); },
    removeItem: (k) => { delete memoria[k]; },
  };
  globalThis.Logic = require(path.join(ROOT, 'logic.js'));
  globalThis.Data = require(path.join(ROOT, 'data.js'));
  require(path.join(ROOT, 'store.js'));
  const Store = globalThis.Store;
  Store.listeners = [];
  Store.hoy = () => hoy;
  Store.ahora = () => '18:30';
  Store.state = null;
  Store.load();
  Store.state.sesion = { tipo: 'personal', rol, nombre: rol };
  return { Store, L: globalThis.Logic, s: () => Store.state, hoy };
}

module.exports = { crearStore, HOY };
