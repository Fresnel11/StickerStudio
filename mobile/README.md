# Sticker Studio mobile

Projet React Native + TypeScript, avec projets natifs Android et iOS. Cette base affiche un écran de démarrage ; elle ne contient pas encore les fonctionnalités du site.

## Android Studio sur Windows

1. Ouvrir le dossier `mobile/android` dans Android Studio.
2. Dans SDK Manager, installer Android SDK Platform 37, Build-Tools 37.0.0 et NDK 27.1.12297006 (versions du fichier android/build.gradle).
3. Laisser Android Studio synchroniser Gradle. Utiliser son JDK intégré dans les paramètres Gradle.
4. Dans Device Manager, créer et démarrer un émulateur Android.
5. Depuis la racine du dépôt, lancer Metro :

```powershell
npm start --prefix mobile
```

6. Cliquer sur Run dans Android Studio, avec le module app et cet émulateur sélectionnés.

Alternative en ligne de commande, dans un second terminal :

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
npm run android --prefix mobile
```

Les SDK 34 et 35 présents initialement sur cette machine ne suffisent pas pour compiler cette version du projet. Aucun lancement de l’émulateur n’a encore été validé.

## Backend

Le backend Express reste dans `../backend`. Depuis un émulateur Android Studio, l’adresse du PC hôte est `10.0.2.2` : l’API locale sera donc `http://10.0.2.2:3001/api`, et non localhost. Cette connexion sera intégrée avec l’authentification mobile.

## Organisation et objectif

- `App.tsx` : point d’entrée React.
- `android/` : projet Android Studio et future intégration WhatsApp.
- `ios/` : projet iOS, compilation avec Xcode sur macOS.
- `__tests__/` : tests React Native.

L’application complète doit reprendre la création et l’édition des stickers fixes et animés, les comptes et les packs du site, puis ajouter l’import natif dans WhatsApp.
