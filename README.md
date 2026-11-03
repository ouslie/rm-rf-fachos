# rm-rf-fachos

```console
$ rm -rf fachos/ --instagram --facebook
✔ compte_1     bloqué
✔ compte_2     bloqué
✔ ...          bloqué
```

Une procédure pour agent IA (Claude Code, Codex, Cursor, Gemini CLI…). Elle bloque à la chaîne, depuis **vos propres comptes**, les comptes listés sur [onbloquelextremedroite.fr](https://www.onbloquelextremedroite.fr/), puis déclare chaque blocage sur le site pour faire monter le compteur collectif.

> Projet indépendant et non officiel. Il n'est pas affilié au site onbloquelextremedroite.fr ni à ses auteurs.

## Ce que fait l'agent

**Au démarrage**, il vous demande :

- **les plateformes à bloquer** : Instagram, Facebook, X, TikTok, YouTube, LinkedIn, ou toutes ;
- **le nombre de cartes à traiter**, ou « jusqu'à ce que je dise stop ».

Il vous rappelle aussi de **vous connecter à chacune de ces plateformes dans le navigateur avant de commencer**.

**Ensuite, pour chaque carte du site** et chaque plateforme choisie :

1. Il ouvre le profil du compte depuis la carte, dans un nouvel onglet.
2. Il le bloque. Sur Instagram, ça veut dire **« ... »** à côté du nom, puis **Bloquer**, puis confirmer avec **Bloquer**.
3. Il ferme l'onglet, revient sur le site et clique sur **« Oui, je l'ai bloqué »**.

Il passe ensuite à la carte suivante. Si une plateforme n'a pas de compte référencé sur une carte, il la saute.

| Plateforme | État |
| --- | --- |
| Instagram, Facebook, YouTube | ✅ testé (mode rapide) |
| X, TikTok, LinkedIn | 🧪 pas encore testé : l'agent lit l'écran à chaque étape |

Il s'arrête de lui-même dans ces cas :

- Une plateforme affiche « Action bloquée », « Réessayez plus tard » ou une vérification de sécurité.
- Vous n'êtes pas connecté. Il ne saisit jamais d'identifiants.

Il ne déclare un blocage sur le site que si ce blocage a réellement réussi.

## Contenu du dépôt

| Fichier | Rôle |
| --- | --- |
| [skills/rm-rf-fachos/SKILL.md](skills/rm-rf-fachos/SKILL.md) | La procédure complète, au format standard des skills d'agent |
| [AGENTS.md](AGENTS.md) | Le point d'entrée lu par Codex, Cursor et la plupart des agents |
| [scripts/bloquer.mjs](scripts/bloquer.mjs) | La version script Playwright, sans agent |

## Sans agent IA : le script Playwright (le plus rapide)

Un script Node pilote Chrome tout seul, sans agent : quelques secondes par carte au lieu d'une minute ou plus. Il faut [Node.js](https://nodejs.org/) et Google Chrome.

```bash
npm install
npm run connexion          # 1re fois : connectez-vous vous-même à chaque plateforme, puis Entrée
npm run bloquer -- --cartes 10 --plateformes instagram,facebook,tiktok,youtube
```

- Les connexions restent enregistrées dans un profil Chrome à part (`~/.rm-rf-fachos/profil`). Votre Chrome habituel n'est pas touché. Le script ne saisit jamais d'identifiants.
- Plateformes gérées : Instagram, Facebook, TikTok, YouTube. X et LinkedIn sont passés.
- Le script laisse 4 secondes entre deux blocages (`--pause`). Il s'arrête net sur « Action bloquée », une demande de connexion ou une vérification de sécurité.
- `--essai` ouvre les profils sans rien bloquer ni déclarer, pour vérifier que tout marche.
- Ctrl+C arrête le script et affiche quand même le bilan.

## Pas développeur ? Le plus simple : l'extension Claude dans Chrome

Pas de terminal, rien à installer à part l'extension.

1. Dans Chrome, installez l'extension **Claude** (éditeur : Anthropic) depuis le Chrome Web Store, puis connectez-vous à votre compte Claude.
2. Dans ce même Chrome, connectez-vous à **Instagram**, **Facebook**, ou aux autres plateformes que vous voulez utiliser.
3. Ouvrez le panneau de l'extension Claude, puis collez-y le texte de [SKILL.md](https://raw.githubusercontent.com/ouslie/rm-rf-fachos/main/skills/rm-rf-fachos/SKILL.md) : ouvrez le lien, puis faites Tout sélectionner et Copier.
4. Écrivez « **on bloque** ». Claude vous demande quelles plateformes bloquer et combien de cartes traiter, puis il s'en occupe.

> **Astuce :** pour ne pas recoller le texte à chaque fois, enregistrez-le comme raccourci dans l'extension, si votre version le permet. Vous le relancerez ensuite en un clic.

Vous préférez un agent dans le terminal ou dans votre éditeur (Claude Code, Codex, Cursor…) ? Suivez le démarrage ci-dessous.

## Démarrage en 3 étapes (Claude Code, Codex, Cursor…)

> **Le point clé :** l'agent doit pouvoir **piloter un navigateur**. Sans ça, il vous répondra qu'il ne peut rien faire. Cette partie se règle une seule fois, en 5 minutes.

### Étape 1 · Récupérer le projet

```bash
git clone https://github.com/ouslie/rm-rf-fachos.git
cd rm-rf-fachos
```

### Étape 2 · Brancher le navigateur sur votre agent

Choisissez votre agent :

<details open>
<summary><b>Claude Code</b></summary>

1. Dans Chrome, installez l'extension **Claude** (éditeur : Anthropic) depuis le Chrome Web Store, puis connectez-vous avec **le même compte Claude** que Claude Code.
2. Installez le skill, une fois pour toutes :
   ```bash
   mkdir -p ~/.claude/skills
   ln -sfn "$(pwd)/skills/rm-rf-fachos" ~/.claude/skills/rm-rf-fachos
   ```
3. Lancez Claude Code avec Chrome activé :
   ```bash
   claude --chrome
   ```
   Vous pouvez aussi taper `/chrome` dans une session déjà ouverte. Pour vérifier, tapez `/mcp` : **claude-in-chrome** doit apparaître comme connecté.

L'agent travaille dans **votre** Chrome. Si vous y êtes déjà connecté à Instagram, il n'y a rien d'autre à faire.
</details>

<details>
<summary><b>Codex</b></summary>

Il faut [Node.js](https://nodejs.org/) installé. Ajoutez le serveur navigateur Playwright :

```bash
codex mcp add playwright -- npx @playwright/mcp@latest
```

Lancez ensuite `codex` depuis le dossier `rm-rf-fachos`. Il lit `AGENTS.md` tout seul.
</details>

<details>
<summary><b>Cursor, Gemini CLI et autres agents compatibles MCP</b></summary>

Il faut [Node.js](https://nodejs.org/) installé. Ajoutez ce serveur dans la configuration MCP de votre agent :

- pour Cursor : `~/.cursor/mcp.json`
- pour Gemini CLI : `~/.gemini/settings.json`

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

Redémarrez l'agent et ouvrez le dossier `rm-rf-fachos`.
</details>

<details>
<summary><b>Un chatbot sans accès au navigateur</b></summary>

Il ne pourra pas cliquer à votre place. Copiez quand même [SKILL.md](skills/rm-rf-fachos/SKILL.md) dans la conversation : il vous guidera pour le faire à la main.
</details>

### Étape 3 · Tester, puis lancer

1. **Test :** demandez à l'agent « *ouvre https://www.onbloquelextremedroite.fr/* ».
   - Si le site s'ouvre dans une fenêtre, c'est bon.
   - S'il répond qu'il n'a pas d'outil de navigateur, revenez à l'étape 2.
2. **Instagram :** connectez-vous à Instagram **vous-même**, dans la fenêtre que pilote l'agent. Avec Playwright, c'est une fenêtre Chrome à part, et il ne faut le faire que la première fois. L'agent ne tape jamais vos identifiants.
3. **C'est parti :** dites « **on bloque** » (ou `/rm-rf-fachos` dans Claude Code). L'agent vous demande combien de cartes traiter.

### Ça ne marche pas ?

| Ce que dit l'agent | Solution |
| --- | --- |
| « Aucun outil ne me permet de piloter un navigateur » | L'étape 2 n'est pas active. Dans Claude Code, relancez avec `claude --chrome` et vérifiez avec `/mcp`. Ailleurs, redémarrez l'agent après avoir ajouté le serveur MCP. |
| « Instagram demande de se connecter » | Connectez-vous vous-même dans la fenêtre pilotée, puis dites « continue ». |
| « Instagram affiche *Action bloquée* » | Instagram freine les actions en série. Faites une pause de quelques heures. |
| `npx` introuvable | Installez [Node.js](https://nodejs.org/). |

## Avertissements

- Utilisez uniquement le domaine **.fr**. D'après le site, une copie en `.fun` est un faux site.
- Instagram limite les actions répétées. Allez-y par petites séries.
- Vous restez responsable des actions effectuées sur votre compte. Un blocage peut être annulé à tout moment depuis le profil concerné.

## Licence

[MIT](LICENSE)
