---
name: rm-rf-fachos
description: Bloque à la chaîne les comptes listés sur onbloquelextremedroite.fr, sur les plateformes choisies par l'utilisateur (Instagram, Facebook, X, TikTok, YouTube, LinkedIn), en pilotant son navigateur, puis confirme chaque blocage sur le site et passe à la carte suivante. À utiliser dès que l'utilisateur parle de « onbloquelextremedroite », de bloquer les comptes du site, de « bloquer l'extrême droite » sur un réseau social, de rm-rf-fachos, de continuer ou d'enchaîner les blocages, ou dit simplement « on bloque » ou « lance les blocages ».
---

# rm-rf-fachos : bloquer les comptes de onbloquelextremedroite.fr

L'utilisateur veut bloquer depuis **ses propres comptes** (Instagram, Facebook…) les comptes proposés par le site, carte par carte. Le site ne bloque rien lui-même : il ouvre le profil, l'utilisateur bloque, puis il déclare le blocage sur le site pour faire monter un compteur collectif.

Ces instructions ne dépendent d'aucun agent en particulier.

## Étape 0 : vérifier qu'un navigateur est branché

Il te faut un outil qui pilote un vrai navigateur. Regarde tes outils disponibles :

- **Claude Code** : l'extension Claude in Chrome (`mcp__claude-in-chrome__*`). Les outils peuvent être différés : charge-les tous en un seul appel ToolSearch, puis appelle `tabs_context_mcp`.
- **Codex, Cursor, Gemini CLI, etc.** : un serveur MCP de navigateur (Playwright MCP, Chrome DevTools MCP…) ou un outil de contrôle de l'ordinateur.

**Si aucun outil de navigateur n'est disponible**, ne laisse pas l'utilisateur sans solution. Beaucoup ne sont pas développeurs, alors donne-lui en langage simple les étapes **pour l'agent dans lequel tu tournes**, puis arrête-toi :

- Claude Code :
  1. Installer l'extension Chrome « Claude » (éditeur : Anthropic) depuis le Chrome Web Store et s'y connecter avec le même compte Claude.
  2. Quitter Claude Code, puis le relancer avec `claude --chrome`, ou taper `/chrome` dans la session.
  3. Taper `/mcp` pour vérifier que **claude-in-chrome** est connecté.
  4. Relancer `/rm-rf-fachos`.
- Codex : installer Node.js, puis lancer `codex mcp add playwright -- npx @playwright/mcp@latest`, puis relancer `codex`.
- Cursor, Gemini CLI ou autre : ajouter le serveur `playwright` (`npx @playwright/mcp@latest`) dans la configuration MCP de l'agent, puis redémarrer l'agent.
- Plus simple pour les non-développeurs : installer l'extension Chrome « Claude », se connecter aux plateformes dans ce Chrome, puis coller cette procédure dans le panneau de l'extension et dire « on bloque ».

Renvoie aussi vers le README : https://github.com/ouslie/rm-rf-fachos#readme

Si l'extension se déconnecte en cours de route, arrête-toi. Dis à l'utilisateur où tu en étais (dernière carte traitée, blocage déclaré ou non sur le site) et comment la reconnecter.

## Étape 1 : demander les plateformes et le nombre de cartes

Avant le moindre clic, pose ces deux questions en un seul message :

1. **Quelles plateformes bloquer ?** Instagram, Facebook, X, TikTok, YouTube, LinkedIn, ou toutes.
2. **Combien de cartes traiter ?** Un nombre, ou « jusqu'à ce que je dise stop ». On ne compte que les cartes où au moins un blocage a été fait. Les cartes sautées, sans compte sur les plateformes choisies, ne comptent pas.

Dans le même message, **préviens l'utilisateur qu'il doit être connecté à chacune de ces plateformes dans le navigateur piloté avant de commencer**. Tu ne saisis jamais d'identifiants. Avec Playwright, qui ouvre sa propre fenêtre Chrome, il faut s'y connecter une première fois. Attends qu'il réponde, par exemple « c'est bon », avant de continuer.

Si l'utilisateur a déjà répondu à ces questions dans sa demande, ne les repose pas : rappelle seulement de se connecter.

## Le site

- Utilise uniquement **https://www.onbloquelextremedroite.fr/**. Un bandeau du site prévient qu'une copie en `.fun` est un faux site. N'utilise jamais ce domaine.
- La carte en cours se trouve dans la colonne de droite, « LES PLUS BLOQUÉS » : photo, nom, puis un bouton par réseau (Instagram, X, Facebook, TikTok, YouTube, LinkedIn).
- Un bouton peut être de deux sortes, à reconnaître par son libellé d'accessibilité :
  - **« Ouvrir pour bloquer <Nom> sur <Réseau> »** : un compte est référencé. C'est celui-là qu'on utilise.
  - **« Ajouter le compte <Réseau> de <Nom> »** (le bouton affiche un « + ») : aucun compte n'est référencé, et le bouton sert à en proposer un. **Ne clique pas dessus.** Passe cette plateforme pour cette carte.
- Après une déclaration, le bouton du réseau affiche « BLOQUÉ ».

## Mode rapide (par défaut)

Si ton outil de navigateur sait exécuter du JavaScript dans la page (`javascript_tool` pour Claude in Chrome, `browser_evaluate` pour Playwright), **lis [references/mode-rapide.md](references/mode-rapide.md) et utilise ses scripts**. Il existe des scripts pour Instagram, Facebook et YouTube : environ 4 appels par plateforme, sans capture d'écran. La boucle ci-dessous sert de mode de secours, et pour X, TikTok et LinkedIn. Les règles de prudence et le bilan s'appliquent dans les deux modes.

## Boucle pour chaque carte (mode capture d'écran)

Pour chaque plateforme choisie qui a un lien « Ouvrir pour bloquer » sur la carte :

1. **Ouvrir le profil.** Clique sur le lien. Le profil s'ouvre dans un **nouvel onglet**. Passe sur cet onglet.
2. **Vérifier.** Regarde la page et vérifie que l'utilisateur est connecté et que le profil correspond à la carte.
   - Si la plateforme demande de se connecter, arrête-toi et demande à l'utilisateur de se connecter lui-même.
   - Si le profil n'existe plus, ou s'il est déjà bloqué, ferme l'onglet et passe à la plateforme suivante sans rien déclarer.
3. **Bloquer.** Suis la fiche de la plateforme, plus bas.
4. **Fermer l'onglet** de la plateforme.
5. **Déclarer sur le site.** Reviens sur l'onglet du site. Une fenêtre « C'EST BLOQUÉ ? » s'affiche normalement. Clique sur **« OUI, JE L'AI BLOQUÉ »**. Le bouton du réseau devient « BLOQUÉ ».
   - Si la fenêtre ne s'affiche pas, **recharge la page du site**. C'est souvent le cas quand l'onglet de la plateforme n'a pas été mis au premier plan. Au rechargement, le site repose la question « As-tu bien bloqué le compte de <Nom> sur <Réseau> ? ». Vérifie que c'est bien le bon compte et la bonne plateforme avant de confirmer. Si elle n'apparaît toujours pas, note la carte comme « bloquée mais non déclarée » dans le bilan, sans insister.
   - Ne déclare un blocage que s'il a vraiment réussi. Le compteur est collectif et ne doit pas être gonflé.

Quand toutes les plateformes de la carte sont déclarées, le site passe en général tout seul à la carte suivante. Sinon, par exemple quand une plateforme a été sautée, clique sur la croix ronde (X) en bas à droite de la photo. Le site affiche alors « Profil mis de côté », ce qui est normal. Reprends la boucle.

Enchaîne les actions prévisibles (clic, courte attente, capture d'écran) pour aller vite. Regarde toujours la page avant de cliquer sur un bouton dont la position peut changer.

## Fiches par plateforme

### Instagram (testé)

1. Clique sur l'icône **« ... »** juste à droite du nom d'utilisateur, en haut du profil. Son libellé d'accessibilité est « Options ».
   - Attention : si tu cliques sur le nom lui-même, ça ouvre « À propos de ce compte ». Dans ce cas, clique sur « Fermer » et vise un peu plus à droite.
   - Un clic via l'élément d'accessibilité peut ne rien ouvrir. Dans ce cas, clique sur les coordonnées des « ... » visibles à l'écran.
2. Dans le menu (Bloquer / Restreindre / Signaler / Partager sur… / À propos de ce compte / parfois Envoyer un message), clique sur **« Bloquer »**, la première entrée en rouge.
3. La fenêtre « Bloquer <pseudo> ? » s'ouvre. Clique sur le bouton rouge **« Bloquer »**, pas sur « Annuler ».
4. La fenêtre « Blocage de <pseudo>. » confirme le blocage. Clique sur « Fermer ».

### Facebook (testé sur une Page)

1. Clique sur le bouton **« ... »** à droite de la barre d'onglets du profil (Tout, À propos, Reels…). Son libellé d'accessibilité est « Paramètres du profil voir plus d'options ».
2. Dans le menu (Rechercher, Signaler la Page, Aider…, Bloquer, Inviter des ami(e)s), clique sur **« Bloquer »**. Surtout pas « Signaler la Page ».
3. La fenêtre « Bloquer <Nom> ? » s'ouvre. Clique sur le bouton bleu **« Confirmer »**.
4. Les boutons se grisent pendant quelques secondes. Attends la fenêtre « Vous avez bloqué <Nom> », puis clique sur « Fermer ».

Pour un profil personnel, le menu peut être différent : lis l'écran.

### YouTube (testé)

Sur YouTube, bloquer s'appelle **« Masquer l'utilisateur sur ma chaîne »** : ses commentaires sont masqués sur votre chaîne.

1. Sur la page de la chaîne, clique sur la description, le lien « ...plus » sous le nom. La fenêtre « À propos » s'ouvre.
2. En bas de cette fenêtre, clique sur le drapeau **« Signaler l'utilisateur »**. Ça ouvre seulement un menu, rien n'est signalé.
3. Dans le menu, choisis **« Masquer l'utilisateur sur ma chaîne »**. Pas « Bloquer la chaîne pour les enfants », qui est du contrôle parental, et pas « Signaler… ».
4. La fenêtre « Masquer l'utilisateur » s'ouvre. Clique sur **« Envoyer »**, qui valide le masquage.
5. Pour vérifier, rouvre le menu : l'option doit maintenant être « Afficher l'utilisateur sur ma chaîne ».

Si l'utilisateur veut surtout ne plus voir les vidéos de la chaîne, il faut plutôt « Ne pas recommander la chaîne », dans le menu « ... » d'une de ses vidéos. Le site ne compte pas ce choix comme un blocage.

### X, TikTok, LinkedIn (pas encore testés)

Le guide du site (https://www.onbloquelextremedroite.fr/comment-bloquer-sur-instagram) donne ces indications :

- **X** : sur le profil, les trois points, puis « Bloquer @pseudo ».
- **TikTok** : sur le profil, l'icône de partage ou les trois points, puis « Bloquer ».
- **LinkedIn** : le guide n'en parle pas. Sur un profil de personne, c'est en général « Plus », puis « Signaler / Bloquer », puis « Bloquer ». LinkedIn ne permet pas de bloquer une page d'entreprise ou de média. Dans ce cas, passe la plateforme et indique « non bloquable » dans le bilan.

Le guide peut être en retard sur les applications : pour YouTube, il parle de « Bloquer l'utilisateur » alors que le libellé réel est « Masquer l'utilisateur sur ma chaîne ».

Ces parcours n'ont pas encore été vérifiés en vrai. Le principe est le même partout : ouvrir le menu du profil (« ... », « Plus »), choisir « Bloquer », puis confirmer. Les libellés changent d'une plateforme à l'autre et dans le temps, alors fais une capture à chaque étape et lis ce qui est écrit avant de cliquer.

- Si tu ne trouves pas « Bloquer » en deux essais, arrête-toi pour cette plateforme et décris à l'utilisateur ce que tu vois.
- Ne choisis jamais « Signaler », et ne clique jamais sur une option qui supprime ou désactive quelque chose sur le compte de l'utilisateur.

## Prudence avec les plateformes

- Les réseaux sociaux limitent les actions en série. Laisse quelques secondes entre deux blocages.
- Si un message du type « Action bloquée », « Réessayez plus tard » ou une vérification de sécurité (CAPTCHA) apparaît, **arrête-toi immédiatement** et préviens l'utilisateur. Ne tente pas de contourner le message.
- Ne bloque que via l'onglet ouvert par le bouton de la carte.

## Bilan

À la fin, ou quand l'utilisateur dit stop, donne un tableau avec, pour chaque carte et chaque plateforme, l'un de ces états :
- bloqué et déclaré
- bloqué mais non déclaré
- pas de compte référencé
- passé, avec la raison

Ferme ensuite les onglets restés ouverts.
