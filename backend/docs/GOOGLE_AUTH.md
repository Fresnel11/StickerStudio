# Activer la connexion Google

Le code est prêt, mais les identifiants Google doivent être créés dans votre propre projet Google Cloud. Aucun identifiant de démonstration n’est utilisé.

## 1. Créer le client

1. Ouvrez [Google Auth Platform](https://console.cloud.google.com/auth/overview) et sélectionnez ou créez un projet.
2. Configurez le nom de l’application, l’adresse de support et l’audience. Pour un projet en mode test, ajoutez les comptes autorisés à tester.
3. Dans **Clients**, créez un client OAuth de type **Application Web**.
4. Ajoutez exactement cette **URI de redirection autorisée** :

   ```text
   http://127.0.0.1:5173/api/auth/google/callback
   ```

Le parcours passe par une redirection serveur : aucune clé Google n’est nécessaire dans React. Les autorisations demandées sont uniquement `openid`, `email` et `profile`.

## 2. Configurer le backend

Complétez les entrées déjà préparées dans `backend/.env` :

```dotenv
APP_ORIGIN=http://127.0.0.1:5173
GOOGLE_CLIENT_ID=votre-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=votre-secret-google
```

Ne placez jamais le secret dans une variable `VITE_`, dans le frontend ou dans Git. Le fichier `.env` est ignoré par Git. Ne publiez pas vos identifiants dans une conversation.

En développement sur Windows, les commandes `dev` et `dev:all` surveillent maintenant `.env` et redémarrent automatiquement le backend quand il est enregistré. Un serveur lancé avec `start` doit être redémarré manuellement. Relancez ensuite le parcours depuis « Continuer avec Google » : une page Google déjà ouverte conserve les paramètres de la demande initiale.

Ouvrez l’application en utilisant exactement l’origine configurée. `localhost` et `127.0.0.1` ne sont pas interchangeables pour les cookies et les URI OAuth.

### Un ancien nom d’application apparaît

Le nom affiché par Google dépend du Branding du projet propriétaire du client OAuth, pas du nom React. Vérifiez **Google Auth Platform → Clients** (le client doit correspondre à GOOGLE_CLIENT_ID), puis **Branding / Identité de marque** dans ce même projet. Les modifications de marque peuvent être conservées comme brouillon selon l’état de vérification du projet.

Depuis la racine, `npm run google:check --prefix backend` compare le client réellement envoyé par le serveur à celui du fichier .env, sans afficher les secrets. Ce diagnostic ne peut pas lire le nom configuré dans la console Google.

Pour un autre port, changez `APP_ORIGIN` et l’URI autorisée dans Google. Pour la production, utilisez une origine HTTPS et `NODE_ENV=production`.

## 3. Vérifier

- « Continuer avec Google » devient actif sur les pages de connexion et d’inscription.
- Un nouveau compte Google crée un compte Sticker Studio sans mot de passe local.
- Une connexion ultérieure retrouve le même compte grâce à l’identifiant Google `sub`, et donc la même collection.
- Si l’e-mail existe déjà dans Sticker Studio, connectez-vous d’abord par mot de passe. Depuis **Mes stickers**, cliquez sur **Associer mon compte Google**, puis choisissez le compte Google ayant la même adresse.
- Annuler la connexion ramène au formulaire avec un message explicite.

## Fonctionnement

Le backend utilise la bibliothèque officielle `google-auth-library`, le flux de code d’autorisation et PKCE. L’état OAuth est stocké temporairement dans PostgreSQL, lié à un cookie HttpOnly et consommé une seule fois. L’identité vérifiée inclut la signature, l’émetteur, l’audience, l’expiration, le nonce et la confirmation de l’adresse e-mail. Une session Sticker Studio est ensuite créée ; les jetons Google ne sont pas conservés.

Les migrations ajoutent `users.google_subject` et la table `oauth_requests` sans supprimer les comptes existants.

Les tests automatisés couvrent le retour OAuth avec un fournisseur simulé, la validation cryptographique avec des jetons signés localement, les tentatives de rejeu et l’association explicite. La validation réelle avec Google doit être faite une fois le client configuré.

Sources : [Flux OAuth pour applications serveur](https://developers.google.com/identity/protocols/oauth2/web-server) et [OpenID Connect Google](https://developers.google.com/identity/openid-connect/openid-connect).
