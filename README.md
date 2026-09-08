# Sticker Studio

Atelier de stickers en français, développé avec React, TypeScript et Vite.

## Démarrage

```sh
npm install
npm run dev
```

Ouvrir http://127.0.0.1:5173. `npm run build` vérifie TypeScript et produit `dist/`.

Si le port est occupé, utilisez l’adresse affichée par Vite dans le terminal.

## Vérification

`npm run test:e2e` lance deux tests Playwright avec Microsoft Edge installé : création, export WebP (dimensions et poids), archive ZIP, persistance, suppression, import, détourage, rejet des formats invalides et affichage mobile. Le serveur de test utilise le port 5180. Les captures sont dans `.browser-tests/`.

`npm run format` formate les sources avec Prettier.

## Fonctionnalités

- Import PNG, JPEG et WebP (15 Mo maximum), glisser-déposer.
- Zoom, position, rotation, recadrage circulaire et contour blanc.
- Détourage de fond uni connecté aux bords, basé sur la couleur du coin supérieur gauche. Ce n’est pas un détourage IA pour les arrière-plans complexes.
- Texte, couleur et emojis ; aperçu de conversation.
- Export WebP 512 × 512, transparence et compression sous 100 Ko.
- Collection de 30 stickers maximum, persistée en localStorage ; export ZIP.

Les images sont traitées localement. Les polices Google Fonts nécessitent une connexion, avec polices système de secours. La collection reste dans le navigateur ; effacer ses données supprime les stickers enregistrés. Les réglages et le nom du pack ne sont pas persistés.

## WhatsApp

L’export ZIP contient les images et une notice. Il ne s’installe pas directement dans WhatsApp. L’intégration mobile Android/iOS reste à développer ; une application de création de packs peut servir à importer les fichiers. Un pack destiné à WhatsApp contient 3 à 30 stickers.

Référence officielle : https://github.com/WhatsApp/stickers/tree/main/Android
