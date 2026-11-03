/**
 * AGMEN — Arranque: login, cambio de pantalla según la sesión y refresco automático al cambiar datos.
 */
(function () {
  'use strict';

  const App = {
    iniciar() {
      Store.load();
      Store.onChange(() => App.refrescar());
      App.conectarLogin();
      document.addEventListener('click', (e) => {
        const accion = e.target.closest('[data-accion]');
        if (!accion) return;
        if (accion.dataset.accion === 'info-issd') UI.infoISSD();
        if (accion.dataset.accion === 'logout') App.logout();
        if (accion.dataset.accion === 'reset-demo') UI.confirmar('Restablecer datos de la demo', 'Se borran todos los cambios hechos en este navegador y se cargan los datos de ejemplo.', () => { Store.reset(); return 'Datos de demostración restablecidos.'; }, { etiqueta: 'Restablecer', peligro: true });
      });
      document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        UI.cerrarModal();
        document.getElementById('comprobante').classList.add('hidden');
      });
      document.getElementById('modal').addEventListener('mousedown', (e) => { if (e.target.id === 'modal') UI.cerrarModal(); });
      App.mostrarPantalla();
    },

    conectarLogin() {
      document.querySelectorAll('[data-login-tab]').forEach((b) => b.addEventListener('click', () => {
        const tab = b.dataset.loginTab;
        document.querySelectorAll('[data-login-tab]').forEach((x) => x.classList.toggle('activo', x === b));
        document.getElementById('form-login-personal').classList.toggle('hidden', tab !== 'personal');
        document.getElementById('form-login-socio').classList.toggle('hidden', tab !== 'socio');
      }));
      document.querySelectorAll('[data-demo-user]').forEach((b) => b.addEventListener('click', () => {
        const f = document.getElementById('form-login-personal');
        f.usuario.value = b.dataset.demoUser;
        f.clave.value = b.dataset.demoUser;
      }));
      document.querySelectorAll('[data-demo-dni]').forEach((b) => b.addEventListener('click', () => { document.getElementById('form-login-socio').dni.value = b.dataset.demoDni; }));

      document.getElementById('form-login-personal').addEventListener('submit', (e) => {
        e.preventDefault();
        // La vista se resetea ANTES del login: el login guarda y dispara el primer render del panel.
        UI.vistaActual = null;
        const s = UI.ejecutar(() => Store.loginPersonal(e.target.usuario.value, e.target.clave.value));
        if (s) { e.target.reset(); UI.toast(`Bienvenido/a, ${s.nombre}.`, 'ok'); }
      });
      document.getElementById('form-login-socio').addEventListener('submit', (e) => {
        e.preventDefault();
        const s = UI.ejecutar(() => Store.loginSocio(e.target.dni.value));
        if (s) {
          e.target.reset();
          Object.assign(Vistas.portal, { tab: 'inicio', hechos: {} });
          Vistas.portal.render();
        }
      });
    },

    logout() {
      UI.cerrarModal();
      Store.logout();
      UI.filtros = {};
      UI.pestanas = {};
    },

    mostrarPantalla() {
      const s = Store.state.sesion;
      document.getElementById('pantalla-login').classList.toggle('hidden', !!s);
      document.getElementById('pantalla-panel').classList.toggle('hidden', !s || s.tipo !== 'personal');
      document.getElementById('pantalla-portal').classList.toggle('hidden', !s || s.tipo !== 'socio');
      if (s && s.tipo === 'personal') UI.renderPanel();
      if (s && s.tipo === 'socio') Vistas.portal.render();
      UI.iconos();
    },

    /** Tras cualquier cambio de datos se redibuja la pantalla activa (los filtros y pestañas se conservan). */
    refrescar() {
      const panelVisible = !document.getElementById('pantalla-panel').classList.contains('hidden');
      const s = Store.state.sesion;
      if (s && s.tipo === 'personal' && panelVisible) {
        UI.renderKpis();
        UI.renderVista();
      } else {
        App.mostrarPantalla();
      }
    },
  };

  window.App = App;
  document.addEventListener('DOMContentLoaded', App.iniciar);
})();
