# Sticker Studio Android — Capacitor

L’APK embarque les pages React de `../Frontend` : accueil, inscription, connexion, atelier et collection. Le backend Express/PostgreSQL reste partagé avec le site. Le plugin Android ajoute l’enregistrement de fichiers et l’intégration des packs WhatsApp.

## Construire et lancer

Depuis la racine du dépôt :

```powershell
npm install --prefix Frontend
npm install --prefix mobile
npm run sync --prefix mobile
npm run build:android --prefix mobile
npm run android --prefix mobile
```

La dernière commande ouvre `mobile/android` dans Android Studio. Sélectionner l’émulateur ou le téléphone puis Run. L’APK de développement est dans `mobile/android/app/build/outputs/apk/debug/app-debug.apk`.

Après chaque modification du frontend : exécuter `sync`, puis reconstruire/réinstaller. Aucun serveur Metro ni serveur Vite n’est nécessaire pour cette APK. Les fichiers HTML/CSS/JS sont embarqués, pas chargés depuis le site Vercel.

Utiliser le JDK intégré d’Android Studio, Android SDK 36 et les versions Gradle générées par Capacitor. `build:android` utilise automatiquement le JDK standard d’Android Studio sur Windows si JAVA_HOME n’est pas défini.

## API et authentification

`sync` compile le frontend en mode production et lit `Frontend/.env.production`, notamment son `VITE_API_URL`. Les secrets Google et PostgreSQL restent exclusivement dans le backend. Ne pas ajouter de secret dans une variable VITE_.

Les requêtes JSON utilisent CapacitorHttp avec les cookies Android. Les images et les modèles de détourage utilisent les APIs web ordinaires pour éviter de faire transiter de gros fichiers par le pont natif. Les originaux restent sur l’appareil. Les brouillons restent locaux et séparés par utilisateur ; seuls les stickers ajoutés au compte sont synchronisés.

L’origine locale de Capacitor diffère de celle de l’ancienne WebView React Native. Une nouvelle connexion au compte peut donc être nécessaire. Les anciens brouillons et packs invités ne sont pas automatiquement transférés entre ces deux stockages ; les packs sauvegardés dans le compte restent accessibles via le backend.

La connexion Google s’ouvre dans le navigateur système et utilise les endpoints `/api/auth/google/mobile` et `/api/auth/google/mobile/finish` déjà présents dans le backend. Le backend déployé doit contenir la migration 005 et ces endpoints. Le retour `stickerstudio://auth/complete` rouvre l’application sans transporter de jeton de session. Les identifiants OAuth Google et l’URI HTTPS de callback doivent être configurés sur le backend déployé.

## Ajouter un pack à WhatsApp

1. Créer entre **3 et 6 stickers**, puis donner un nom au pack.
2. Appuyer sur **Ajouter à WhatsApp** dans l’atelier ou la collection.
3. Choisir WhatsApp ou WhatsApp Business si les deux sont installés.
4. Confirmer l’ajout dans WhatsApp. Le pack apparaît dans son sélecteur de stickers.

Cela installe un pack ; l’utilisateur choisit ensuite sa conversation et envoie ses stickers depuis WhatsApp.

Le module vérifie les fichiers WebP 512 × 512, les plafonds de 100 Ko (fixes) / 500 Ko (animés), la durée maximale de 10 secondes et le minimum de 8 ms par image. Un pack contient uniquement des stickers fixes ou uniquement des stickers animés. L’icône de pack 96 × 96 est générée automatiquement. Une mise à jour garde l’identifiant du pack et change la version de ses fichiers.

Les packs explicitement exportés sont conservés dans le stockage privé Android pour que WhatsApp puisse continuer à les lire. Le ContentProvider n’expose que leurs métadonnées et leurs fichiers, sous la permission de lecture WhatsApp. Il n’expose ni compte, ni photo originale. La déconnexion du compte ne retire pas un pack déjà transmis à WhatsApp.

L’intégration native est Android. La migration iOS et son intégration WhatsApp ne sont pas incluses dans cette APK.

## Tests

```powershell
npm test --prefix backend
npm run build:android --prefix mobile
npm run test:android --prefix mobile
```

La dernière commande nécessite un émulateur démarré. Les tests Android vérifient le contrat ContentProvider, les fichiers, les mises à jour et le refus des chemins non autorisés. Un essai dans WhatsApp reste nécessaire pour vérifier sa confirmation et l’apparition réelle du pack.

## Organisation

- `capacitor.config.json` : identifiant Android, répertoire du frontend compilé et plugins.
- `android/` : projet Android Studio, `StudioPlugin`, `StickerStore`, `StickerContentProvider`, validation WebP et tests.
- `scripts/` : compilation, synchronisation et tests.
- `.legacy-react-native/` : ancienne base conservée localement pendant la migration, ignorée par Git et non embarquée.

Le certificat de débogage existant est conservé pour permettre la réinstallation sur l’émulateur. Une version de distribution doit être signée avec votre clé de production.
