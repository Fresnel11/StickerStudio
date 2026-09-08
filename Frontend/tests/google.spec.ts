import { test, expect } from "@playwright/test";
test("bouton Google et message de configuration sans client OAuth", async ({
  page,
}) => {
  await page.goto("/connexion");
  await expect(
    page.getByRole("button", { name: "Continuer avec Google" }),
  ).toBeDisabled();
  await expect(
    page.getByText("La connexion Google sera bientôt disponible."),
  ).toBeVisible();
  await page.goto("/connexion?google=existing_account");
  await expect(page.getByRole("alert")).toContainText(
    "Connectez-vous avec votre mot de passe",
  );
  await page.goto("/inscription");
  await expect(
    page.getByRole("button", { name: "Continuer avec Google" }),
  ).toBeVisible();
});
