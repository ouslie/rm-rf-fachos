# Mode rapide

Au lieu de faire une capture d'écran avant chaque clic, l'agent exécute de petits scripts JavaScript dans la page. Ils trouvent les boutons par leur libellé et cliquent dessus. Chaque script renvoie un **code d'état** court : l'agent lit ce code et ne fait une capture d'écran que si quelque chose ne va pas.

Testé en vrai le 3 novembre 2026 avec Claude in Chrome :
- Instagram : parcours complet d'un seul coup, en 37 secondes par carte.
- Facebook et YouTube : chaque étape validée une par une.
- TikTok : parcours vérifié à la main ; le script reprend les mêmes boutons (`data-e2e="user-more"`, puis « Bloquer », puis « Bloquer »).

L'outil qui exécute ces scripts dépend de l'agent :

- **Claude in Chrome** : `javascript_tool`. Les scripts sont asynchrones : garde le `await` qui les précède, sinon l'outil renvoie `{}` sans attendre le résultat. Un script qui dépasse **45 secondes** est coupé, alors n'écris jamais de boucle longue.
- **Playwright MCP** : `browser_evaluate`. Enlève le `await` du début et passe la fonction `async () => {…}`.
- **Chrome DevTools MCP** : `evaluate_script`, de la même façon.

Si cet outil manque ou si un script renvoie un code inattendu, repasse en mode capture d'écran pour cette étape. Le mode capture d'écran est décrit dans SKILL.md.

## Déroulé pour une carte (4 appels par plateforme)

Au départ, ouvre le site et lance **lire-carte**. Ensuite, pour chaque plateforme choisie dont l'état est `A_BLOQUER` :

| Appel | Contenu (dans un même `browser_batch` avec Claude in Chrome) |
| --- | --- |
| 1 | **Vrai clic** sur `x, y` (pas de clic en JavaScript, l'anti-popup le bloquerait), attente de 2 secondes, puis `tabs_context_mcp` pour récupérer l'identifiant du nouvel onglet |
| 2 | Script **bloquer-<plateforme>** sur le nouvel onglet (inutile de le mettre au premier plan), puis fermeture de cet onglet |
| 3 | `tabs_context_mcp` **seul**. Après une fermeture d'onglet, l'action suivante d'un même lot échoue avec « not in the same group » |
| 4 | **Rechargement** du site (navigation vers https://www.onbloquelextremedroite.fr/), puis script **déclarer** avec le nom et la plateforme attendus |

Pourquoi recharger : la fenêtre « C'est bloqué ? » n'apparaît qu'au rechargement, sans lui le bouton reste caché.

**déclarer** renvoie directement l'état de la carte affichée ensuite :
- Si toutes les plateformes de la carte sont déclarées, le site passe **tout seul** à la carte suivante.
- S'il reste des plateformes que l'utilisateur n'a pas choisies, la carte ne change pas. Lance alors **passer**, qui renvoie lui aussi l'état de la carte suivante.

Pas besoin d'ajouter des attentes entre deux blocages : le temps des appels suffit à rester sous les limites des plateformes.

**Compter les cartes :** le nombre demandé par l'utilisateur ne compte que les cartes où au moins un blocage a été fait. Les cartes sautées, sans compte sur les plateformes choisies, ne comptent pas.

## Script : lire-carte (site)

```js
await (async () => {
  const etatCarte = async () => {
    const lab = el => (el.getAttribute('aria-label') || '').trim();
    const NETS = 'Instagram|Facebook|X|TikTok|YouTube|LinkedIn';
    const reOuvrir = new RegExp('^Ouvrir pour bloquer .+ sur (' + NETS + ')$');
    const reDeclare = new RegExp('^Blocage déclaré : ouvrir .+ sur (' + NETS + ')$');
    const reAjouter = new RegExp('^Ajouter le compte (' + NETS + ') de .+$');
    const els = [...document.querySelectorAll('a[aria-label], button[aria-label]')].filter(e => reOuvrir.test(lab(e)) || reDeclare.test(lab(e)) || reAjouter.test(lab(e)));
    if (els.length) { els[0].scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 400)); }
    const out = { carte: document.querySelector('article h1, article h2, article h3')?.textContent.trim() || null, reseaux: {} };
    for (const e of els) {
      const l = lab(e), r = e.getBoundingClientRect();
      const [etat, m] = reOuvrir.test(l) ? ['A_BLOQUER', l.match(reOuvrir)] : reDeclare.test(l) ? ['DEJA_DECLARE', l.match(reDeclare)] : ['PAS_DE_COMPTE', l.match(reAjouter)];
      out.reseaux[m[1]] = etat === 'A_BLOQUER' ? { etat, x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) } : { etat };
    }
    return out;
  };
  return JSON.stringify(await etatCarte());
})()
```

- `A_BLOQUER` : on traite, avec les coordonnées du bouton.
- `PAS_DE_COMPTE` : c'est un bouton « + », on passe. Ne clique jamais dessus.
- `DEJA_DECLARE` : déjà fait, on passe.

## Script : bloquer-instagram

```js
await (async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const vis = e => e && e.getClientRects().length > 0;
  const btn = (t, root = document) => [...root.querySelectorAll('button, [role="button"]')].find(e => vis(e) && e.textContent.trim() === t);
  const waitFor = async (fn, ms = 6000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const r = fn(); if (r) return r; await sleep(150); } return null; };
  const body = () => document.body.innerText;

  await waitFor(() => document.querySelector('header'), 8000);
  if (/accounts\/login/.test(location.href) || document.querySelector('input[name="password"]')) return 'CONNEXION_REQUISE';
  if (/Cette page n.est pas disponible|Sorry, this page isn.t available/i.test(body())) return 'PROFIL_INTROUVABLE';
  // On attend que le profil soit affiché avant de chercher « Débloquer ».
  const opt = await waitFor(() => document.querySelector('header svg[aria-label="Options"]') || document.querySelector('svg[aria-label="Options"]'));
  if (btn('Débloquer') || btn('Unblock')) return 'DEJA_BLOQUE';
  if (!opt) return 'OPTIONS_INTROUVABLE';
  (opt.closest('[role="button"], button') || opt.parentElement).click();

  // Sur un compte déjà bloqué, le menu propose « Débloquer » au lieu de « Bloquer ».
  const b1 = await waitFor(() => btn('Bloquer') || btn('Block') || btn('Débloquer') || btn('Unblock'));
  if (!b1) return 'MENU_BLOQUER_INTROUVABLE';
  if (/^(Débloquer|Unblock)$/.test(b1.textContent.trim())) { btn('Annuler')?.click(); return 'DEJA_BLOQUE'; }
  b1.click();

  // Le titre est « Bloquer <pseudo> ? », avec une espace insécable avant le « ? ».
  const confirm = await waitFor(() => { const d = [...document.querySelectorAll('[role="dialog"]')].find(d => /Bloquer\s+\S+\s*\?/.test(d.innerText)); return d && btn('Bloquer', d); });
  if (!confirm) return 'CONFIRMATION_INTROUVABLE';
  confirm.click();

  const done = await waitFor(() => /Blocage de |Action bloquée|Réessayez plus tard|Try Again Later/i.test(body()) ? body() : null, 8000);
  if (!done) return 'RESULTAT_INCONNU';
  if (/Action bloquée|Réessayez plus tard|Try Again Later/i.test(done)) return 'LIMITE_PLATEFORME';
  btn('Fermer')?.click();
  return 'BLOQUE';
})()
```

## Script : bloquer-facebook

Ce script a été testé sur une **Page** Facebook, dont le bouton « ... » s'appelle « Paramètres du profil voir plus d'options ». Pour un profil personnel, le libellé peut être différent. Si le script renvoie `OPTIONS_INTROUVABLE`, fais une capture d'écran.

```js
await (async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const vis = e => e && e.getClientRects().length > 0;
  const label = e => (e.getAttribute('aria-label') || e.innerText || '').trim();
  const waitFor = async (fn, ms = 6000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const r = fn(); if (r) return r; await sleep(200); } return null; };
  const dialog = re => [...document.querySelectorAll('[role="dialog"]')].find(d => vis(d) && re.test(d.innerText));
  const inDialog = (d, t) => d && [...d.querySelectorAll('[role="button"], button')].find(e => vis(e) && label(e) === t);
  const body = () => document.body.innerText;

  await waitFor(() => document.querySelector('[role="main"]'), 8000);
  if (document.querySelector('input[name="pass"]') || /\/login/.test(location.href)) return 'CONNEXION_REQUISE';
  // Une Page déjà bloquée s'affiche aussi comme « contenu indisponible ».
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

  // Facebook met quelques secondes à traiter le blocage (boutons grisés).
  const done = await waitFor(() => dialog(/Vous avez bloqué|You blocked|Réessayez plus tard|Try again later/i), 12000);
  if (!done) return 'RESULTAT_INCONNU';
  if (/Réessayez plus tard|Try again later/i.test(done.innerText)) return 'LIMITE_PLATEFORME';
  inDialog(done, 'Fermer')?.click();
  return 'BLOQUE';
})()
```

## Script : bloquer-youtube

Sur YouTube, « bloquer » une chaîne s'appelle **« Masquer l'utilisateur sur ma chaîne »**. Ça masque ses commentaires, existants et futurs, sur votre chaîne. Le guide du site parle de « Bloquer l'utilisateur », mais ce libellé n'existe plus. Le chemin : description de la chaîne (« ...plus »), puis le drapeau « Signaler l'utilisateur », puis « Masquer l'utilisateur sur ma chaîne », puis « Envoyer ». Ici, « Envoyer » valide le masquage, ce n'est pas un signalement. Testé en vrai sur Europe 1.

```js
await (async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const vis = e => e && e.getClientRects().length > 0;
  const label = e => (e.getAttribute('aria-label') || e.innerText || '').trim();
  const waitFor = async (fn, ms = 6000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const r = fn(); if (r) return r; await sleep(200); } return null; };
  const clickable = () => [...document.querySelectorAll('button, a, [role="button"]')].filter(vis);
  const items = () => [...document.querySelectorAll('tp-yt-paper-item[role="menuitem"]')].filter(vis);

  await waitFor(() => document.querySelector('ytd-app'), 8000);
  if (!document.querySelector('#avatar-btn')) return 'CONNEXION_REQUISE';

  // 1. Ouvrir « À propos » via la description de la chaîne.
  const desc = await waitFor(() => clickable().find(e => /^Description/.test(e.getAttribute('aria-label') || '')));
  if (!desc) return 'DESCRIPTION_INTROUVABLE';
  desc.click();

  // 2. Le drapeau « Signaler l'utilisateur » ouvre un menu. On ne signale rien.
  const flag = await waitFor(() => clickable().find(e => label(e) === "Signaler l'utilisateur"));
  if (!flag) return 'MENU_INTROUVABLE';
  flag.click();

  const masquer = await waitFor(() => items().find(e => /^(Masquer|Afficher) l.utilisateur sur ma chaîne$/.test(e.innerText.trim())));
  if (!masquer) return 'MASQUER_INTROUVABLE';
  if (/^Afficher/.test(masquer.innerText.trim())) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return 'DEJA_BLOQUE'; }
  masquer.click();

  // 3. Confirmer : « Masquer l'utilisateur » → « Envoyer ».
  const ok = await waitFor(() => {
    const d = [...document.querySelectorAll('tp-yt-paper-dialog, yt-confirm-dialog-renderer, [role="dialog"], [role="alertdialog"]')].find(e => vis(e) && /^Masquer l.utilisateur\n/.test(e.innerText.trim()));
    return d && [...d.querySelectorAll('button, [role="button"]')].find(e => vis(e) && label(e) === 'Envoyer');
  });
  if (!ok) return 'CONFIRMATION_INTROUVABLE';
  ok.click();
  await sleep(2500);

  // 4. Vérifier : l'option doit maintenant être « Afficher l'utilisateur… ».
  const flag2 = clickable().find(e => label(e) === "Signaler l'utilisateur");
  if (!flag2) return 'BLOQUE_NON_VERIFIE';
  flag2.click();
  const check = await waitFor(() => items().find(e => /^Afficher l.utilisateur sur ma chaîne$/.test(e.innerText.trim())), 4000);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  return check ? 'BLOQUE' : 'RESULTAT_INCONNU';
})()
```

N'utilise jamais « Bloquer la chaîne pour les enfants » (c'est du contrôle parental) ni « Signaler… ».

## Que faire selon le code renvoyé

- `BLOQUE` : continue.
- `BLOQUE_NON_VERIFIE` (YouTube) : fais une capture d'écran pour vérifier avant de déclarer.
- `DEJA_BLOQUE`, `INDISPONIBLE` (Facebook : sans doute déjà bloqué, ou supprimé) ou `PROFIL_INTROUVABLE` : ferme l'onglet, ne déclare rien et passe à la suite.
- `CONNEXION_REQUISE`, `LIMITE_PLATEFORME` ou `VERIFICATION_SECURITE` : **arrête tout** et préviens l'utilisateur.
- Tout autre code : fais une capture d'écran et termine l'étape en mode capture d'écran. Si l'état reste incertain, ne déclare rien.

## Script : bloquer-tiktok

Parcours vérifié à la main le 3 novembre 2026 : « ... » (libellé « Actions »), puis « Bloquer », puis le bouton rouge « Bloquer ». TikTok recharge parfois la page juste après l'ouverture : si l'outil renvoie une erreur de contexte détruit, attends 2 secondes et relance le script.

```js
await (async () => {
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
  return 'BLOQUE';
})()
```

## Autres plateformes

Il n'y a pas encore de script testé pour X ou LinkedIn. Utilise le mode capture d'écran pour celles-là, en t'aidant des indications de SKILL.md. Quand un parcours a été vérifié en vrai, on peut en tirer un script sur le modèle de bloquer-facebook.

## Script : déclarer (site)

À lancer **après avoir rechargé** la page du site, juste après un blocage qui a réussi. Remplace `NOM` et `RESEAU` par la carte et la plateforme que tu viens de bloquer.

```js
await (async () => {
  const NOM = 'Radio Courtoisie', RESEAU = 'Instagram';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const etatCarte = async () => {
    const lab = el => (el.getAttribute('aria-label') || '').trim();
    const NETS = 'Instagram|Facebook|X|TikTok|YouTube|LinkedIn';
    const reOuvrir = new RegExp('^Ouvrir pour bloquer .+ sur (' + NETS + ')$');
    const reDeclare = new RegExp('^Blocage déclaré : ouvrir .+ sur (' + NETS + ')$');
    const reAjouter = new RegExp('^Ajouter le compte (' + NETS + ') de .+$');
    const els = [...document.querySelectorAll('a[aria-label], button[aria-label]')].filter(e => reOuvrir.test(lab(e)) || reDeclare.test(lab(e)) || reAjouter.test(lab(e)));
    if (els.length) { els[0].scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 400)); }
    const out = { carte: document.querySelector('article h1, article h2, article h3')?.textContent.trim() || null, reseaux: {} };
    for (const e of els) {
      const l = lab(e), r = e.getBoundingClientRect();
      const [etat, m] = reOuvrir.test(l) ? ['A_BLOQUER', l.match(reOuvrir)] : reDeclare.test(l) ? ['DEJA_DECLARE', l.match(reDeclare)] : ['PAS_DE_COMPTE', l.match(reAjouter)];
      out.reseaux[m[1]] = etat === 'A_BLOQUER' ? { etat, x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) } : { etat };
    }
    return out;
  };
  for (let i = 0; i < 20; i++) {
    const b = [...document.querySelectorAll('button')].find(e => /OUI, JE L.AI BLOQU/i.test(e.textContent) && e.getClientRects().length);
    if (b) {
      const q = [...document.querySelectorAll('*')].find(e => !e.children.length && /As-tu bien bloqué/i.test(e.textContent))?.textContent.trim() || '';
      if (!q.includes(NOM) || !q.includes('sur ' + RESEAU)) return 'MAUVAISE_QUESTION | ' + q;
      b.click(); await sleep(1500);
      return 'DECLARE | ' + JSON.stringify(await etatCarte());
    }
    await sleep(200);
  }
  return 'FENETRE_ABSENTE | ' + JSON.stringify(await etatCarte());
})()
```

- `DECLARE | {…}` : c'est fait. Le JSON qui suit est l'état de la carte affichée maintenant, la même ou la suivante.
- `MAUVAISE_QUESTION | …` : le site demande confirmation pour un autre compte, sans doute une ouverture plus ancienne. **Ne confirme pas.** Fais une capture d'écran et réponds selon ce qui s'est vraiment passé.
- `FENETRE_ABSENTE` : note la carte « bloquée mais non déclarée » dans le bilan et continue.

## Script : passer (site)

Passe à la carte suivante et renvoie son état, au même format que lire-carte.

```js
await (async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const etatCarte = async () => {
    const lab = el => (el.getAttribute('aria-label') || '').trim();
    const NETS = 'Instagram|Facebook|X|TikTok|YouTube|LinkedIn';
    const reOuvrir = new RegExp('^Ouvrir pour bloquer .+ sur (' + NETS + ')$');
    const reDeclare = new RegExp('^Blocage déclaré : ouvrir .+ sur (' + NETS + ')$');
    const reAjouter = new RegExp('^Ajouter le compte (' + NETS + ') de .+$');
    const els = [...document.querySelectorAll('a[aria-label], button[aria-label]')].filter(e => reOuvrir.test(lab(e)) || reDeclare.test(lab(e)) || reAjouter.test(lab(e)));
    if (els.length) { els[0].scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 400)); }
    const out = { carte: document.querySelector('article h1, article h2, article h3')?.textContent.trim() || null, reseaux: {} };
    for (const e of els) {
      const l = lab(e), r = e.getBoundingClientRect();
      const [etat, m] = reOuvrir.test(l) ? ['A_BLOQUER', l.match(reOuvrir)] : reDeclare.test(l) ? ['DEJA_DECLARE', l.match(reDeclare)] : ['PAS_DE_COMPTE', l.match(reAjouter)];
      out.reseaux[m[1]] = etat === 'A_BLOQUER' ? { etat, x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) } : { etat };
    }
    return out;
  };
  const titre = () => document.querySelector('article h1, article h2, article h3')?.textContent.trim();
  const before = titre();
  const p = document.querySelector('button[aria-label="Passer ce profil"]');
  if (!p) return 'BOUTON_PASSER_INTROUVABLE';
  p.click();
  for (let i = 0; i < 20 && titre() === before; i++) await sleep(150);
  if (titre() === before) return 'INCHANGEE | ' + before;
  return JSON.stringify(await etatCarte());
})()
```

## Accélérer encore

- Ne fais une capture d'écran que lorsqu'un script renvoie un code inattendu.
- Ne relis pas la carte après **déclarer** ou **passer** : ces scripts renvoient déjà son état.
- Dans Claude Code, un modèle rapide (`/model`, par exemple Haiku) suffit pour la boucle une fois les scripts en place.
