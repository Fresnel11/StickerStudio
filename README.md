# Sticker Studio

Le backend utilise Node.js et Express avec des fichiers `.js`. Le champ `"type": "module"` de `backend/package.json` permet de conserver les imports `import/export`.

Dans `backend`, lancez `npm run dev` pour démarrer Nodemon. Il surveille `src`, `.env` et `migrations` selon `nodemon.json`. Le démarrage confirme la connexion PostgreSQL, les migrations à jour, puis l'adresse du serveur Express. Après un changement de commande de développement, arrêtez l'ancien processus avec `Ctrl+C` et relancez `npm run dev`.

Application React de création de stickers, avec un backend Node.js / Express et une base PostgreSQL.

## Organisation

```text
Frontend/                  # Application React, ses tests, sa configuration
  src/
  tests/
  .browser-tests/           # Captures et résultats générés, ignorés par Git
  package.json
  package-lock.json
  node_modules/             # Dépendances frontend uniquement
backend/                   # API Express, PostgreSQL, authentification
  src/config/              # Environnement et connexion PostgreSQL
  src/models/              # Accès SQL aux données
  src/services/            # Logique métier, mots de passe, sessions, Google
  src/controllers/         # Traitement des requêtes HTTP
  src/routes/              # Déclaration des endpoints
  src/middlewares/         # Sécurité, session, validation, erreurs
  src/validators/          # Validation des données reçues
  src/utils/               # Cookies, hachage et erreurs HTTP
  src/database/            # Exécution des migrations
  src/app.js              # Assemblage Express
  src/server.js           # Démarrage du serveur
  migrations/
  tests/
  scripts/
  docs/GOOGLE_AUTH.md
  .env.example
  package.json
  package-lock.json
  node_modules/             # Dépendances backend uniquement
.gitignore
README.md
```

Les deux applications sont autonomes, sans workspaces npm. Il n’y a plus de package.json, node_modules ou dist à la racine. Le dist du frontend est généré dans Frontend/dist.

## Installer et démarrer

Prérequis : Node.js 22.13 ou supérieur et PostgreSQL.

Depuis la racine :

```sh
npm install --prefix Frontend
npm install --prefix backend
npm run db:check --prefix backend
npm run db:migrate --prefix backend
npm run dev:all --prefix Frontend
```

Le serveur local est accessible sur **http://127.0.0.1:5173** ; l’API utilise le port 3001. Pour un autre port frontend : `node backend/scripts/dev-all.js --port 5175`.

Pour démarrer séparément, utilisez deux terminaux :

```sh
npm run dev --prefix backend
npm run dev --prefix Frontend
```

## PostgreSQL

La configuration se trouve dans backend/.env, ignoré par Git. L’application utilise la base **sticker_studio sur localhost:5433**, fournie par le propriétaire du projet. PostgreSQL doit être démarré via votre gestionnaire habituel. Le mot de passe n’est pas stocké dans les fichiers suivis par Git.

- `npm run db:check --prefix backend` : vérifie la connexion et liste les tables publiques.
- `npm run db:prepare-test --prefix backend` : prépare une base séparée sticker_studio_test sur le même serveur et renseigne TEST_DATABASE_URL.
- `npm run db:migrate --prefix backend` : applique les migrations. Elles sont également appliquées au démarrage de l’API.

Les migrations versionnées dans backend/migrations créent users, sessions, stickers et oauth_requests ; schema_migrations conserve les versions appliquées. Elles sont transactionnelles et ne sont pas réappliquées à chaque lancement. Les tests utilisent sticker_studio_test, jamais les tables de la base applicative.

L’ancienne instance de développement sur 55432 et ses données ont été conservées, mais ne sont plus utilisées par l’application. Les scripts db:setup / db:start / db:stop concernent uniquement cette ancienne configuration locale, pas le serveur actuel.

Documentation des endpoints : [API et architecture du backend](backend/docs/API.md).

## Connexion Google

L’intégration OAuth / OpenID Connect est prête. Son activation nécessite un client Google de type **Application Web**, GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET dans backend/.env. Le secret reste exclusivement côté serveur.

Guide : [Configurer la connexion Google](backend/docs/GOOGLE_AUTH.md).

La connexion Google et l’association explicite depuis « Mes stickers » sont proposées une fois les identifiants configurés. Si l’adresse possède déjà un compte avec mot de passe, l’utilisateur doit d’abord s’y connecter, puis associer Google. Les comptes ne sont pas fusionnés automatiquement.

## Fonctionnalités

- Accueil présentant l’atelier et l’avantage de la sauvegarde avec un compte.
- Inscription, connexion par e-mail / mot de passe et préparation de la connexion Google.
- Atelier : images, texte, emojis, zoom, position, rotation, recadrage et contour.
- Détourage des fonds unis ; export WebP statique 512 × 512, jusqu’à 100 Ko.
- Sans compte : stockage dans le navigateur.
- Avec compte : collection privée dans PostgreSQL, téléchargement et suppression.
- Transfert des stickers locaux vers le compte avec détection des doublons.
- Un pack de 6 stickers maximum par compte.

Les photos originales restent sur l’appareil. Seuls les stickers ajoutés au compte sont envoyés au serveur. Les ZIP ne s’installent pas directement dans WhatsApp : l’intégration mobile reste à développer.

## Vérification

```sh
npm test --prefix backend
npm run test:e2e --prefix Frontend
npm run build --prefix Frontend
```

Les tests backend utilisent PostgreSQL avec des schémas de test isolés. Les tests Google vérifient les jetons signés localement et simulent uniquement les échanges réseau avec Google ; ils ne remplacent pas un essai avec de vrais identifiants OAuth.

Les tests navigateur utilisent Microsoft Edge, les ports 5180 / 3002 et la base de test. Les captures sont dans Frontend/.browser-tests.

## Mise en ligne

Après compilation, `npm start --prefix backend` sert Frontend/dist et l’API. Configurez DATABASE_URL, NODE_ENV=production, APP_ORIGIN avec une origine HTTPS, les identifiants OAuth et des sauvegardes PostgreSQL. HOST=0.0.0.0 permet une écoute externe si nécessaire.

La récupération de mot de passe et la vérification des e-mails des comptes créés par mot de passe restent à ajouter avant une ouverture publique. L’accès depuis Internet nécessite le déploiement.
