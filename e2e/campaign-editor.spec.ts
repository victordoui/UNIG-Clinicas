import { expect, test } from "@playwright/test";

test("TV alterna com senha ativa e recebe pedido manual da clínica", async ({ page }) => {
  await page.route("**/src/hooks/useAuth.tsx*", route => route.fulfill({ contentType: "application/javascript", body: `export const AuthProvider = ({children}) => children; export const useAuth = () => ({ user: {id:'test-user'}, unigRole:'gestor_unidade', loading:false });` }));
  let request: unknown = null;
  await page.route("https://*.supabase.co/**", async route => {
    const url = new URL(route.request().url());
    const json = (data: unknown) => route.fulfill({ contentType: "application/json", body: JSON.stringify(data) });
    if (url.pathname.endsWith("/clinics")) return json([{ id: "clinic-test", name: "Odontologia", code: "odonto", organization_id: "org-test" }]);
    if (url.pathname.endsWith("/queue_sessions")) return json([{ id: "session-test", clinic_id: "clinic-test", status: "open" }]);
    if (url.pathname.endsWith("/queue_tickets")) return json([{ id: "ticket-test", queue_session_id: "session-test", ticket_number: 1, status: "called", priority: "normal", service_box: "Recepção", called_at: "2026-01-01T00:00:00Z", created_at: "2026-01-01T00:00:00Z" }]);
    if (url.pathname.endsWith("/tv_campaigns")) return json([{ id: "campaign-test", organization_id: "org-test", title: "Inserção automática de teste", message: "Campanha publicada", status: "published", display_seconds: 5, display_mode: "fullscreen", media_type: "text", media_fit: "contain" }]);
    if (url.pathname.endsWith("/tv_insertion_requests")) return json(request);
    return json([]);
  });
  await page.clock.install();
  await page.goto("/painel-tv?clinic=clinic-test");
  await expect(page.getByText("SENHA ATUAL", { exact: true })).toBeVisible();
  await page.clock.runFor(31_000);
  await expect(page.getByRole("heading", { name: "Inserção automática de teste" })).toBeVisible();
  await page.clock.runFor(6000);
  await expect(page.getByRole("heading", { name: "Inserção automática de teste" })).toHaveCount(0);
  const now = await page.evaluate(() => Date.now());
  request = { request_id: "request-test", campaign_id: "campaign-test", requested_at: new Date(now).toISOString(), expires_at: new Date(now + 10000).toISOString() };
  await page.clock.runFor(3000);
  await expect(page.getByRole("heading", { name: "Inserção automática de teste" })).toBeVisible();
});

// Testes isolados: nenhum login, upload ou alteração atinge o banco real.
test("biblioteca mantém quatro uploads e prévias acompanham seleção, edição e publicação", async ({ page }) => {
  const images: { name: string; id: string }[] = [];
  const campaigns: any[] = [];
  let updates = 0;
  await page.route("**/src/hooks/useAuth.tsx*", route => route.fulfill({ contentType: "application/javascript", body: `export const AuthProvider = ({children}) => children; export const useAuth = () => ({ user: {id:'test-user'}, unigRole:'gestor_unidade', activeClinicCode:'odonto', loading:false, profile:{}, clinicCodes:['odonto'] });` }));
  await page.route("**/src/components/layout/MainLayout.tsx*", route => route.fulfill({ contentType: "application/javascript", body: `export const MainLayout = ({children}) => children;` }));
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64");
  await page.route("https://*.supabase.co/**", async route => {
    const req = route.request(); const url = new URL(req.url());
    const json = (data: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    if (url.pathname.includes("/storage/v1/object/list/")) return json(images);
    if (url.pathname.includes("/storage/v1/object/public/")) return route.fulfill({ contentType: "image/png", body: png });
    if (url.pathname.includes("/storage/v1/object/")) { images.push({ name: decodeURIComponent(url.pathname.split("/").pop()!), id: String(images.length) }); return json({ Key: url.pathname }); }
    if (url.pathname.endsWith("/clinics")) return json({ organization_id: "test-org" });
    if (url.pathname.endsWith("/rpc/update_tv_campaign_content")) { updates++; Object.assign(campaigns[0], req.postDataJSON().content); return json(campaigns[0].id); }
    if (url.pathname.endsWith("/rpc/set_tv_campaign_publication")) { campaigns[0].status = req.postDataJSON().target_status; return json(null); }
    if (url.pathname.endsWith("/tv_campaigns")) {
      if (req.method() === "POST") { campaigns.push({ ...req.postDataJSON(), id: "campaign-test" }); return json(null, 201); }
      return json(campaigns);
    }
    return json([]);
  });
  await page.goto("/painel-tv/campanhas");
  await page.getByRole("button", { name: "Nova inserção" }).click();
  await page.getByLabel("Enviar mídias").setInputFiles([1, 2, 3, 4].map(n => ({ name: `imagem-${n}.png`, mimeType: "image/png", buffer: png })));
  await expect(page.getByText("(4 salvas)")).toBeVisible();
  await page.getByRole("button", { name: "Usar imagem-1.png", exact: true }).click();
  const integrated = page.getByRole("button", { name: /Modelo Integrado/ });
  const fullscreen = page.getByRole("button", { name: /Modelo Imersivo/ });
  await expect(integrated.locator("img")).toHaveAttribute("src", /imagem-1.png$/);
  await expect(fullscreen.locator("img")).toHaveAttribute("src", /imagem-1.png$/);
  await page.getByLabel("Título", { exact: true }).fill("Campanha de teste");
  await page.getByLabel("Descrição exibida na TV").fill("Mensagem de teste da inserção");
  await fullscreen.click();
  await page.getByLabel("Enquadramento da mídia").selectOption("cover");
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page.getByText("Rascunho", { exact: true })).toBeVisible();
  expect(campaigns[0]).toMatchObject({ display_mode: "fullscreen", media_fit: "cover", organization_id: "test-org" });
  await page.reload();
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await expect(page.getByText("(4 salvas)")).toBeVisible();
  await page.getByLabel("Título", { exact: true }).fill("Título atualizado");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByText("Título atualizado", { exact: true })).toBeVisible();
  expect(updates).toBe(1);
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page.getByText("Publicada", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await page.getByLabel("Enviar mídias").setInputFiles({ name: "invalido.png", mimeType: "image/png", buffer: Buffer.from("não é uma imagem") });
  await expect(page.getByRole("alert")).toContainText("imagem não pôde ser lida");
  expect(images).toHaveLength(4);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: "test-results/campaign-editor-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.locator("html").evaluate(el => el.scrollWidth <= window.innerWidth)).toBe(true);
});
