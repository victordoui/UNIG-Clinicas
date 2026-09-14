import { expect, test } from "@playwright/test";

const viewports = [
  { name: "360", width: 360, height: 800 },
  { name: "390", width: 390, height: 844 },
  { name: "768", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

for (const viewport of viewports) {
  test(`autenticação mantém layout sem rolagem horizontal em ${viewport.name}px`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/auth");

    await expect(page.getByRole("heading", { name: "Entrar", exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Criar conta" })).toBeVisible();
    expect(await page.locator("html").evaluate(
      (element) => element.scrollWidth <= window.innerWidth,
    )).toBe(true);
  });
}

test("painel TV não expõe a tela de chamadas sem sessão autenticada", async ({ page }) => {
  await page.goto("/painel-tv");

  await expect(page).toHaveURL(/\/auth$/);
  await expect(page.getByRole("heading", { name: "Entrar", exact: true })).toBeVisible();
  await expect(page.getByText("Senha atual")).toHaveCount(0);
});

for (const portal of [
  { path: "/portal/paciente", label: "paciente" },
  { path: "/portal/tutor", label: "tutor" },
]) {
  test(`portal de ${portal.label} não expõe dados sem sessão`, async ({ page }) => {
    await page.goto(portal.path);

    await expect(page).toHaveURL(/\/auth$/);
    await expect(page.getByRole("heading", { name: "Entrar", exact: true })).toBeVisible();
  });
}

test("autenticação preserva foco e layout em zoom de 200%", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/auth");
  await page.evaluate(() => { document.body.style.zoom = "2"; });

  await expect(page.getByRole("textbox", { name: "E-mail" })).toBeVisible();
  expect(await page.locator("html").evaluate(
    (element) => element.scrollWidth <= window.innerWidth,
  )).toBe(true);
});

test("autenticação permite avançar pelos campos e ações usando teclado", async ({ page }) => {
  await page.goto("/auth");
  const email = page.getByRole("textbox", { name: "E-mail" });
  const password = page.getByRole("textbox", { name: "Senha" });
  const signIn = page.getByRole("button", { name: "Entrar", exact: true });

  await email.focus();
  await expect(email).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(password).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(signIn).toBeFocused();

  expect(await signIn.evaluate((element) => element.getBoundingClientRect().height >= 44)).toBe(true);
});

test("cadastro expõe nomes acessíveis para leitor de tela", async ({ page }) => {
  await page.goto("/auth");
  const signUpTab = page.getByRole("tab", { name: "Criar conta" });

  await signUpTab.focus();
  await page.keyboard.press("Enter");

  await expect(signUpTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("textbox", { name: "Nome completo" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Celular com DDD" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "E-mail" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Criar conta", exact: true })).toBeVisible();
});

test("QR de visitante valida os dados antes de emitir uma senha", async ({ page }) => {
  let guestJoinRequests = 0;
  await page.route("**/rest/v1/rpc/get_public_queue_session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify([{
        session_id: "session-test",
        clinic_name: "Clínica de teste",
        service_name: "Triagem",
        service_date: "2026-09-13",
        status: "open",
        entry_mode: "qr",
        starts_at: null,
        ends_at: null,
        max_capacity: 20,
      }]),
    });
  });
  await page.route("**/rest/v1/rpc/join_queue_as_guest", async (route) => {
    guestJoinRequests += 1;
    await route.fulfill({ contentType: "application/json", body: "[]" });
  });

  await page.goto("/fila/qr/token-de-teste");
  await expect(page.getByText("Clínica de teste")).toBeVisible();
  await page.getByRole("button", { name: "Entrar como visitante" }).click();

  await page.getByRole("textbox", { name: "Nome completo" }).fill("Ana");
  await page.getByRole("textbox", { name: "Celular com DDD" }).fill("(21) 99999-1234");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Emitir senha de visitante" }).click();

  await expect(page.getByRole("alert")).toHaveText("Informe nome e sobrenome.");
  await expect(page.getByRole("button", { name: "Emitir senha de visitante" })).toBeEnabled();
  expect(guestJoinRequests).toBe(0);

  await page.getByRole("textbox", { name: "Nome completo" }).fill("Ana Silva");
  await page.getByRole("textbox", { name: /E-mail/ }).fill("ana@invalido");
  await page.getByRole("button", { name: "Emitir senha de visitante" }).click();

  await expect(page.getByRole("alert")).toHaveText("Informe um e-mail válido ou deixe o campo em branco.");
  expect(guestJoinRequests).toBe(0);
});

test("QR de visitante exibe a senha retornada pela fila", async ({ page }) => {
  await page.route("**/rest/v1/rpc/get_public_queue_session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify([{
        session_id: "session-test",
        clinic_name: "Clínica de teste",
        service_name: "Triagem",
        service_date: "2026-09-13",
        status: "open",
        entry_mode: "qr",
        starts_at: null,
        ends_at: null,
        max_capacity: 20,
      }]),
    });
  });
  await page.route("**/rest/v1/rpc/join_queue_as_guest", async (route) => {
    expect(route.request().postDataJSON()).toMatchObject({
      target_token: "token-de-teste",
      guest_full_name: "Ana Silva",
      guest_phone: "(21) 99999-1234",
      accepted_data_terms: true,
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify([{ ticket_number: 27, ticket_id: "ticket-test" }]),
    });
  });

  await page.goto("/fila/qr/token-de-teste");
  await page.getByRole("button", { name: "Entrar como visitante" }).click();
  await page.getByRole("textbox", { name: "Nome completo" }).fill("Ana Silva");
  await page.getByRole("textbox", { name: "Celular com DDD" }).fill("(21) 99999-1234");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Emitir senha de visitante" }).click();

  await expect(page.getByText("Sua senha")).toBeVisible();
  await expect(page.getByText("27", { exact: true })).toBeVisible();
});
