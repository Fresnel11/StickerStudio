# Sticker Studio

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
  src/
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
npm run db:start --prefix backend
npm run dev:all --prefix Frontend
```

Le serveur local est accessible sur **http://127.0.0.1:5173** ; l’API utilise le port 3001. Pour un autre port frontend : `node backend/scripts/dev-all.mjs --port 5175`.

Pour démarrer séparément, utilisez deux terminaux :

```sh
npm run dev --prefix backend
npm run dev --prefix Frontend
```

## PostgreSQL

La configuration se trouve dans backend/.env, ignoré par Git. Une instance locale dédiée a été préparée sur 127.0.0.1:55432, avec ses données dans backend/data/postgres. L’instance habituelle sur 5432 n’est pas modifiée.

- `npm run db:setup --prefix backend` : initialise une instance dédiée si nécessaire, sans écraser une configuration .env existante.
- `npm run db:start --prefix backend` / `npm run db:stop --prefix backend` : démarrent et arrêtent cette instance.
- `npm run db:migrate --prefix backend` : applique les migrations. Elles sont également appliquées au démarrage de l’API.

Pour utiliser votre instance, copiez backend/.env.example vers backend/.env et configurez DATABASE_URL et TEST_DATABASE_URL. Les deux bases doivent exister ; la base de test doit avoir un nom terminé par _test. Ne supprimez pas backend/data, qui contient les données locales persistantes.

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
- Un pack de 30 stickers maximum par compte.

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
