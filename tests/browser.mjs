import { fileURLToPath } from "node:url";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE_PATH || "playwright"
);
const repository = fileURLToPath(new URL("../", import.meta.url));
const artifacts =
  process.env.BROWSER_ARTIFACT_DIR || "/tmp/ftd-browser-artifacts";
const port = process.env.BROWSER_TEST_PORT || "3420";
const base = `http://127.0.0.1:${port}`;
import { spawn } from "node:child_process";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const dir = await mkdtemp("/tmp/ftd-ui-");
const server = spawn(process.execPath, ["--import", "tsx", "server.ts"], {
  cwd: repository,
  env: {
    ...process.env,
    PORT: port,
    NODE_ENV: "production",
    KNOWLEDGE_DATA_DIR: dir,
  },
});
let log = "";
server.stdout.on("data", (s) => (log += s));
server.stderr.on("data", (s) => (log += s));
let browser;
try {
  for (let n = 0; n < 100; n++) {
    try {
      if ((await fetch(base + "/api/v1/knowledge/faq")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (
      m.type() === "error" &&
      !m.text().includes("ERR_TUNNEL_CONNECTION_FAILED")
    )
      errors.push(m.text());
  });
  const confirmChange = async (name) => {
    const response = page.waitForResponse(
      (r) =>
        r.request().method() === "POST" &&
        /\/(publish|remove|restore)$/.test(r.url()),
    );
    await page
      .getByRole("dialog")
      .getByRole("button", { name, exact: true })
      .click();
    const result = await response;
    assert.ok(result.ok(), await result.text());
  };
  await page.goto(base);
  await page.getByTitle("Switch persona or appearance").click();
  await page.getByRole("button", { name: /Seema Gulyani/ }).click();
  await page
    .getByRole("button", { name: "Chatbot Knowledge", exact: true })
    .click();
  const area = page.locator(".knowledge-area");
  assert.equal(
    await page.locator('header a[href^="tel:"]').count(),
    0,
    "Moderator navbar has no support numbers",
  );
  await area.getByLabel("Find content").waitFor();
  assert.equal(
    await area.locator(".knowledge-primary:visible").count(),
    1,
    "Content has one primary action",
  );
  await area
    .getByRole("heading", { name: "Chatbot Knowledge", exact: true })
    .waitFor();
  assert.equal(
    await area.getByRole("button", { name: "Advanced", exact: true }).count(),
    0,
  );
  await mkdir(artifacts, { recursive: true });
  for (const width of [360, 390, 768, 820, 1024, 1280, 1440])
    for (const dark of [false, true]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(
        (dark) => document.documentElement.classList.toggle("dark", dark),
        dark,
      );
      await page.waitForTimeout(100);
      const dimensions = await page.evaluate(() => ({
        w: innerWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      assert.ok(
        dimensions.scroll <= width + 1,
        `overflow ${width}: ${dimensions.scroll}`,
      );
      await page.screenshot({
        path: `${artifacts}/${width}-${dark ? "dark" : "light"}.png`,
        fullPage: true,
      });
    }
  console.log("PASS 14 viewport/theme checks");
  await page.setViewportSize({ width: 390, height: 1000 });
  await area.locator("summary").filter({ hasText: "Filters" }).click();
  const filterMenu = area.getByLabel("Topic", { exact: true });
  await filterMenu.waitFor({ state: "visible" });
  const filterBounds = await filterMenu.boundingBox();
  assert.ok(
    filterBounds.x >= 0 && filterBounds.x + filterBounds.width <= 390,
    "Phone filters stay in the viewport",
  );
  await area.locator("summary").filter({ hasText: "Filters" }).click();

  await area.getByRole("button", { name: "Try It", exact: true }).click();
  await area
    .getByLabel("Your question")
    .fill("Where do I collect the respite badge?");
  await area
    .getByRole("button", { name: "Ask the chatbot", exact: true })
    .click();
  await area.getByText("No content covers this yet", { exact: true }).waitFor();
  await area.getByRole("button", { name: "Add Content", exact: true }).click();
  const csv =
    "Question,Answer\nWhere is the visitor lantern?,The visitor lantern is at the blue reception desk.\n";
  await area
    .locator("input[type=file]")
    .first()
    .setInputFiles([
      {
        name: "respite.pdf",
        mimeType: "application/pdf",
        buffer: await (
          await import("node:fs/promises")
        ).readFile(
          fileURLToPath(new URL("./fixtures/respite.pdf", import.meta.url)),
        ),
      },
      { name: "visitor.csv", mimeType: "text/csv", buffer: Buffer.from(csv) },
    ]);
  await area
    .getByRole("button", { name: "Review these questions" })
    .waitFor({ timeout: 30000 });
  await area.getByRole("button", { name: "Review these questions" }).click();
  for (let n = 0; n < 3; n++) {
    const button = area.getByRole("button", { name: "Reviewed — continue" });
    if (await button.count()) {
      await button.click();
      await page.waitForTimeout(600);
    }
  }
  await area
    .getByRole("button", { name: "Publish content", exact: true })
    .waitFor();
  await area
    .getByRole("button", { name: "Publish content", exact: true })
    .click();
  await page.getByRole("dialog").waitFor();
  await page.screenshot({ path: `${artifacts}/phone-confirm.png` });
  await confirmChange("Publish content");
  await area
    .getByText("Done. The chatbot is now using this content.", { exact: true })
    .waitFor();
  await area
    .getByLabel("Your question")
    .fill("Where do I collect the respite badge?");
  await area.getByRole("button", { name: "Ask the chatbot" }).click();
  await area.getByText("This answer came from:", { exact: true }).waitFor();
  assert.match(await area.innerText(), /green desk/);
  assert.match(await area.innerText(), /All done/);
  await page.screenshot({
    path: `${artifacts}/phone-checked.png`,
    fullPage: true,
  });
  console.log("PASS PDF + CSV review, publish, sources, and automatic checks");
  await area.getByRole("button", { name: "My Content", exact: true }).click();
  await area.getByLabel("Find content").fill("visitor lantern");
  const card = area
    .locator("article")
    .filter({ hasText: "visitor lantern" })
    .first();
  await card.getByRole("button", { name: "Edit", exact: true }).click();
  await area
    .getByLabel("Answer", { exact: true })
    .fill("The visitor lantern is now at the purple reception desk.");
  await page.waitForTimeout(1200);
  await area
    .getByRole("button", { name: "Save and update chatbot", exact: true })
    .click();
  await confirmChange("Save and update chatbot");
  await area
    .getByText("Done. The chatbot is now using this content.", { exact: true })
    .waitFor();
  const chat = async () =>
    fetch(base + "/api/v1/knowledge/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "Where is the visitor lantern?" }),
    }).then((r) => r.json());
  for (let n = 0; n < 30; n++) {
    if ((await chat()).answer.includes("purple")) break;
    await page.waitForTimeout(100);
  }
  assert.match((await chat()).answer, /purple/);
  await area.getByRole("button", { name: "My Content", exact: true }).click();
  await area.getByLabel("Find content").fill("visitor lantern");
  await card.locator("summary").click();
  await card.getByRole("button", { name: "Remove", exact: true }).click();
  await confirmChange("Remove");
  await page.waitForTimeout(500);
  assert.equal((await chat()).noContent, true);
  await card.getByRole("button", { name: "Restore", exact: true }).click();
  await confirmChange("Restore");
  await page.waitForTimeout(500);
  assert.match((await chat()).answer, /purple/);
  console.log("PASS edit, removal, and restore on phone");
  await area.getByRole("button", { name: "Add Content", exact: true }).click();
  await area
    .getByRole("button", { name: "Add a question and answer", exact: true })
    .click();
  await area
    .getByLabel("Question", { exact: true })
    .fill("Where can I find the teal clinic folder?");
  await area
    .getByLabel("Answer", { exact: true })
    .fill("The teal clinic folder is in the reception cabinet.");
  assert.equal(
    await area.getByLabel("Display name", { exact: true }).isVisible(),
    false,
    "The doctor does not have to enter a second title",
  );
  await page.screenshot({
    path: `${artifacts}/phone-question-editor.png`,
    fullPage: true,
  });
  await area.getByRole("button", { name: "Reviewed — continue" }).click();
  await area
    .getByRole("button", { name: "Publish content", exact: true })
    .click();
  await confirmChange("Publish content");
  await area
    .getByText("Done. The chatbot is now using this content.", { exact: true })
    .waitFor();
  const simpleAnswer = await fetch(base + "/api/v1/knowledge/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "Where can I find the teal clinic folder?" }),
  }).then((r) => r.json());
  assert.match(simpleAnswer.answer, /reception cabinet/);
  assert.match(await area.innerText(), /All done/);
  console.log(
    "PASS single question publishing without duplicate title or configuration",
  );

  await area.getByRole("button", { name: "History", exact: true }).click();
  assert.match(await area.innerText(), /Seema Gulyani/);
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log("PASS history, role visibility, and no browser exceptions");
  await page.getByTitle("Switch persona or appearance").click();
  await page
    .getByRole("button", { name: /Hopkins CS Infrastructure Lead/ })
    .click();
  await page
    .getByRole("button", { name: "Chatbot Knowledge", exact: true })
    .click();
  await area.getByRole("button", { name: "Advanced", exact: true }).click();
  await area.getByText("Administrator controls", { exact: true }).waitFor();
  console.log("PASS admin-only Advanced visibility");
  assert.equal(
    await page.locator('header a[href^="tel:"]').count(),
    0,
    "Admin navbar has no support numbers",
  );
  await page.getByTitle("Switch persona or appearance").click();
  await page.getByRole("button", { name: /Sarah Smith/ }).click();
  await page.waitForTimeout(200);
  assert.ok(
    (await page.locator('header a[href^="tel:"]').count()) > 0,
    "Care partner contact links are retained",
  );
  assert.equal(
    await area.count(),
    0,
    "Staff knowledge is absent for care partners",
  );
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log("Screenshots:", artifacts);
} finally {
  await browser?.close();
  server.kill("SIGTERM");
  await new Promise((r) => server.once("exit", r));
  await rm(dir, { recursive: true, force: true });
}
