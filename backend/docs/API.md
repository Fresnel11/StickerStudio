# Backend Express : architecture et API

L’API écoute sur `http://127.0.0.1:3001/api`. Le frontend passe par son proxy Vite, sur la même origine que la page. Le backend utilise PostgreSQL sur `localhost:5433`, base `sticker_studio`.

## Responsabilités

| Répertoire | Responsabilité |
| --- | --- |
| `src/config` | Variables d’environnement, pool PostgreSQL, configuration Google |
| `src/models` | Requêtes SQL paramétrées et transactions |
| `src/services` | Logique métier, mots de passe, sessions et fournisseur Google |
| `src/controllers` | Entrées HTTP, appel des services/modèles et réponses |
| `src/routes` | Endpoints, contrôleurs et middlewares associés |
| `src/middlewares` | Chargement de session, authentification requise, sécurité et erreurs |
| `src/validators` | Validation des champs et du contenu des images |
| `src/database` | Commande de migration |
| `migrations` | Scripts SQL versionnés |

`app.mjs` assemble Express. `server.mjs` ouvre la base, applique les migrations manquantes puis lance l’écoute HTTP. Les modèles utilisent le pilote `pg`, sans ORM.

## Inscription

`POST /api/auth/register`

En-têtes requis : `Content-Type: application/json` et `X-Sticker-Studio: 1`.

```json
{
  "name": "Camille",
  "email": "camille@example.com",
  "password": "Une phrase de passe personnelle"
}
```

Le prénom contient 2 à 60 caractères et le mot de passe 10 à 128 caractères. L’e-mail est normalisé en minuscules. Une inscription réussie renvoie **201** avec `{ "user": { "id", "name", "email" } }` et ouvre une session par cookie HttpOnly. Le mot de passe est haché avec scrypt et un sel aléatoire ; il n’est jamais renvoyé.

## Connexion

`POST /api/auth/login`, avec les mêmes en-têtes :

```json
{
  "email": "camille@example.com",
  "password": "Une phrase de passe personnelle"
}
```

Une connexion réussie renvoie **200** avec le même objet user et un cookie de session. Un mauvais e-mail ou mot de passe renvoie **401** avec un message générique. Conservez le cookie pour les requêtes suivantes ; aucun jeton Bearer n’est nécessaire.

## Autres endpoints

| Méthode | Route | Action |
| --- | --- | --- |
| GET | `/api/health` | Vérifie le serveur et PostgreSQL |
| GET | `/api/auth/me` | Utilisateur connecté, ou user: null |
| POST | `/api/auth/logout` | Invalide la session, réponse 204 |
| GET | `/api/auth/providers` | Disponibilité de Google et association actuelle |
| GET | `/api/auth/google` | Démarre la connexion Google |
| GET | `/api/auth/google?link=1` | Associe Google au compte déjà connecté |
| GET | `/api/auth/google/callback` | Retour OAuth contrôlé par le backend |
| GET | `/api/library` | Collection privée et nom du pack |
| PATCH | `/api/library` | Renomme le pack avec un champ name |
| POST | `/api/stickers` | Enregistre un sticker WebP dans le compte |
| POST | `/api/stickers/import` | Importe une collection locale |
| DELETE | `/api/stickers/:id` | Supprime un sticker appartenant au compte |

Les modifications demandent `X-Sticker-Studio: 1`. Les routes de collection exigent une session valide. Les erreurs ont la forme `{ "error": "message" }` : 400 pour une entrée invalide, 401 sans session ou en cas de mauvais identifiants, 409 pour un compte déjà existant ou une collection pleine, 429 en cas de trop nombreuses tentatives.

## Base et migrations

Depuis la racine du projet :

```sh
npm run db:check --prefix backend
npm run db:migrate --prefix backend
npm run db:prepare-test --prefix backend
npm test --prefix backend
```

Les migrations 001 et 002 créent les tables de l’application et ajoutent Google. Les tests travaillent dans des schémas isolés de `sticker_studio_test`. Ils ne créent pas de comptes de démonstration dans la base de l’application.

Pour ajouter une évolution du schéma, créez un nouveau fichier numéroté dans migrations. Ne modifiez pas une migration déjà appliquée.
