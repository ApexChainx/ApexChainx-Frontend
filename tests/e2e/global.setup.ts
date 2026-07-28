import { chromium } from "@playwright/test";
import { startMockServer, stopMockServer } from "./mock-server";

export default async function globalSetup() {
  startMockServer();

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:3000");
  await browser.close();

  process.env.PLAYWRIGHT_TEST = "true";
}

process.on("exit", () => {
  stopMockServer();
});
