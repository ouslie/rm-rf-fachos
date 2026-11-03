# rm-rf-fachos

```console
$ rm -rf fachos/ --instagram
✔ compte_1     bloqué
✔ compte_2     bloqué
✔ ...          bloqué
```

Une procédure pour agent IA (Claude Code, Codex, Cursor, Gemini CLI…). Elle bloque à la chaîne, depuis **votre propre compte Instagram**, les comptes listés sur [onbloquelextremedroite.fr](https://www.onbloquelextremedroite.fr/), puis déclare chaque blocage sur le site pour faire monter le compteur collectif.

> Projet indépendant et non officiel. Il n'est pas affilié au site onbloquelextremedroite.fr ni à ses auteurs.

## Ce que fait l'agent

Pour chaque carte du site :

1. Il clique sur le bouton **Instagram** de la carte, ce qui ouvre le profil dans un nouvel onglet.
2. Il clique sur **« ... »** à côté du nom d'utilisateur, puis **Bloquer**, puis confirme avec **Bloquer**.
3. Il ferme l'onglet Instagram, revient sur le site et clique sur **« Oui, je l'ai bloqué »**.
4. Il passe à la carte suivante en cliquant sur la croix.

Il s'arrête de lui-même dans ces cas :

- Instagram affiche « Action bloquée », « Réessayez plus tard » ou une vérification de sécurité.
- Vous n'êtes pas connecté à Instagram. Il ne saisit jamais d'identifiants.

Il ne déclare un blocage sur le site que si ce blocage a réellement réussi sur Instagram.

## Contenu du dépôt

| Fichier | Rôle |
| --- | --- |
| [skills/rm-rf-fachos/SKILL.md](skills/rm-rf-fachos/SKILL.md) | La procédure complète, au format standard des skills d'agent |
| [AGENTS.md](AGENTS.md) | Le point d'entrée lu par Codex, Cursor et la plupart des agents |

## Prérequis

- Un agent IA capable de piloter votre navigateur :
  - **Claude Code** : avec l'extension Claude in Chrome
  - **Codex, Cursor, Gemini CLI…** : avec un serveur MCP de navigateur, par exemple Playwright MCP ou Chrome DevTools MCP
- Être déjà connecté à Instagram dans ce navigateur

## Installation

```bash
git clone https://github.com/ouslie/rm-rf-fachos.git
cd rm-rf-fachos
```

### Claude Code

Installez le skill pour pouvoir l'utiliser depuis n'importe quel dossier :

```bash
mkdir -p ~/.claude/skills
ln -s "$(pwd)/skills/rm-rf-fachos" ~/.claude/skills/rm-rf-fachos
```

Ensuite, tapez `/rm-rf-fachos`, ou dites simplement « on enchaîne les blocages ».

### Codex, Cursor et autres agents

Lancez l'agent depuis le dossier du dépôt. Il lit automatiquement `AGENTS.md`. Dites-lui ensuite « on bloque ».

### N'importe quel autre agent ou chatbot

Copiez le contenu de [SKILL.md](skills/rm-rf-fachos/SKILL.md) dans la conversation, puis demandez-lui de suivre la procédure.

## Avertissements

- Utilisez uniquement le domaine **.fr**. D'après le site, une copie en `.fun` est un faux site.
- Instagram limite les actions répétées. Allez-y par petites séries.
- Vous restez responsable des actions effectuées sur votre compte. Un blocage peut être annulé à tout moment depuis le profil concerné.

## Licence

[MIT](LICENSE)
