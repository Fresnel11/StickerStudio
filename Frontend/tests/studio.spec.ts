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
  await page.getByRole("button", { name: "Retirer le fond uni" }).click();
  await expect(page.getByRole("status")).toContainText("Fond uni retiré");
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
  expect(pixels.center).toEqual([255, 0, 0, 255]);
  await page.getByRole("button", { name: "Aperçu conversation" }).click();
  await expect(page.getByText("Alors, cette journée ?")).toBeVisible();
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
