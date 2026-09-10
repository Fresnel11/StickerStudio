import { test, expect } from "@playwright/test";
test("accueil, inscription, transfert local et collection sur un autre navigateur", async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const email = `creator-${Date.now()}@example.test`;
  const password = "Mes stickers sont chouettes 42!";
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Des stickers",
  );
  await page
    .getByRole("link", { name: "Créer mon premier sticker", exact: true })
    .click();
  await page.getByRole("button", { name: "Au pack", exact: true }).click();
  await expect(page.getByAltText("Sticker 1", { exact: true })).toBeVisible();
  await page
    .getByRole("link", { name: "Créer un compte", exact: true })
    .click();
  await page.getByLabel("Votre prénom").fill("Camille");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Créer mon compte", exact: true })
    .click();
  await expect(page).toHaveURL(/mes-stickers/);
  await page.getByRole("button", { name: "Transférer mes stickers" }).click();
  await expect(page.getByAltText("Sticker 1", { exact: true })).toBeVisible();
  await expect(page.getByText("Transférer mes stickers")).toHaveCount(0);
  await page.getByLabel("Nom de votre pack").fill("Mes favoris");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Nom du pack enregistré",
  );
  await page
    .getByRole("link", { name: "Créer un sticker", exact: true })
    .click();
  await page.getByRole("tab", { name: "Emojis" }).click();
  await page.getByRole("button", { name: "Utiliser 🥳", exact: true }).click();
  await page.getByRole("button", { name: "Au pack", exact: true }).click();
  await expect(page.getByAltText("Sticker 2", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/$/);
  const context = await browser.newContext();
  const second = await context.newPage();
  await second.goto("/mes-stickers");
  await expect(second).toHaveURL(/connexion/);
  await second.getByLabel("Adresse e-mail").fill(email);
  await second
    .getByLabel("Mot de passe", { exact: true })
    .fill("mauvais mot de passe");
  await second
    .getByRole("button", { name: "Me connecter", exact: true })
    .click();
  await expect(second.getByRole("alert")).toContainText("incorrect");
  await second.getByLabel("Mot de passe", { exact: true }).fill(password);
  await second
    .getByRole("button", { name: "Me connecter", exact: true })
    .click();
  await expect(second.getByAltText("Sticker 2", { exact: true })).toBeVisible();
  await expect(second.getByLabel("Nom de votre pack")).toHaveValue(
    "Mes favoris",
  );
  await second.reload();
  await expect(second.getByAltText("Sticker 2", { exact: true })).toBeVisible();
  const downloaded = second.waitForEvent("download");
  await second
    .getByRole("button", { name: "Télécharger le sticker 1", exact: true })
    .click();
  expect((await downloaded).suggestedFilename()).toBe("sticker-1.webp");
  await second
    .getByRole("button", { name: "Supprimer le sticker 1", exact: true })
    .click();
  await second.getByRole("button", { name: "Supprimer", exact: true }).click();
  await expect(second.getByAltText("Sticker 2", { exact: true })).toHaveCount(
    0,
  );
  await second.screenshot({
    path: ".browser-tests/library.png",
    fullPage: true,
  });
  await context.close();
  expect(errors).toEqual([]);
});

test("pages publiques sur ordinateur et mobile, navigation et formulaires", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1862, height: 952 });
  await page.goto("/");
  await page.screenshot({
    path: ".browser-tests/home-desktop.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: ".browser-tests/home-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("link", { name: "Créer un compte", exact: true })
    .click();
  await expect(page.getByLabel("Votre prénom")).toBeVisible();
  await page
    .getByLabel("Mot de passe", { exact: true })
    .fill("Une phrase privée");
  await page.getByRole("button", { name: "Afficher le mot de passe" }).click();
  await expect(
    page.getByLabel("Mot de passe", { exact: true }),
  ).toHaveAttribute("type", "text");
  await page.screenshot({
    path: ".browser-tests/register-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/route-inconnue");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "décollée",
  );
});

test("brouillons isolés entre comptes sur le même navigateur", async ({ page }) => {
  const suffix = Date.now();
  const password = "Un mot de passe de test 42!";
  const headers = { "X-Sticker-Studio": "1" };
  async function openText() {
    await page.goto("/atelier");
    await page.getByRole("tab", { name: "Texte", exact: true }).click();
  }
  await openText();
  await page.getByLabel("Votre texte", { exact: true }).fill("Brouillon invité");
  for (const name of ["Alice", "Bob"]) {
    const response = await page.request.post("/api/auth/register", {
      headers, data: { name, email: `${name}-${suffix}@example.test`, password },
    });
    expect(response.status()).toBe(201);
    await openText();
    await expect(page.getByLabel("Votre texte", { exact: true })).toHaveValue("TROP COOL !");
    await page.getByLabel("Votre texte", { exact: true }).fill(`Brouillon ${name}`);
    await page.request.post("/api/auth/logout", { headers, data: {} });
  }
  const response = await page.request.post("/api/auth/login", {
    headers, data: { email: `Alice-${suffix}@example.test`, password },
  });
  expect(response.status()).toBe(200);
  await openText();
  await expect(page.getByLabel("Votre texte", { exact: true })).toHaveValue("Brouillon Alice");
  await page.request.post("/api/auth/logout", { headers, data: {} });
  await openText();
  await expect(page.getByLabel("Votre texte", { exact: true })).toHaveValue("Brouillon invité");
});
