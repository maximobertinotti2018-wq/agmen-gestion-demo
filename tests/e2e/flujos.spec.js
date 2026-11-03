// E2E: recorre la app como un usuario real. Cada test arranca con los datos de demostración limpios.
const { test, expect } = require('@playwright/test');

async function abrir(page) {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

async function loginPersonal(page, usuario) {
  await abrir(page);
  await page.fill('#form-login-personal input[name=usuario]', usuario);
  await page.fill('#form-login-personal input[name=clave]', usuario);
  await page.click('#form-login-personal button[type=submit], #form-login-personal button:not([type])');
  await expect(page.locator('#pantalla-panel')).toBeVisible();
}

async function loginSocio(page, dni) {
  await page.click('#tab-login-socio');
  await page.fill('#form-login-socio input[name=dni]', dni);
  await page.click('#form-login-socio button:not([type=button])');
  await expect(page.locator('#pantalla-portal')).toBeVisible();
}

const modal = (page) => page.locator('#modal-caja');

test.describe('RF-13 / RF-16 Recepción', () => {
  test('registra ingreso mostrando el nombre y la salida corresponde al socio elegido', async ({ page }) => {
    await loginPersonal(page, 'recepcion');
    await page.fill('#buscar-ingreso', 'Quiroga');
    await page.click('#resultados-ingreso button');
    await expect(page.locator('#ficha-ingreso')).toContainText('Esteban Quiroga');
    await expect(page.locator('#ficha-ingreso')).toContainText('Vence en 1 día');
    await page.click('#ficha-ingreso >> text=Registrar ingreso');
    await expect(page.locator('#toasts')).toContainText('Ingreso registrado: Esteban Quiroga');
    const adentro = page.locator('#lista-adentro');
    await expect(adentro).toContainText('Esteban Quiroga');
    await expect(adentro).toContainText('Mauro Tagliaferri');

    await adentro.locator('div.card-sub', { hasText: 'Esteban Quiroga' }).getByRole('button', { name: 'Salida' }).click();
    await expect(modal(page)).toContainText('Registrar salida · Esteban Quiroga');
    await modal(page).locator('select[name=cumplimiento]').selectOption('Completa');
    await modal(page).getByRole('button', { name: 'Registrar salida' }).click();
    await expect(page.locator('#toasts')).toContainText('Salida registrada: Esteban Quiroga');
    await expect(adentro).not.toContainText('Esteban Quiroga');
    await expect(adentro).toContainText('Mauro Tagliaferri');
    await expect(page.locator('#registro-dia tr', { hasText: 'Esteban Quiroga' })).toContainText('Completa');
    await page.screenshot({ path: 'test-results/capturas/recepcion.png', fullPage: true });
  });

  test('bloquea a un socio vencido, permite cobrarle y luego ingresar', async ({ page }) => {
    await loginPersonal(page, 'recepcion');
    await page.fill('#buscar-ingreso', '40112984');
    await page.keyboard.press('Enter');
    await expect(page.locator('#ficha-ingreso')).toContainText('Vencido');
    await expect(page.locator('#ficha-ingreso')).not.toContainText('Moroso');
    await expect(page.locator('#ficha-ingreso')).toContainText('Alertas físicas');
    await expect(page.locator('#ficha-ingreso').getByRole('button', { name: 'Registrar ingreso' })).toHaveCount(0);
    await page.click('#ficha-ingreso >> text=Cobrar cuota');
    await expect(modal(page)).toContainText('Total a cobrar');
    await modal(page).locator('select[name=medio]').selectOption('Tarjeta de Débito');
    await modal(page).getByRole('button', { name: 'Registrar cobro' }).click();
    const comp = page.locator('#comprobante-hoja');
    await expect(comp).toBeVisible();
    await expect(comp).toContainText('Ignacio Pereyra');
    await expect(comp).toContainText('Tarjeta de Débito');
    await expect(comp).toContainText(/0001-\d{8}/);
    await page.screenshot({ path: 'test-results/capturas/comprobante.png' });
  });
});

test.describe('RF-01 / RF-08 / RF-10 Alta de socio', () => {
  test('un socio nuevo queda con UNA cuota pendiente y sus turnos ocupan cupo', async ({ page }) => {
    await loginPersonal(page, 'recepcion');
    await page.click('[data-vista=personas]');
    await page.click('text=Registrar interesado');
    const m = modal(page);
    await m.locator('[name=nombre]').fill('Lara');
    await m.locator('[name=apellido]').fill('Ibáñez');
    await m.locator('[name=dni]').fill('46123456');
    await m.locator('[name=telefono]').fill('351-5550000');
    await m.getByRole('button', { name: 'Registrar' }).click();
    await expect(page.locator('#tabla-padron')).toContainText('Ibáñez, Lara');

    await page.locator('#tabla-padron tr', { hasText: 'Ibáñez' }).getByRole('button', { name: 'Estado' }).click();
    await m.locator('[name=estado]').selectOption('Socio Activo');
    await m.locator('[name=planId]').selectOption('PL-1');
    await m.getByRole('button', { name: 'Aplicar' }).click();
    await expect(m).toContainText('Turnos fijos · Lara Ibáñez');
    await m.locator('input[value="GYM-MAR-11"]').check();
    await m.getByRole('button', { name: 'Guardar turnos' }).click();

    await page.click('[data-vista=caja]');
    await page.fill('input[placeholder="Buscar socio por nombre o DNI"]', 'Ibáñez');
    const fila = page.locator('#tabla-cuotas tr', { hasText: 'Lara Ibáñez' });
    await expect(fila).toContainText('Primera cuota pendiente');
    await expect(fila).toContainText('1 cuota(s)');

    await page.click('[data-vista=turnos]');
    await page.click('button.nav-item:has-text("Martes")');
    await expect(page.locator('#vista')).toContainText('Lara I.');
  });
});

test.describe('RF-08 Grilla con los horarios de AGMEN', () => {
  test('gimnasio 08–12 y 14–21 en bloques de 1 h; running lunes 19:30–21 sin cupo', async ({ page }) => {
    await loginPersonal(page, 'recepcion');
    await page.click('[data-vista=turnos]');
    await page.click('button.nav-item:has-text("Lunes")');
    const vista = page.locator('#vista');
    for (const h of ['08:00 – 09:00', '11:00 – 12:00', '14:00 – 15:00', '20:00 – 21:00', '19:30 – 21:00']) await expect(vista).toContainText(h);
    await expect(vista).not.toContainText('12:00 – 13:00');
    await expect(vista.locator('.card', { hasText: '08:00 – 09:00' })).toContainText('Completo');
    await expect(vista.locator('.card', { hasText: '19:30 – 21:00' })).toContainText('sin límite de cupo');
    await page.screenshot({ path: 'test-results/capturas/grilla.png', fullPage: true });
  });
});

test.describe('RF-10 Pago pendiente dentro del cobro', () => {
  test('al elegir un socio con transferencia pendiente se resuelve ahí mismo y después se puede cobrar', async ({ page }) => {
    await loginPersonal(page, 'recepcion');
    await page.click('[data-vista=caja]');
    await page.click('#vista >> text=Cobrar cuota');
    const m = modal(page);
    await m.locator('[name=personaId]').selectOption({ label: 'Arias, Gonzalo · DNI 38990221' });
    await expect(m.locator('#cobro-pendiente')).toContainText('$ 66.000');
    await expect(m.getByRole('button', { name: 'Registrar cobro' })).toBeDisabled();
    await m.getByRole('button', { name: 'Se acreditó: aprobar' }).click();
    await expect(page.locator('#toasts')).toContainText('Pago aprobado');
    await expect(m.locator('#cobro-pendiente')).toHaveCount(0);
    await expect(m).toContainText('Total a cobrar');
    await expect(m.getByRole('button', { name: 'Registrar cobro' })).toBeEnabled();
  });
});

test.describe('Barra superior y caja', () => {
  test('la barra superior solo muestra contadores, sin listar alumnos vencidos', async ({ page }) => {
    await loginPersonal(page, 'recepcion');
    const kpis = page.locator('#barra-kpis');
    await expect(kpis).toContainText('Cuotas a cobrar');
    await expect(kpis).not.toContainText('Pereyra');
    await page.click('[data-vista=caja]');
    await page.click('text=Movimientos de caja');
    await expect(page.locator('#vista')).toContainText('Total del día');
    await expect(page.locator('#vista')).toContainText('Por medio de pago');
    await expect(page.locator('#vista')).toContainText('Cobros pendientes de confirmar');
  });
});

test.describe('Portal del socio', () => {
  test('cada socio ve SUS asistencias y pagos (no los mismos para todos)', async ({ page }) => {
    await abrir(page);
    await loginSocio(page, '34321248');
    await page.click('text=Mis asistencias');
    const mauro = await page.locator('#pantalla-portal main').innerText();
    await page.click('text=Salir');
    await loginSocio(page, '41982334');
    await page.click('text=Mis asistencias');
    const camila = await page.locator('#pantalla-portal main').innerText();
    expect(mauro).not.toEqual(camila);
    await page.click('text=Mis pagos');
    await expect(page.locator('#pantalla-portal main')).toContainText('0001-');
  });

  test('el socio ve su rutina pero no puede configurarla ni modificarla', async ({ page }) => {
    await abrir(page);
    await loginSocio(page, '34321248');
    await page.click('text=Mi rutina');
    const main = page.locator('#pantalla-portal main');
    await expect(main).toContainText('Sentadilla frontal');
    await expect(main.locator('input:not([type=checkbox]), textarea')).toHaveCount(0);
    await expect(main.getByRole('button', { name: /Guardar rutina|Modificar|Armar/ })).toHaveCount(0);
  });

  test('un socio dado de baja no puede entrar al portal', async ({ page }) => {
    await abrir(page);
    await page.click('#tab-login-socio');
    await page.fill('#form-login-socio input[name=dni]', '36500210');
    await page.click('#form-login-socio button:not([type=button])');
    await expect(page.locator('#toasts')).toContainText('Socio Inactivo/Baja');
  });
});

test.describe('Permisos por rol y entrenamiento', () => {
  test('el login solo ofrece el usuario recepcion', async ({ page }) => {
    await abrir(page);
    await expect(page.locator('[data-demo-user]')).toHaveCount(1);
    for (const u of ['admin', 'entrenador']) {
      await page.fill('#form-login-personal input[name=usuario]', u);
      await page.fill('#form-login-personal input[name=clave]', u);
      await page.click('#form-login-personal button:not([type])');
      await expect(page.locator('#toasts')).toContainText('incorrectos');
    }
  });

  test('recepción ve todos los módulos y registra seguimiento en sesión con su entrenador (RF-15)', async ({ page }) => {
    await loginPersonal(page, 'recepcion');
    await expect(page.locator('#nav-principal .nav-item')).toHaveCount(8);
    await page.click('[data-vista=entrenamiento]');
    await page.click('#lista-alumnos >> text=Tagliaferri');
    await expect(page.locator('#panel-alumno')).toContainText('Rutina activa');
    await page.fill('#panel-alumno textarea[name=detalle]', 'Sentadilla frontal 55 kg 4x8');
    await page.click('#panel-alumno >> button:has-text("Registrar")');
    await expect(page.locator('#panel-alumno')).toContainText('Sentadilla frontal 55 kg 4x8');
  });
});

test.describe('RF-17 / RF-18 Stock y compras', () => {
  test('genera solicitudes de compra desde la alerta de stock', async ({ page }) => {
    await loginPersonal(page, 'recepcion');
    await page.click('[data-vista=stock]');
    await expect(page.locator('#vista')).toContainText('en o por debajo del stock mínimo');
    await page.click('text=Generar solicitudes de compra');
    await expect(page.locator('#vista')).toContainText('Barra proteica 45 g');
    await page.locator('.card', { hasText: 'Granola' }).getByRole('button', { name: 'Aprobar y emitir OC' }).first().click();
    await modal(page).getByRole('button', { name: 'Emitir OC' }).click();
    await expect(page.locator('#toasts')).toContainText('emitida');
  });
});

test.describe('RF-21 Reportes y matriz de requerimientos', () => {
  test('muestra los tres reportes y se filtra por profesor', async ({ page }) => {
    await loginPersonal(page, 'recepcion');
    await page.click('[data-vista=reportes]');
    const v = page.locator('#vista');
    for (const t of ['Tasa de ocupación de horarios', 'Morosidad y estado de cobranzas', 'Asistencia y retención']) await expect(v).toContainText(t);
    await v.locator('select').nth(1).selectOption('P2');
    await expect(v).toContainText('Sofía Varela');
    await page.screenshot({ path: 'test-results/capturas/reportes.png', fullPage: true });
  });

  test('la matriz lista los 21 RF implementados', async ({ page }) => {
    await loginPersonal(page, 'recepcion');
    await page.click('[data-vista=requisitos]');
    await expect(page.locator('#vista table').first().locator('tbody tr')).toHaveCount(21);
  });
});

test('no hay errores de JavaScript recorriendo todos los módulos', async ({ page }) => {
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  await loginPersonal(page, 'recepcion');
  for (const v of ['recepcion', 'personas', 'turnos', 'entrenamiento', 'caja', 'stock', 'reportes', 'requisitos']) {
    await page.click(`[data-vista=${v}]`);
    for (const tab of await page.locator('#vista .tab').all()) await tab.click();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.click('[data-vista=recepcion]');
  const anchoDoc = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(anchoDoc).toBeLessThanOrEqual(390);
  expect(errores).toEqual([]);
});
