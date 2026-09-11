// Uses the installed APK's actual Android WebView. Authentication is mocked;
// account/session correctness is covered separately by backend integration tests.
const { chromium, expect } = require('../../Frontend/node_modules/@playwright/test');
const { execFileSync } = require('node:child_process');
const { join } = require('node:path');
const { mkdirSync } = require('node:fs');
const sdk = process.env.ANDROID_HOME || join(process.env.LOCALAPPDATA, 'Android', 'Sdk');
const adb = join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
const pid = execFileSync(adb, ['shell', 'pidof', 'com.stickerstudio'], { encoding: 'utf8' }).trim();
execFileSync(adb, ['forward', 'tcp:9223', `localabstract:webview_devtools_remote_${pid}`]);

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { noDefaults: true });
  const context = browser.contexts()[0];
  const page = context.pages().find(item => item.url().includes('localhost:5175'));
  if (!page) throw new Error('Ouvrez Sticker Studio dans l’émulateur.');
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  let user = null;
  const handler = async route => {
    const path = new URL(route.request().url()).pathname;
    let data;
    if (path === '/api/auth/me') data = { user };
    else if (path === '/api/auth/providers') data = { google: false, googleLinked: false };
    else if (path === '/api/auth/register' || path === '/api/auth/login') {
      user = { id: 'android-verification', name: 'Camille', email: 'android@example.test' };
      data = { user };
    } else if (path === '/api/auth/logout') { user = null; data = {}; }
    else if (path === '/api/library') data = { name: 'Mon premier pack', stickers: [], packs: [], activePackId: null };
    else return route.abort();
    await route.fulfill({ json: data });
  };
  await page.route('**/api/**', handler);
  const artifacts = join(__dirname, '..', '.verification');
  mkdirSync(artifacts, { recursive: true });
  async function capture(name) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: join(artifacts, `${name}.png`) });
    console.log(`OK ${name}`);
  }
  try {
    await page.goto('http://localhost:5175/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Des stickers');
    await capture('accueil');
    await page.getByRole('link', { name: 'Créer mon premier sticker', exact: true }).click();
    await expect(page.getByRole('navigation', { name: 'Outils mobiles' })).toBeVisible();
    await page.getByRole('navigation', { name: 'Outils mobiles' }).getByRole('button', { name: 'Texte', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Votre texte' })).toBeVisible();
    await page.getByRole('button', { name: 'Zoom', exact: true }).click();
    await expect(page.getByRole('slider', { name: 'Zoom du texte' })).toBeVisible();
    await capture('atelier');
    await page.getByRole('button', { name: 'Fermer les réglages' }).click();
    await page.getByRole('button', { name: 'Aperçu conversation' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await capture('conversation');
    await page.keyboard.press('Escape');
    await page.goto('http://localhost:5175/inscription');
    await expect(page.getByRole('heading', { name: 'Créez votre compte' })).toBeVisible();
    await capture('inscription');
    await page.getByLabel('Votre prénom', { exact: true }).fill('Camille');
    await page.getByLabel('Adresse e-mail', { exact: true }).fill('android@example.test');
    await page.getByLabel('Mot de passe', { exact: true }).fill('Android verification 123!');
    await page.getByRole('button', { name: 'Créer mon compte', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Camille');
    await capture('collection');
    await page.getByRole('button', { name: 'Se déconnecter' }).click();
    await page.getByRole('link', { name: 'Se connecter', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Bon retour !' })).toBeVisible();
    await capture('connexion');
    expect(errors).toEqual([]);
    console.log('Les cinq pages et l’aperçu sont validés dans la WebView Android.');
  } finally {
    await page.unroute('**/api/**', handler);
    await page.goto('http://localhost:5175/atelier');
    // Disconnect CDP without closing the user's app.
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
