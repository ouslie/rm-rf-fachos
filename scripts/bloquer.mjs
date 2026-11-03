#!/usr/bin/env node
// rm-rf-fachos, version script Playwright.
// Bloque depuis vos propres comptes les comptes listés sur onbloquelextremedroite.fr,
// puis déclare chaque blocage sur le site. Aucun agent IA nécessaire.
//
//   node scripts/bloquer.mjs --connexion                    # 1re fois : se connecter aux plateformes
//   node scripts/bloquer.mjs --cartes 10 --plateformes instagram,facebook,tiktok,youtube
//
// Le script ne saisit jamais d'identifiants et s'arrête net sur une limite de plateforme,
// une demande de connexion ou une vérification de sécurité.

import { chromium } from 'playwright';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';

const SITE = 'https://www.onbloquelextremedroite.fr/';
const NETS = ['Instagram', 'Facebook', 'X', 'TikTok', 'YouTube', 'LinkedIn'];
const LOGIN = {
  Instagram: 'https://www.instagram.com/accounts/login/',
  Facebook: 'https://www.facebook.com/login/',
  TikTok: 'https://www.tiktok.com/login',
  YouTube: 'https://accounts.google.com/ServiceLogin?service=youtube',
  X: 'https://x.com/login',
  LinkedIn: 'https://www.linkedin.com/login',
};

const { values: opts } = parseArgs({
  options: {
    cartes: { type: 'string', default: '10' },
    plateformes: { type: 'string', default: 'instagram,facebook,tiktok,youtube' },
    pause: { type: 'string', default: '4' },
    profil: { type: 'string', default: join(homedir(), '.rm-rf-fachos', 'profil') },
    connexion: { type: 'boolean', default: false },
    essai: { type: 'boolean', default: false },
    aide: { type: 'boolean', short: 'h', default: false },
  },
});

if (opts.aide) {
  console.log(`Usage : node scripts/bloquer.mjs [options]

  --connexion            Ouvre les pages de connexion des plateformes choisies, puis attend Entrée.
  --cartes N             Nombre de cartes où au moins un blocage est fait (défaut : 10). 0 = sans limite.
  --plateformes a,b,c    instagram, facebook, tiktok, youtube (défaut : les quatre).
  --pause S              Secondes d'attente entre deux blocages (défaut : 4).
  --profil DOSSIER       Profil Chrome qui garde vos connexions (défaut : ~/.rm-rf-fachos/profil).
  --essai                Lit les cartes et ouvre les profils, sans rien bloquer ni déclarer.`);
  process.exit(0);
}

const wanted = opts.plateformes.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  .map(s => NETS.find(n => n.toLowerCase() === s) ?? (console.error(`Plateforme inconnue : ${s}`), process.exit(1)));
if (!/^\d+$/.test(opts.cartes)) { console.error(`--cartes attend un nombre entier (0 = sans limite), pas « ${opts.cartes} ».`); process.exit(1); }
if (!/^\d+(\.\d+)?$/.test(opts.pause)) { console.error(`--pause attend un nombre de secondes, pas « ${opts.pause} ».`); process.exit(1); }
const maxCards = Number(opts.cartes) || Infinity;
const pauseMs = Number(opts.pause) * 1000;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const STOP = new Set(['CONNEXION_REQUISE', 'LIMITE_PLATEFORME', 'VERIFICATION_SECURITE']);

// ---------------------------------------------------------------------------
// Scripts de blocage, exécutés dans la page de la plateforme.
// Chacun renvoie un code d'état : BLOQUE, DEJA_BLOQUE, PROFIL_INTROUVABLE,
// CONNEXION_REQUISE, LIMITE_PLATEFORME, VERIFICATION_SECURITE ou un code d'erreur.
// ---------------------------------------------------------------------------

const BLOCKERS = {
  // Testé le 3 novembre 2026.
  Instagram: async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const vis = e => e && e.getClientRects().length > 0;
    const btn = (t, root = document) => [...root.querySelectorAll('button, [role="button"]')].find(e => vis(e) && e.textContent.trim() === t);
    const waitFor = async (fn, ms = 6000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const r = fn(); if (r) return r; await sleep(150); } return null; };
    const body = () => document.body.innerText;
    await waitFor(() => document.querySelector('header'), 8000);
    if (/accounts\/login/.test(location.href) || document.querySelector('input[name="password"]')) return 'CONNEXION_REQUISE';
    if (/challenge|captcha/i.test(location.href)) return 'VERIFICATION_SECURITE';
    if (/Cette page n.est pas disponible|Sorry, this page isn.t available/i.test(body())) return 'PROFIL_INTROUVABLE';
    const opt = await waitFor(() => document.querySelector('header svg[aria-label="Options"]') || document.querySelector('svg[aria-label="Options"]'));
    if (btn('Débloquer') || btn('Unblock')) return 'DEJA_BLOQUE';
    if (!opt) return 'OPTIONS_INTROUVABLE';
    (opt.closest('[role="button"], button') || opt.parentElement).click();
    const b1 = await waitFor(() => btn('Bloquer') || btn('Block') || btn('Débloquer') || btn('Unblock'));
    if (!b1) return 'MENU_BLOQUER_INTROUVABLE';
    if (/^(Débloquer|Unblock)$/.test(b1.textContent.trim())) { btn('Annuler')?.click(); return 'DEJA_BLOQUE'; }
    b1.click();
    const confirm = await waitFor(() => { const d = [...document.querySelectorAll('[role="dialog"]')].find(d => /Bloquer\s+\S+\s*\?/.test(d.innerText)); return d && btn('Bloquer', d); });
    if (!confirm) return 'CONFIRMATION_INTROUVABLE';
    confirm.click();
    const done = await waitFor(() => /Blocage de |Action bloquée|Réessayez plus tard|Try Again Later/i.test(body()) ? body() : null, 8000);
    if (!done) return 'RESULTAT_INCONNU';
    if (/Action bloquée|Réessayez plus tard|Try Again Later/i.test(done)) return 'LIMITE_PLATEFORME';
    btn('Fermer')?.click();
    return 'BLOQUE';
  },

  // Testé sur une Page Facebook. Pour un profil personnel, le menu peut différer.
  Facebook: async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const vis = e => e && e.getClientRects().length > 0;
    const label = e => (e.getAttribute('aria-label') || e.innerText || '').trim();
    const waitFor = async (fn, ms = 6000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const r = fn(); if (r) return r; await sleep(200); } return null; };
    const dialog = re => [...document.querySelectorAll('[role="dialog"]')].find(d => vis(d) && re.test(d.innerText));
    const inDialog = (d, t) => d && [...d.querySelectorAll('[role="button"], button')].find(e => vis(e) && label(e) === t);
    const body = () => document.body.innerText;
    await waitFor(() => document.querySelector('[role="main"]'), 8000);
    if (document.querySelector('input[name="pass"]') || /\/login/.test(location.href)) return 'CONNEXION_REQUISE';
    if (/checkpoint|captcha/i.test(location.href)) return 'VERIFICATION_SECURITE';
    if (/Ce contenu n.est pas disponible|This content isn.t available/i.test(body())) return 'INDISPONIBLE';
    const opt = await waitFor(() => [...document.querySelectorAll('[aria-label]')].find(e => vis(e) && /voir plus d.options$|^Voir plus d.options|See more options/i.test(e.getAttribute('aria-label'))));
    if (!opt) return 'OPTIONS_INTROUVABLE';
    opt.click();
    const item = await waitFor(() => [...document.querySelectorAll('[role="menuitem"]')].find(e => vis(e) && /^(Bloquer|Block)$/.test(e.innerText.trim().split('\n')[0])));
    if (!item) {
      if ([...document.querySelectorAll('[role="menuitem"]')].some(e => /^Débloquer/.test(e.innerText.trim()))) return 'DEJA_BLOQUE';
      return 'MENU_BLOQUER_INTROUVABLE';
    }
    item.click();
    const ok = await waitFor(() => inDialog(dialog(/^(Bloquer|Block) .+\?/), 'Confirmer') || inDialog(dialog(/^(Bloquer|Block) .+\?/), 'Confirm'));
    if (!ok) return 'CONFIRMATION_INTROUVABLE';
    ok.click();
    const done = await waitFor(() => dialog(/Vous avez bloqué|You blocked|Réessayez plus tard|Try again later/i), 12000);
    if (!done) return 'RESULTAT_INCONNU';
    if (/Réessayez plus tard|Try again later/i.test(done.innerText)) return 'LIMITE_PLATEFORME';
    inDialog(done, 'Fermer')?.click();
    return 'BLOQUE';
  },

  // Testé le 3 novembre 2026 (une fois, à la main) : « ... » (Actions), Bloquer, puis Bloquer.
  TikTok: async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const vis = e => e && e.getClientRects().length > 0;
    const waitFor = async (fn, ms = 6000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const r = fn(); if (r) return r; await sleep(150); } return null; };
    const body = () => document.body.innerText;
    const follow = () => document.querySelector('[data-e2e="follow-button"]');
    await waitFor(() => document.querySelector('[data-e2e="user-title"]') || /Impossible de trouver ce compte|Couldn.t find this account/i.test(body()), 10000);
    if (document.querySelector('#captcha-verify-container, [id*="captcha"]')) return 'VERIFICATION_SECURITE';
    if (/Impossible de trouver ce compte|Couldn.t find this account/i.test(body())) return 'PROFIL_INTROUVABLE';
    if (vis(document.querySelector('[data-e2e="top-login-button"]'))) return 'CONNEXION_REQUISE';
    if (/^Débloquer|^Unblock/.test(follow()?.textContent.trim() || '')) return 'DEJA_BLOQUE';
    const more = await waitFor(() => document.querySelector('[data-e2e="user-more"]'));
    if (!more) return 'OPTIONS_INTROUVABLE';
    more.click();
    const item = await waitFor(() => [...document.querySelectorAll('[role="button"]')].find(e => vis(e) && /^(Bloquer|Block)$/.test(e.textContent.trim())));
    if (!item) return 'MENU_BLOQUER_INTROUVABLE';
    item.click();
    const ok = await waitFor(() => [...document.querySelectorAll('button')].find(e => vis(e) && e !== item && /^(Bloquer|Block)$/.test(e.textContent.trim()) && e.closest('[role="dialog"], [class*="Modal"], [class*="modal"]')));
    if (!ok) return 'CONFIRMATION_INTROUVABLE';
    ok.click();
    const done = await waitFor(() => /^Débloquer|^Unblock/.test(follow()?.textContent.trim() || '') || /Réessaie plus tard|Réessayez plus tard|Try again later|trop rapidement/i.test(body()) ? true : null, 8000);
    if (!done) return 'RESULTAT_INCONNU';
    if (!/^Débloquer|^Unblock/.test(follow()?.textContent.trim() || '')) return 'LIMITE_PLATEFORME';
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    return 'BLOQUE';
  },

  // Sur YouTube, bloquer = « Masquer l'utilisateur sur ma chaîne ». Testé sur Europe 1.
  YouTube: async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const vis = e => e && e.getClientRects().length > 0;
    const label = e => (e.getAttribute('aria-label') || e.innerText || '').trim();
    const waitFor = async (fn, ms = 6000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const r = fn(); if (r) return r; await sleep(200); } return null; };
    const clickable = () => [...document.querySelectorAll('button, a, [role="button"]')].filter(vis);
    const items = () => [...document.querySelectorAll('tp-yt-paper-item[role="menuitem"]')].filter(vis);
    await waitFor(() => document.querySelector('ytd-app'), 8000);
    const who = await waitFor(() => document.querySelector('#avatar-btn') || [...document.querySelectorAll('a[href*="ServiceLogin"], ytd-button-renderer a[aria-label]')].find(e => vis(e) && /Se connecter|Sign in/i.test(e.getAttribute('aria-label') || e.textContent)), 10000);
    if (!who) return 'PAGE_NON_CHARGEE';
    if (who.id !== 'avatar-btn') return 'CONNEXION_REQUISE';
    const desc = await waitFor(() => clickable().find(e => /^Description/.test(e.getAttribute('aria-label') || '')));
    if (!desc) return 'DESCRIPTION_INTROUVABLE';
    desc.click();
    const flag = await waitFor(() => clickable().find(e => label(e) === "Signaler l'utilisateur"));
    if (!flag) return 'MENU_INTROUVABLE';
    flag.click();
    const masquer = await waitFor(() => items().find(e => /^(Masquer|Afficher) l.utilisateur sur ma chaîne$/.test(e.innerText.trim())));
    if (!masquer) return 'MASQUER_INTROUVABLE';
    if (/^Afficher/.test(masquer.innerText.trim())) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return 'DEJA_BLOQUE'; }
    masquer.click();
    const ok = await waitFor(() => {
      const d = [...document.querySelectorAll('tp-yt-paper-dialog, yt-confirm-dialog-renderer, [role="dialog"], [role="alertdialog"]')].find(e => vis(e) && /^Masquer l.utilisateur\n/.test(e.innerText.trim()));
      return d && [...d.querySelectorAll('button, [role="button"]')].find(e => vis(e) && label(e) === 'Envoyer');
    });
    if (!ok) return 'CONFIRMATION_INTROUVABLE';
    ok.click();
    await sleep(2500);
    const flag2 = clickable().find(e => label(e) === "Signaler l'utilisateur");
    if (!flag2) return 'RESULTAT_INCONNU';
    flag2.click();
    const check = await waitFor(() => items().find(e => /^Afficher l.utilisateur sur ma chaîne$/.test(e.innerText.trim())), 4000);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    return check ? 'BLOQUE' : 'RESULTAT_INCONNU';
  },
};

// Lance le script de blocage. Certaines plateformes (TikTok) rechargent la page juste après
// l'ouverture : on attend qu'elle se stabilise et on réessaie.
async function runBlocker(page, fn) {
  for (let i = 0; i < 3; i++) {
    await page.waitForLoadState('load', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);
    try { return await page.evaluate(fn); }
    catch (e) {
      if (!/Execution context was destroyed|navigation/i.test(e.message) || i === 2) return 'ERREUR : ' + e.message.split('\n')[0];
    }
  }
}

// ---------------------------------------------------------------------------
// Le site
// ---------------------------------------------------------------------------

// Lit la carte en cours : nom affiché et état de chaque réseau.
async function readCard(site) {
  await site.locator('a[aria-label^="Ouvrir pour bloquer"], a[aria-label^="Blocage déclaré"], button[aria-label^="Ajouter le compte"]')
    .first().waitFor({ timeout: 15000 }).catch(() => {});
  return site.evaluate(NETS => {
    const nets = NETS.join('|');
    const reOuvrir = new RegExp('^Ouvrir pour bloquer (.+) sur (' + nets + ')$');
    const reDeclare = new RegExp('^Blocage déclaré : ouvrir .+ sur (' + nets + ')$');
    const reAjouter = new RegExp('^Ajouter le compte (' + nets + ') de .+$');
    const out = { carte: document.querySelector('article h1, article h2, article h3')?.textContent.trim() || null, reseaux: {} };
    for (const e of document.querySelectorAll('a[aria-label], button[aria-label]')) {
      const l = (e.getAttribute('aria-label') || '').trim();
      let m;
      if ((m = l.match(reOuvrir))) out.reseaux[m[2]] = { etat: 'A_BLOQUER', label: l, nom: m[1] };
      else if ((m = l.match(reDeclare))) out.reseaux[m[1]] = { etat: 'DEJA_DECLARE' };
      else if ((m = l.match(reAjouter))) out.reseaux[m[1]] = { etat: 'PAS_DE_COMPTE' };
    }
    return out;
  }, NETS);
}

// Déclare le blocage. Le site n'affiche « C'est bloqué ? » qu'au retour sur son onglet :
// on simule ce retour (blur puis focus), et on recharge la page si ça ne suffit pas.
async function declare(site, nom, reseau) {
  const yes = site.locator('button', { hasText: /OUI, JE L.AI BLOQU/i });
  for (const attempt of ['focus', 'reload']) {
    if (attempt === 'focus') await site.evaluate(() => { window.dispatchEvent(new Event('blur')); window.dispatchEvent(new Event('focus')); });
    else await site.reload({ waitUntil: 'domcontentloaded' });
    if (await yes.waitFor({ state: 'visible', timeout: attempt === 'focus' ? 2500 : 8000 }).then(() => true, () => false)) {
      const q = (await site.locator('#dialog-copy').textContent().catch(() => '')) || '';
      if (!q.includes(nom) || !q.includes('sur ' + reseau)) {
        await site.keyboard.press('Escape');
        return 'MAUVAISE_QUESTION : ' + q.trim();
      }
      await yes.click();
      await sleep(1200);
      return 'DECLARE';
    }
  }
  return 'FENETRE_ABSENTE';
}

// Ferme la fenêtre « C'est bloqué ? » sans confirmer : le site oublie le blocage en cours.
async function dismissDialog(site) {
  await site.evaluate(async () => {
    window.dispatchEvent(new Event('blur')); window.dispatchEvent(new Event('focus'));
    await new Promise(r => setTimeout(r, 400));
    const d = document.querySelector('#block-dialog');
    if (d?.open) d.close();
  }).catch(() => {});
}

// Passe à la carte suivante. Renvoie false s'il n'y a plus de carte.
async function nextCard(site, current) {
  await site.reload({ waitUntil: 'domcontentloaded' });
  await site.waitForTimeout(800);
  await dismissDialog(site);
  let card = await readCard(site);
  if (card.carte !== current) return true;
  const skip = site.locator('button[aria-label="Passer ce profil"]');
  if (!(await skip.isVisible().catch(() => false))) return false;
  await skip.click();
  for (let i = 0; i < 20; i++) {
    await sleep(150);
    card = await readCard(site);
    if (card.carte !== current) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Programme principal
// ---------------------------------------------------------------------------

async function launch() {
  const base = { headless: false, viewport: null, args: ['--start-maximized'] };
  try {
    return await chromium.launchPersistentContext(opts.profil, { ...base, channel: 'chrome' });
  } catch {
    return chromium.launchPersistentContext(opts.profil, base); // Chromium de Playwright (npx playwright install chromium)
  }
}

const ctx = await launch();
const bilan = [];
let stopped = null;

const printBilan = () => {
  console.log('\nBilan');
  if (bilan.length) console.table(bilan);
  else console.log('Aucune action.');
  const ok = bilan.filter(b => b.etat === 'bloqué et déclaré').length;
  console.log(`${ok} blocage(s) déclaré(s).` + (stopped ? `\nArrêt : ${stopped}` : ''));
};

process.on('SIGINT', async () => { stopped ??= 'interrompu (Ctrl+C)'; printBilan(); await ctx.close().catch(() => {}); process.exit(130); });

if (opts.connexion) {
  for (const net of wanted) await (await ctx.newPage()).goto(LOGIN[net]).catch(() => {});
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  await rl.question('Connectez-vous à chaque plateforme dans la fenêtre ouverte, puis appuyez sur Entrée ici… ');
  rl.close();
  await ctx.close();
  console.log('Connexions enregistrées dans', opts.profil);
  process.exit(0);
}

const site = ctx.pages()[0] ?? await ctx.newPage();
await site.goto(SITE, { waitUntil: 'domcontentloaded' });
if (!site.url().startsWith(SITE)) { console.error('Mauvais domaine :', site.url()); process.exit(1); }
await site.waitForTimeout(1500);
await dismissDialog(site); // reste d'une session précédente interrompue

const unsupported = wanted.filter(n => !BLOCKERS[n]);
if (unsupported.length) console.log(`Pas encore de script pour ${unsupported.join(', ')} : ces plateformes seront passées.`);

let cardsDone = 0, cardsSeen = 0;
let lastBlockAt = 0;

main: while (cardsDone < maxCards && cardsSeen < 500) {
  const card = await readCard(site);
  if (!card.carte) { stopped = 'carte introuvable sur le site'; break; }
  cardsSeen++;
  let blockedHere = 0, openedHere = 0;

  for (const net of wanted) {
    const r = card.reseaux[net];
    if (!r || r.etat === 'PAS_DE_COMPTE') continue;
    if (r.etat === 'DEJA_DECLARE') continue;
    if (!BLOCKERS[net]) { bilan.push({ carte: card.carte, plateforme: net, etat: 'passé : pas de script' }); continue; }

    const wait = lastBlockAt + pauseMs + Math.random() * 1500 - Date.now();
    if (wait > 0) await sleep(wait);

    // Vrai clic sur le bouton de la carte : il ouvre le profil dans un nouvel onglet
    // et prévient le site qu'un blocage est en cours.
    const q = JSON.stringify(r.label);
    const link = site.locator(`a[aria-label=${q}], button[aria-label=${q}]`).first();
    let page;
    try {
      [page] = await Promise.all([ctx.waitForEvent('page', { timeout: 10000 }), link.click()]);
      await page.waitForLoadState('domcontentloaded');
    } catch {
      bilan.push({ carte: card.carte, plateforme: net, etat: 'passé : profil non ouvert' });
      continue;
    }

    openedHere++;
    let code;
    if (opts.essai) code = 'ESSAI';
    else code = await runBlocker(page, BLOCKERS[net]);
    lastBlockAt = Date.now();
    await page.close().catch(() => {});
    await site.bringToFront();

    if (code !== 'BLOQUE') {
      const etat = { DEJA_BLOQUE: 'passé : déjà bloqué', INDISPONIBLE: 'passé : indisponible (sans doute déjà bloqué)', PROFIL_INTROUVABLE: 'passé : profil introuvable', ESSAI: 'essai (rien fait)' }[code] ?? 'passé : ' + code;
      bilan.push({ carte: card.carte, plateforme: net, etat });
      console.log(`✘ ${card.carte.padEnd(28)} ${net.padEnd(10)} ${etat}`);
      await dismissDialog(site);
      if (STOP.has(code)) { stopped = `${net} : ${code}`; break main; }
      continue;
    }

    const d = await declare(site, r.nom, net);
    const etat = d === 'DECLARE' ? 'bloqué et déclaré' : 'bloqué mais non déclaré (' + d + ')';
    bilan.push({ carte: card.carte, plateforme: net, etat });
    console.log(`✔ ${card.carte.padEnd(28)} ${net.padEnd(10)} ${etat}`);
    blockedHere++;
  }

  // En mode essai rien n'est bloqué : on compte les cartes dont un profil a été ouvert.
  if (blockedHere || (opts.essai && openedHere)) cardsDone++;
  if (cardsDone >= maxCards) break;
  if (!(await nextCard(site, card.carte))) { stopped ??= 'plus de carte à traiter'; break; }
}

printBilan();
await ctx.close();
