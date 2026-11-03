---
name: rm-rf-fachos
description: Bloque à la chaîne sur Instagram les comptes listés sur onbloquelextremedroite.fr en pilotant le navigateur de l'utilisateur, puis confirme chaque blocage sur le site et passe à la carte suivante. À utiliser dès que l'utilisateur parle de « onbloquelextremedroite », de bloquer les comptes du site, de « bloquer l'extrême droite sur Instagram », de rm-rf-fachos, de continuer ou d'enchaîner les blocages, ou dit simplement « on bloque » ou « lance les blocages ».
---

# rm-rf-fachos : bloquer sur Instagram les comptes de onbloquelextremedroite.fr

L'utilisateur veut bloquer depuis **son propre compte Instagram** les comptes proposés par le site, carte par carte. Le site ne bloque rien lui-même : il ouvre le profil, l'utilisateur bloque, puis il déclare le blocage sur le site pour faire monter un compteur collectif.

Ces instructions ne dépendent d'aucun agent en particulier. Il te faut un outil qui pilote un vrai navigateur dans lequel l'utilisateur est déjà connecté à Instagram :

- **Claude Code** : l'extension Claude in Chrome (`mcp__claude-in-chrome__*`). Charge tous ses outils en un seul appel ToolSearch, puis appelle `tabs_context_mcp`.
- **Codex, Cursor, Gemini CLI, etc.** : un serveur MCP de navigateur (par exemple Playwright MCP ou Chrome DevTools MCP) branché sur un profil Chrome connecté à Instagram, ou un outil de contrôle de l'ordinateur.
- Sans aucun outil de navigateur, explique à l'utilisateur ce qu'il doit installer, puis arrête-toi.

Si l'utilisateur n'a pas donné de limite, demande-lui combien de cartes traiter, ou s'il faut continuer jusqu'à ce qu'il dise stop.

## Le site

- Utilise uniquement **https://www.onbloquelextremedroite.fr/**. Un bandeau du site prévient qu'une copie en `.fun` est un faux site. N'utilise jamais ce domaine.
- La carte en cours se trouve dans la colonne de droite, « LES PLUS BLOQUÉS » : photo, nom, puis des boutons par réseau (Instagram, X, Facebook, TikTok, YouTube, LinkedIn).
- Le bouton Instagram est le lien dont le libellé est « Ouvrir pour bloquer <Nom> sur Instagram ». Repère-le par son libellé ou par l'arbre d'accessibilité plutôt que par des coordonnées.

## Boucle pour chaque carte

1. **Ouvrir le profil.** Clique sur le bouton Instagram de la carte. Le profil s'ouvre dans un **nouvel onglet**. Passe sur cet onglet.
2. **Vérifier.** Regarde la page et vérifie que l'utilisateur est connecté et que le profil correspond à la carte.
   - Si Instagram demande de se connecter, arrête-toi et demande à l'utilisateur de se connecter lui-même. Ne saisis jamais d'identifiants.
   - Si le profil n'existe plus, ou s'il est déjà bloqué (le bouton affiche « Débloquer »), ferme l'onglet et passe à la carte suivante sans rien confirmer.
3. **Ouvrir le menu « ... ».** Clique sur l'icône **« ... »** juste à droite du nom d'utilisateur, en haut du profil. Son libellé d'accessibilité est « Options ».
   - Attention : si tu cliques sur le nom lui-même, ça ouvre « À propos de ce compte ». Dans ce cas, clique sur « Fermer » et vise un peu plus à droite.
   - Si un clic via l'élément d'accessibilité n'ouvre rien, clique sur les coordonnées des « ... » visibles à l'écran.
4. **Bloquer.** Dans le menu (Bloquer / Restreindre / Signaler / Partager sur… / À propos de ce compte), clique sur **« Bloquer »**, la première entrée en rouge.
5. **Confirmer sur Instagram.** La fenêtre « Bloquer <pseudo> ? » s'ouvre. Clique sur le bouton rouge **« Bloquer »**, pas sur « Annuler ».
6. **Fermer Instagram.** La fenêtre « Blocage de <pseudo>. » s'affiche. Clique sur « Fermer », puis ferme l'onglet Instagram.
7. **Confirmer sur le site.** Reviens sur l'onglet du site. Une fenêtre « C'EST BLOQUÉ ? » est affichée. Clique sur **« OUI, JE L'AI BLOQUÉ »**. Le bouton Instagram de la carte devient « BLOQUÉ ».
   - Ne confirme sur le site que si le blocage a vraiment réussi à l'étape 6. Le compteur est collectif et ne doit pas être gonflé.
8. **Carte suivante.** Clique sur la croix ronde (X) en bas à droite de la photo pour passer à la carte suivante. Le site affiche alors « Profil mis de côté », ce qui est normal parce que le blocage est déjà déclaré. Reprends à l'étape 1.

Enchaîne les actions prévisibles (clic, courte attente, capture d'écran) pour aller vite. Regarde toujours la page avant de cliquer sur un bouton dont la position peut changer.

## Prudence avec Instagram

- Instagram limite les actions en série. Laisse quelques secondes entre deux blocages.
- Si un message du type « Action bloquée », « Réessayez plus tard » ou une vérification de sécurité (CAPTCHA) apparaît, **arrête-toi immédiatement** et préviens l'utilisateur. Ne tente pas de contourner le message.
- Ne bloque que via l'onglet Instagram ouvert par le bouton de la carte.

## Bilan

À la fin, ou quand l'utilisateur dit stop, donne la liste des comptes bloqués et des comptes passés (avec la raison), puis ferme les onglets Instagram restés ouverts.
