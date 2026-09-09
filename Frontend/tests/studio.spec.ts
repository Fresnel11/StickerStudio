import { test, expect } from "@playwright/test";
import JSZip from "jszip";
import { readFile } from "node:fs/promises";

test("création, export WebP, persistance et archive ZIP", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/atelier");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "sticker",
  );
  await page.getByRole("tab", { name: "Texte", exact: true }).click();
  await page.getByLabel("Votre texte").fill("SALUT !");
  await page.getByRole("button", { name: "Au pack", exact: true }).click();
  await expect(page.getByAltText("Sticker 1", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByAltText("Sticker 1", { exact: true })).toBeVisible();
  const webpPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Télécharger", exact: true }).click();
  const webp = await webpPromise;
  const bytes = await readFile((await webp.path())!);
  expect(bytes.subarray(8, 12).toString()).toBe("WEBP");
  expect(bytes.length).toBeLessThanOrEqual(102400);
  const dimensions = await page.evaluate(async (base64) => {
    const img = new Image();
    img.src = "data:image/webp;base64," + base64;
    await img.decode();
    return [img.width, img.height];
  }, bytes.toString("base64"));
  expect(dimensions).toEqual([512, 512]);
  const zipPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exporter le pack" }).click();
  const archive = await zipPromise;
  const zip = await JSZip.loadAsync(await readFile((await archive.path())!));
  expect(Object.keys(zip.files)).toEqual(["sticker-1.webp", "LISEZ-MOI.txt"]);
  await page
    .getByRole("button", { name: "Supprimer le sticker 1", exact: true })
    .click();
  await page.reload();
  await expect(page.getByAltText("Sticker 1", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: ".browser-tests/desktop.png", fullPage: true });
  expect(errors).toEqual([]);
});

test("import, détourage et affichage mobile", async ({ page }) => {
  page.on("console", (message) => {
    if (message.type() === "error") console.log(message.text());
  });
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/atelier");
  const fixture = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 100;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 100, 100);
    ctx.fillStyle = "red";
    ctx.fillRect(30, 30, 40, 40);
    return c.toDataURL().split(",")[1];
  });
  await page.locator("input[type=file]").setInputFiles({
    name: "photo.png",
    mimeType: "image/png",
    buffer: Buffer.from(fixture, "base64"),
  });
  await expect(
    page.getByText("Image importée.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retirer l’arrière-plan" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Arrière-plan supprimé",
    {
      timeout: 60_000,
    },
  );
  const pixels = await page
    .locator("canvas")
    .evaluate((canvas: HTMLCanvasElement) => {
      const c = canvas.getContext("2d")!;
      return {
        outside: c.getImageData(100, 100, 1, 1).data[3],
        center: Array.from(c.getImageData(256, 235, 1, 1).data),
      };
    });
  expect(pixels.outside).toBe(0);
  // Neural matting may slightly alter RGB values; the subject must remain opaque and red.
  expect(pixels.center[0]).toBeGreaterThan(245);
  expect(pixels.center[1]).toBeLessThan(10);
  expect(pixels.center[2]).toBeLessThan(10);
  expect(pixels.center[3]).toBe(255);
  const roundCrop = page.getByRole("checkbox", { name: "Recadrage en cercle" });
  await roundCrop.check();
  await expect(
    page.getByRole("button", { name: "Annuler la dernière modification" }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Annuler la dernière modification" })
    .click();
  await expect(roundCrop).not.toBeChecked();
  await page.getByRole("button", { name: "Rétablir la modification" }).click();
  await expect(roundCrop).toBeChecked();
  expect(
    await page.locator("canvas").evaluate((canvas: HTMLCanvasElement) => {
      return canvas.getContext("2d")!.getImageData(10, 10, 1, 1).data[3];
    }),
  ).toBe(0);
  await page.getByRole("button", { name: "Aperçu conversation" }).click();
  await expect(page.getByText("Alors, cette journée ?")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ordinateur" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tablette" })).toBeVisible();
  const desktop = page.getByRole("button", { name: "Ordinateur" });
  const tablet = page.getByRole("button", { name: "Tablette" });
  const smartphone = page.getByRole("button", { name: "Smartphone" });
  const stickerWidth = async () =>
    (await page.locator(".device-chat canvas").boundingBox())!.width;
  const desktopWidth = await stickerWidth();
  await tablet.click();
  const tabletWidth = await stickerWidth();
  await smartphone.click();
  await expect(smartphone).toHaveAttribute("aria-pressed", "true");
  const smartphoneWidth = await stickerWidth();
  expect(desktopWidth).toBeGreaterThan(tabletWidth);
  expect(tabletWidth).toBeGreaterThan(smartphoneWidth);
  expect(smartphoneWidth).toBeLessThan(180);
  await expect(page.locator(".device-chat")).toHaveCSS(
    "background-image",
    /wa-bg\.png/,
  );
  const stickerBox = await page.locator(".device-chat canvas").boundingBox();
  expect(stickerBox?.width).toBeGreaterThan(100);
  expect(stickerBox?.height).toBeGreaterThan(100);
  expect(
    await page
      .locator(".device-chat canvas")
      .evaluate((canvas: HTMLCanvasElement) => {
        return canvas.getContext("2d")!.getImageData(256, 235, 1, 1).data[3];
      }),
  ).toBeGreaterThan(0);
  expect(
    await page
      .locator(".device-chat canvas")
      .evaluate((canvas: HTMLCanvasElement) => {
        return canvas.getContext("2d")!.getImageData(10, 10, 1, 1).data[3];
      }),
  ).toBe(0);
  await page.reload();
  await expect(page.getByText("Alors, cette journée ?")).toBeVisible();
  await expect(
    page.getByText("Recadrage en cercle", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".device-chat canvas")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Smartphone" }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: ".browser-tests/mobile.png", fullPage: true });
  await page.locator("input[type=file]").setInputFiles({
    name: "bad.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("bad"),
  });
  await expect(page.getByRole("status")).toContainText("Choisissez une image");
});

test("rognage, annulation et restauration de l’image", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/atelier");
  const fixture = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 100;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "red";
    ctx.fillRect(0, 0, 100, 100);
    return canvas.toDataURL().split(",")[1];
  });
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "crop.png",
      mimeType: "image/png",
      buffer: Buffer.from(fixture, "base64"),
    });
  await page
    .getByRole("button", { name: "Rogner l’image", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Rogner l’image" });
  await expect(dialog).toBeVisible();
  await page.getByLabel("Format", { exact: true }).selectOption("1");
  await page.screenshot({
    path: ".browser-tests/crop-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Appliquer le rognage" }).click();
  await expect(dialog).not.toBeVisible();
  await page
    .getByRole("button", { name: "Rogner l’image", exact: true })
    .click();
  await expect(page.getByAltText("Image à rogner")).toHaveJSProperty(
    "naturalWidth",
    100,
  );
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await page
    .getByRole("button", { name: "Annuler la dernière modification" })
    .click();
  await page
    .getByRole("button", { name: "Rogner l’image", exact: true })
    .click();
  await expect(page.getByAltText("Image à rogner")).toHaveJSProperty(
    "naturalWidth",
    100,
  );
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});

test("rotation du texte et raccourcis clavier", async ({ page }) => {
  await page.goto("/atelier");
  await page.getByRole("tab", { name: "Texte", exact: true }).click();
  const rotation = page.getByRole("slider", { name: "Rotation du texte" });
  await expect(rotation).toHaveValue("-5");
  await rotation.focus();
  await page.keyboard.press("ArrowRight");
  await expect(rotation).toHaveValue("-4");
  await page.keyboard.press("Control+z");
  await expect(rotation).toHaveValue("-5");
  await page.keyboard.press("Control+y");
  await expect(rotation).toHaveValue("-4");
  await page.keyboard.press("Control+z");
  await page.keyboard.press("Control+Shift+z");
  await expect(rotation).toHaveValue("-4");
  await page.getByLabel("Votre texte", { exact: true }).focus();
  await page.keyboard.press("Control+z");
  await expect(rotation).toHaveValue("-4");
  await expect(page.getByRole("slider", { name: "Taille du texte" })).toBeVisible();
  await expect(page.getByRole("slider", { name: "Zoom du texte" })).toBeVisible();
});

test("historique par geste et saisie", async ({ page }) => {
  await page.goto("/atelier");
  await page.getByRole("tab", { name: "Texte", exact: true }).click();
  const rotation = page.getByRole("slider", { name: "Rotation du texte" });
  await rotation.fill("-43");
  const box = (await rotation.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.38, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2, { steps: 20 });
  await page.mouse.up();
  const finalValue = await rotation.inputValue();
  expect(Number(finalValue)).toBeGreaterThan(50);
  await page.keyboard.press("Control+z");
  await expect(rotation).toHaveValue("-43");
  await page.keyboard.press("Control+y");
  await expect(rotation).toHaveValue(finalValue);
  await page.getByRole("button", { name: "Annuler la dernière modification" }).click();
  await expect(rotation).toHaveValue("-43");
  const text = page.getByLabel("Votre texte", { exact: true });
  const initial = await text.inputValue();
  await text.fill("");
  await text.pressSequentially("Bonjour !");
  await rotation.focus();
  await page.keyboard.press("Control+z");
  await expect(text).toHaveValue(initial);
  await page.keyboard.press("Control+y");
  await expect(text).toHaveValue("Bonjour !");
});
