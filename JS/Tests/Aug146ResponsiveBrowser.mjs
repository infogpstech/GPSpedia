import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2"
};
const server = http.createServer((request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
    const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const target = path.resolve(ROOT, relative);
    if (target !== ROOT && !target.startsWith(ROOT + path.sep)) {
      response.writeHead(403).end("Forbidden"); return;
    }
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
      response.writeHead(404).end("Not found"); return;
    }
    response.writeHead(200, {
      "Content-Type": MIME[path.extname(target).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    });
    fs.createReadStream(target).pipe(response);
  } catch {
    response.writeHead(400).end("Bad request");
  }
});
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}/`;
const browser = await chromium.launch({ headless: true });
const profiles = [
  { name: "desktop", width: 1366, height: 768 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-360", width: 360, height: 800 },
  { name: "mobile-320", width: 320, height: 700 }
];
const failures = [];
let assertions = 0;
const check = (condition, message) => {
  assertions++;
  assert.ok(condition, message);
};
const near = (a, b, tolerance = 2) => Math.abs(a - b) <= tolerance;

try {
  for (const profile of profiles) {
    const context = await browser.newContext({
      viewport: { width: profile.width, height: profile.height },
      deviceScaleFactor: 1,
      isMobile: profile.width <= 520,
      hasTouch: profile.width <= 520,
      reducedMotion: "reduce"
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    await page.route("**/JS/Frontend/main.js", route =>
      route.fulfill({ status: 204, contentType: "text/javascript", body: "" }));
    await page.route("https://cdnjs.cloudflare.com/**", route => route.abort());
    await page.route("https://www.youtube.com/**", route => route.abort());
    const fulfillSyntheticService = async route => {
      let requestBody = "", request = {};
      try { requestBody = String(route.request().postData() || ""); request = JSON.parse(requestBody || "{}"); } catch {}
      if (request.action === "getPublicConfiguration") {
        const services = Object.fromEntries(["AUTH","CATALOG","WRITE","FEEDBACK","UTILITIES","ADMIN"].map(key => [
          key, { enabled: true, endpointUrl: "https://script.google.com/macros/s/TEST_" + key + "/exec", contractVersion: "2.2.5" }
        ]));
        return route.fulfill({ status: 200, contentType: "text/plain",
          body: JSON.stringify({ status: "success", schemaVersion: 1, revision: 1,
            routingAvailable: true, services, parameters: { rich_text_mode: "strict" } }) });
      }
      if (request.action === "getActivityLogs") {
        return route.fulfill({ status: 200, contentType: "text/plain",
          body: JSON.stringify({
            status: "success",
            data: [{ timestamp: "2026-11-24T12:00:00Z", nombreUsuario: "Usuario sintético",
              tipoActividad: "like", detalle: "Actividad de prueba", idElementoAsociado: "VEH-TEST-01" }],
            contributions: [{ userId: "SYNTHETIC", nombreUsuario: "Colaborador sintético",
              cortesAportados: 2, aportesRegistrados: 2, vehiculosConAportes: 1 }],
            insights: { summary: { vehicles: 1, cuts: 2, usefulVotes: 3, notUseful: 0, notWorking: 0 },
              topUseful: [], topNegative: [], years: {}, feedbackWindow: 500, windowLimited: false },
            diagnostics: { activitySheetAvailable: true, activityRowsAvailable: 1,
              inboxAuditSheetAvailable: true, inboxAuditRowsAvailable: 0,
              cortesSheetAvailable: true, cortesRowsAvailable: 1, contributionsAvailable: true }
          }) });
      }
      return route.fulfill({ status: 200, contentType: "text/plain",
        body: JSON.stringify({ status: "success", data: [], services: {}, revision: 1, urls: {} }) });
    };
    await page.route("https://script.google.com/**", fulfillSyntheticService);
    await page.route("https://script.googleusercontent.com/**", fulfillSyntheticService);
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#dev-tools-modal", { state: "attached" });
    await page.evaluate(async () => {
      const [ui, state, overlays] = await Promise.all([
        import("/JS/Frontend/ui.js"),
        import("/JS/Frontend/state.js"),
        import("/JS/Frontend/overlayHistory.js")
      ]);
      window.__aug146Ui = ui;
      window.__aug146State = state;
      window.overlayHistory = overlays.createOverlayHistoryManager(window.history);
      window.addEventListener("popstate", event => window.overlayHistory.handlePopState(event.state));
      state.setState({
        currentUser: {
          ID: "AUG146-BETA-SYNTHETIC",
          SessionToken: "SYNTHETIC-NOT-A-REAL-CREDENTIAL",
          Privilegios: "Desarrollador",
          Nombre_Usuario: "Prueba visual"
        },
        catalogData: { cortes: [], tutoriales: [], relay: [], logos: [] }
      });
      // La prueba no inicia main.js: retira únicamente el splash estático para
      // permitir interacciones reales con los controles que se están verificando.
      const splash = document.getElementById("splash-screen");
      if (splash) splash.style.display = "none";
    });

    const tutorialRender = await page.evaluate(() => {
      const ui = window.__aug146Ui;
      const variants = [
        "https://www.youtube.com/watch?v=abcdefghijk",
        "https://youtu.be/abcdefghijk",
        "https://www.youtube.com/shorts/abcdefghijk",
        "https://www.youtube.com/embed/abcdefghijk",
        "https://www.youtube-nocookie.com/embed/abcdefghijk",
        "https://www.youtube.com/live/abcdefghijk",
        "abcdefghijk"
      ];
      const invalidVariants = [
        "https://evil.example/watch?v=abcdefghijk",
        "https://www.youtube.com.evil.example/watch?v=abcdefghijk",
        "http://www.youtube.com/watch?v=abcdefghijk",
        "https://youtube.com@evil.example/watch?v=abcdefghijk",
        "https://www.youtube.com:8443/watch?v=abcdefghijk",
        "https://www.youtube.com/watch?v=short",
        "https://www.youtube.com/watch?v=abcdefghijk&v=zzzzzzzzzzz"
      ];
      const embeds = variants.map(value => ui.getValidatedYouTubeVideoEmbedUrl(value));
      const invalidEmbeds = invalidVariants.map(value => ui.getValidatedYouTubeVideoEmbedUrl(value));
      ui.mostrarDetalleTutorialModal({
        Tema: "Corte de ignición",
        comoIdentificarlo: '<div style="text-align:center;color:#ff0000;font-size:1.5em" onclick="window.__tutorialXss = true"><strong>Texto destacado</strong><a href="javascript:window.__tutorialXss=true">Enlace no confiable</a><img src="javascript:window.__tutorialXss=true" alt="Imagen no confiable" onerror="window.__tutorialXss=true"><script>window.__tutorialXss = true</script><iframe src="https://evil.example/embed"></iframe></div>',
        dondeEncontrarlo: '<p style="text-align:right;color:#008000">Ubicación de prueba</p>',
        Detalles: '<ul><li>Detalle con formato</li></ul>' + Array.from({ length: 60 }, (_, index) => '<p>Detalle extenso de prueba ' + index + ' para verificar que el contenido no reduzca el alto del reproductor.</p>').join(""),
        Video: "https://www.youtube.com/shorts/abcdefghijk"
      }, false);
      const detail = document.getElementById("detalleCompleto");
      const paragraph = detail.querySelector(".detail-rich-text-paragraph");
      const styled = paragraph && paragraph.querySelector("div[style]");
      const style = styled ? getComputedStyle(styled) : null;
      const validIframe = detail.querySelector("iframe.tutorial-youtube-embed");
      const validResult = {
        color: style ? style.color : "",
        textAlign: style ? style.textAlign : "",
        fontSize: style ? style.fontSize : "",
        emphasisPreserved: Boolean(paragraph && Array.from(paragraph.querySelectorAll("strong")).some(node => node.textContent.trim() === "Texto destacado")),
        listPreserved: Boolean(Array.from(detail.querySelectorAll(".detail-rich-text-paragraph ul li")).some(node => node.textContent.trim() === "Detalle con formato")),
        unsafeMarkupRemoved: Boolean(paragraph && !paragraph.querySelector("script,iframe,[onclick],[onerror],a[href^='javascript:'],img[src^='javascript:']")),
        iframeSrc: validIframe ? validIframe.src : "",
        iframeTitle: validIframe ? validIframe.title : "",
        iframeWidth: validIframe ? validIframe.getBoundingClientRect().width : 0,
        iframeHeight: validIframe ? validIframe.getBoundingClientRect().height : 0,
        iframeDisplay: validIframe ? getComputedStyle(validIframe).display : "none",
        iframeVisibility: validIframe ? getComputedStyle(validIframe).visibility : "hidden",
        iframeLoading: validIframe ? validIframe.loading : "missing",
        containerHeight: validIframe && validIframe.parentElement ? validIframe.parentElement.getBoundingClientRect().height : 0,
        titleText: detail.querySelector(".tutorial-detail-title")?.textContent || "",
        titleWhiteSpace: detail.querySelector(".tutorial-detail-title") ? getComputedStyle(detail.querySelector(".tutorial-detail-title")).whiteSpace : "",
        titleHeight: detail.querySelector(".tutorial-detail-title") ? detail.querySelector(".tutorial-detail-title").getBoundingClientRect().height : 0,
        titleLineHeight: detail.querySelector(".tutorial-detail-title") ? parseFloat(getComputedStyle(detail.querySelector(".tutorial-detail-title")).lineHeight) : 0 
      };
      ui.mostrarDetalleTutorialModal({
        Tema: "Tutorial con URL inválida",
        Video: "https://evil.example/watch?v=abcdefghijk"
      }, false);
      const invalidDetail = document.getElementById("detalleCompleto");
      const invalidResult = {
        iframeCount: invalidDetail.querySelectorAll("iframe").length,
        notice: invalidDetail.querySelector(".tutorial-video-unavailable")?.textContent || ""
      };
      const modal = document.getElementById("modalDetalle");
      if (modal) modal.classList.remove("visible");
      return { embeds, invalidEmbeds, validResult, invalidResult };
    });
    check(tutorialRender.embeds.length === 7 &&
      tutorialRender.embeds.every(value => value === "https://www.youtube.com/embed/abcdefghijk?enablejsapi=1"),
      profile.name + ": acepta watch, youtu.be, shorts, embed, nocookie, live e ID de YouTube");
    check(tutorialRender.invalidEmbeds.every(value => value === null),
      profile.name + ": rechaza dominios de vídeo ajenos a YouTube");
    check(tutorialRender.validResult.color === "rgb(255, 0, 0)" &&
      tutorialRender.validResult.textAlign === "center" &&
      tutorialRender.validResult.fontSize === "24px",
      profile.name + ": conserva color, alineación y tamaño de texto en detalle de Tutorial");
    check(tutorialRender.validResult.emphasisPreserved,
      profile.name + ": conserva el énfasis del contenido enriquecido");
    check(tutorialRender.validResult.listPreserved,
      profile.name + ": conserva las listas del contenido enriquecido");
    check(tutorialRender.validResult.unsafeMarkupRemoved,
      profile.name + ": elimina scripts, iframes, handlers y URLs activas del contenido enriquecido");
    check(tutorialRender.validResult.iframeSrc === "https://www.youtube.com/embed/abcdefghijk?enablejsapi=1" &&
      tutorialRender.validResult.iframeTitle.includes("Corte de ignición"),
      profile.name + ": renderiza el vídeo validado como iframe de YouTube");
    check(tutorialRender.validResult.iframeWidth > 0 && tutorialRender.validResult.iframeHeight >= 314 &&
      tutorialRender.validResult.iframeHeight <= 316 && tutorialRender.validResult.containerHeight >= 314,
      profile.name + ": el iframe mantiene 315 px de alto y no se contrae con contenido extenso");
    check(tutorialRender.validResult.iframeDisplay !== "none" &&
      tutorialRender.validResult.iframeVisibility === "visible" &&
      tutorialRender.validResult.iframeLoading !== "lazy",
      profile.name + ": el iframe permanece visible y no usa carga diferida");
    check(tutorialRender.validResult.titleText === "Corte de ignición" &&
      tutorialRender.validResult.titleWhiteSpace === "nowrap" &&
      tutorialRender.validResult.titleHeight <= tutorialRender.validResult.titleLineHeight + 12,
      profile.name + ": el título «Corte de ignición» permanece en una sola línea");
    check(tutorialRender.invalidResult.iframeCount === 0 &&
      tutorialRender.invalidResult.notice.includes("URL válida de YouTube"),
      profile.name + ": no renderiza iframe para una URL de vídeo no confiable");

    const cutHeaderRender = await page.evaluate(async () => {
      const ui = window.__aug146Ui;
      const state = window.__aug146State;
      const item = {
        id: "VEH-HEADER-SYNTHETIC",
        categoria: "Carros",
        marca: "Chevrolet",
        modelo: "Suburban",
        versionesAplicables: "Todas",
        anoDesde: "2021",
        anoHasta: "2026",
        tipoEncendido: "Llave",
        imagenVehiculo: "",
        videoGuiaDesarmeUrl: "",
        contadorBusqueda: 0,
        tipoCorte1: "Corte de ignición",
        ubicacionCorte1: "Zona de prueba",
        colorCableCorte1: "Azul",
        configRelay1: "",
        imgCorte1: "",
        utilCorte1: 365,
        colaboradorCorte1: "Pablo Peña",
        tipoCorte2: "",
        tipoCorte3: ""
      };
      state.setState({
        currentUser: { ID: "AUG146-HEADER-SYNTHETIC", SessionToken: "SYNTHETIC-NOT-A-REAL-CREDENTIAL",
          Privilegios: "Usuario", Nombre_Usuario: "Prueba visual" },
        catalogData: {
          cortes: [item], tutoriales: [], relay: [],
          logos: [{ nombreMarca: "Chevrolet", urlLogo: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='60'%3E%3Crect width='120' height='60' fill='%23ffffff'/%3E%3C/svg%3E" }]
        }
      });
      ui.mostrarDetalleModal(item, false, {});
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const modal = document.getElementById("modalDetalle");
      const logo = modal.querySelector(".detail-modal-title .brand-logo-modal");
      const model = modal.querySelector(".detail-modal-title-text");
      const divider = modal.querySelector(".detail-modal-divider");
      const logoRect = logo ? logo.getBoundingClientRect() : null;
      const modelRect = model ? model.getBoundingClientRect() : null;
      const dividerRect = divider ? divider.getBoundingClientRect() : null;
      return {
        hasLogo: Boolean(logo),
        hasModel: Boolean(model),
        hasDivider: Boolean(divider),
        logoBottom: logoRect ? logoRect.bottom : 0,
        modelBottom: modelRect ? modelRect.bottom : 0,
        dividerTop: dividerRect ? dividerRect.top : 0,
        logoObjectPosition: logo ? getComputedStyle(logo).objectPosition : "",
        logoTransform: logo ? getComputedStyle(logo).transform : "",
        logoContainerTransform: logo ? getComputedStyle(logo.parentElement).transform : "",
        modelTransform: model ? getComputedStyle(model).transform : "",
        modelWhiteSpace: model ? getComputedStyle(model).whiteSpace : "",
        modelFontSize: model ? parseFloat(getComputedStyle(model).fontSize) : 0
      };
    });
    console.log("CUT_HEADER_GEOMETRY " + profile.name + " " + JSON.stringify(cutHeaderRender));
    check(cutHeaderRender.hasLogo && cutHeaderRender.hasModel && cutHeaderRender.hasDivider,
      profile.name + ": encabezado de corte renderiza logo, modelo y línea azul");
    check(Math.abs(cutHeaderRender.logoBottom - cutHeaderRender.modelBottom) <= 3 &&
      Math.abs((cutHeaderRender.dividerTop - cutHeaderRender.logoBottom) -
        (cutHeaderRender.dividerTop - cutHeaderRender.modelBottom)) <= 3 &&
      (cutHeaderRender.logoObjectPosition.includes("bottom") || cutHeaderRender.logoObjectPosition.includes("100%")),
      profile.name + ": logo y modelo alineados abajo con igual separación de la línea azul");
    check(cutHeaderRender.modelWhiteSpace === "nowrap" &&
      (profile.width > 520 || cutHeaderRender.modelFontSize >= 18),
      profile.name + ": nombre del modelo sin saltos y +2px en móvil");

    await page.evaluate(() => {
      // Cerrar el modal de corte antes de medir Developer: ambas capas no forman
      // parte de la misma vista y no deben competir por el foco/stack de overlays.
      const detailModal = document.getElementById("modalDetalle");
      const detailOverlayId = detailModal && detailModal.dataset.gpOverlayHistoryId;
      if (detailOverlayId && window.overlayHistory && window.overlayHistory.has(detailOverlayId)) {
        window.overlayHistory.close(detailOverlayId);
      } else if (detailModal) {
        detailModal.classList.remove("visible");
      }
      // Dejar el modal realmente cerrado sin un display inline que impida
      // que mostrarDetalleModal lo vuelva a abrir en la siguiente fase.
      if (detailModal) {
        detailModal.classList.remove("visible");
        detailModal.style.removeProperty("display");
        detailModal.setAttribute("aria-hidden", "true");
      }
      // Restablecer el usuario sintético antes de medir el panel Developer.
      window.__aug146State.setState({
        currentUser: {
          ID: "AUG146-BETA-SYNTHETIC",
          SessionToken: "SYNTHETIC-NOT-A-REAL-CREDENTIAL",
          Privilegios: "Desarrollador",
          Nombre_Usuario: "Prueba visual"
        }
      });
      return window.__aug146Ui.openDevTools();
    });
    const developerModal = page.locator("#dev-tools-modal");
    await developerModal.waitFor({ state: "visible" });
    const developerBounds = await developerModal.boundingBox();
    check(Boolean(developerBounds), profile.name + ": modal Developer visible");
    check(developerBounds.x >= -1 && developerBounds.y >= -1,
      profile.name + ": modal Developer no inicia fuera del viewport");
    check(developerBounds.x + developerBounds.width <= profile.width + 1,
      profile.name + ": modal Developer no excede el ancho del viewport");
    check(developerBounds.y + developerBounds.height <= profile.height + 1,
      profile.name + ": modal Developer no excede la altura del viewport");

    const consoleCard = developerModal.locator(".dev-console-shared");
    const consoleHeading = developerModal.locator(".dev-console-shared .dev-card-heading");
    const headingTitle = consoleHeading.locator("h4");
    const infoButton = consoleHeading.locator(".gp-help-trigger");
    const clearButton = developerModal.locator("#btn-clear-console-log");
    const copyButton = developerModal.locator("#btn-copy-console-log");
    const contentBox = await developerModal.locator(".dev-tools-modal-content").boundingBox();
    const [consoleBox, headingBox, titleBox, infoBox, clearBox, copyBox] = await Promise.all([
      consoleCard.boundingBox(), consoleHeading.boundingBox(), headingTitle.boundingBox(),
      infoButton.boundingBox(), clearButton.boundingBox(), copyButton.boundingBox()
    ]);
    check(Boolean(contentBox && consoleBox && headingBox && titleBox && infoBox && clearBox && copyBox),
      profile.name + ": encabezado y controles de consola renderizados");
    const consoleWidthRatio = consoleBox.width / contentBox.width;
    const consoleHeightRatio = consoleBox.height / contentBox.height;
    check(consoleWidthRatio >= 0.9,
      profile.name + ": consola ocupa todo el ancho disponible");
    check(consoleHeightRatio >= 0.4,
      profile.name + ": consola conserva aproximadamente la mitad de la altura útil");
    check([infoBox, clearBox, copyBox].every(box =>
      near(titleBox.y + titleBox.height / 2, box.y + box.height / 2, 4)),
      profile.name + ": información, limpiar y copiar alineados junto al título");
    check(titleBox.x + titleBox.width <= infoBox.x + 2 &&
      infoBox.x + infoBox.width <= clearBox.x + 2 &&
      clearBox.x + clearBox.width <= copyBox.x + 2 &&
      copyBox.x + copyBox.width <= headingBox.x + headingBox.width + 1,
      profile.name + ": título e iconos agrupados a la izquierda sin separaciones automáticas");

    const terminalRow = developerModal.locator(".dev-terminal-row");
    const terminalInput = developerModal.locator("#dev-terminal-input");
    const terminalButton = developerModal.locator("#btn-terminal-send");
    const [terminalBox, inputBox, sendBox] = await Promise.all([
      terminalRow.boundingBox(), terminalInput.boundingBox(), terminalButton.boundingBox()
    ]);
    check(Boolean(terminalBox && inputBox && sendBox), profile.name + ": terminal renderizada");
    check(near(inputBox.y + inputBox.height / 2, sendBox.y + sendBox.height / 2, 4),
      profile.name + ": campo y botón de ejecución en la misma fila");
    check(inputBox.x >= terminalBox.x - 1 &&
      sendBox.x + sendBox.width <= terminalBox.x + terminalBox.width + 1 &&
      inputBox.x + inputBox.width <= sendBox.x + 2,
      profile.name + ": terminal contenida y sin solapamientos");

    const tabIds = ["diagnostics", "database", "images", "system"];
    const tabBoxes = [];
    for (const tabId of tabIds) {
      const radio = developerModal.locator("#dev-tab-" + tabId);
      const label = developerModal.locator('label[for="dev-tab-' + tabId + '"]');
      await label.click();
      check(await radio.isChecked(), profile.name + ": pestaña " + tabId + " seleccionable");
      const labelStates = await developerModal.locator(".dev-tab-link").evaluateAll((labels, activeTabId) =>
        labels.map(item => ({
          active: item.htmlFor === "dev-tab-" + activeTabId,
          maxWidth: getComputedStyle(item.querySelector("span")).maxWidth,
          opacity: getComputedStyle(item.querySelector("span")).opacity,
          iconVisible: Boolean(item.querySelector("i") && getComputedStyle(item.querySelector("i")).display !== "none")
        })), tabId
      );
      check(labelStates.every(state => state.iconVisible &&
        (state.active ? state.opacity === "1" : state.opacity === "0")),
        profile.name + ": solo la pestaña " + tabId + " expande su etiqueta");
      tabBoxes.push(await label.boundingBox());
    }
    check(tabBoxes.every(Boolean), profile.name + ": cuatro pestañas con geometría disponible");
    check(tabBoxes.every(box => near(box.y, tabBoxes[0].y, 3)),
      profile.name + ": las cuatro pestañas permanecen en una sola fila horizontal");
    check(tabBoxes.every((box, index) => index === 0 ||
      tabBoxes[index - 1].x + tabBoxes[index - 1].width <= box.x + 2),
      profile.name + ": pestañas ordenadas de izquierda a derecha sin solaparse");

    const helpButtons = developerModal.locator(".gp-help-trigger");
    const helpCount = await helpButtons.count();
    check(helpCount > 0, profile.name + ": ayudas contextuales disponibles");
    const firstHelp = helpButtons.first();
    const helpId = await firstHelp.getAttribute("aria-controls");
    check(Boolean(helpId), profile.name + ": ayuda vinculada mediante aria-controls");
    const helpPanel = developerModal.locator("#" + helpId);
    check(await helpPanel.evaluate(element => element.hidden),
      profile.name + ": ayuda oculta inicialmente");
    await firstHelp.click({ force: true });
    check(await helpPanel.evaluate(element => !element.hidden),
      profile.name + ": ayuda se muestra al activarla");
    check(await firstHelp.getAttribute("aria-expanded") === "true",
      profile.name + ": aria-expanded se actualiza al abrir ayuda");
    await firstHelp.click({ force: true });
    check(await helpPanel.evaluate(element => element.hidden),
      profile.name + ": la ayuda se puede volver a cerrar con su control");

    await page.screenshot({
      path: path.join(ROOT, "artifacts", "aug-146-" + profile.name + "-developer.png"),
      fullPage: false
    });

    await page.evaluate(() => {
      const modal = document.getElementById("dev-tools-modal");
      modal.style.display = "none";
      modal.setAttribute("aria-hidden", "true");
    });
    await page.evaluate(() => {
      const logo = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60" viewBox="0 0 120 60"><rect width="120" height="60" rx="8" fill="#1d4ed8"/><text x="60" y="39" text-anchor="middle" font-size="28" fill="white">T</text></svg>'
      );
      window.__aug146Fixture = {
        id: "AUG146-BETA-VEHICLE-001",
        marca: "Toyota",
        modelo: "Modelo de prueba con nombre deliberadamente extenso",
        categoria: "Autos",
        versionesAplicables: "Versión sintética",
        tipoEncendido: "Llave",
        anoDesde: "2020",
        anoHasta: "2025",
        vin: "",
        imagenVehiculo: "",
        notaImportante: "",
        apertura: "",
        imgApertura: "",
        colaboradorApertura: "",
        cableAlimen: "",
        imgCableAlimen: "",
        cableAlimen2: "",
        imgCableAlimen2: "",
        cableAlimen3: "",
        imgCableAlimen3: "",
        colaboradorAlimen: "",
        colaborador: "Prueba automatizada",
        Video: ""
      };
    });
    await page.evaluate(async () => {
      const state = await import("/JS/Frontend/state.js");
      const logo = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60" viewBox="0 0 120 60"><rect width="120" height="60" rx="8" fill="#1d4ed8"/><text x="60" y="39" text-anchor="middle" font-size="28" fill="white">T</text></svg>'
      );
      state.setState({
        catalogData: {
          cortes: [window.__aug146Fixture], tutoriales: [], relay: [],
          logos: [{ nombreMarca: "Toyota", urlLogo: logo }]
        }
      });
      window.__aug146Ui.mostrarDetalleModal(window.__aug146Fixture);
      window.__aug146Ui.showSavingIndicator("saving", "Guardando…");
    });

    const detailModal = page.locator("#modalDetalle");
    await detailModal.waitFor({ state: "visible" });
    const logoImage = detailModal.locator(".brand-logo-modal");
    await logoImage.waitFor({ state: "visible" });
    await page.waitForFunction(() => {
      const image = document.querySelector("#modalDetalle .brand-logo-modal");
      return image && image.complete && image.naturalWidth > 0;
    });
    const toolbar = detailModal.locator(".detail-modal-toolbar");
    const logoBox = await logoImage.boundingBox();
    const toolbarBox = await toolbar.boundingBox();
    const modelBox = await detailModal.locator(".detail-modal-title-text").boundingBox();
    const actionsBox = await detailModal.locator(".detail-modal-header-actions").boundingBox();
    const dividerBox = await detailModal.locator(".detail-modal-divider").boundingBox();
    const savingBox = await detailModal.locator("#modal-saving-indicator").boundingBox();
    check(Boolean(logoBox && toolbarBox && modelBox && actionsBox && dividerBox && savingBox),
      profile.name + ": elementos del encabezado de detalle renderizados");
    check(logoBox.x >= toolbarBox.x - 1 && logoBox.y >= toolbarBox.y - 1 &&
      logoBox.x + logoBox.width <= toolbarBox.x + toolbarBox.width + 1,
      profile.name + ": logo contenido dentro del encabezado sin desplazarse fuera del área útil");
    check(actionsBox.x >= toolbarBox.x - 1 &&
      actionsBox.x + actionsBox.width <= toolbarBox.x + toolbarBox.width + 1,
      profile.name + ": acciones del encabezado contenidas");
    check(modelBox.x >= toolbarBox.x - 1 &&
      modelBox.x + modelBox.width <= toolbarBox.x + toolbarBox.width + 1,
      profile.name + ": nombre del modelo contenido");
    check(dividerBox.x >= toolbarBox.x - 1 &&
      dividerBox.x + dividerBox.width <= toolbarBox.x + toolbarBox.width + 1,
      profile.name + ": divisor azul contenido");
    check(savingBox.x >= toolbarBox.x - 1 &&
      savingBox.x + savingBox.width <= toolbarBox.x + toolbarBox.width + 1,
      profile.name + ": indicador de guardado contenido");
    console.log(profile.name + " detail header geometry: " + JSON.stringify({
      model: modelBox, actions: actionsBox, toolbar: toolbarBox,
      layout: await toolbar.getAttribute("data-model-title-layout"),
      rows: await toolbar.evaluate(element => getComputedStyle(element).gridTemplateRows)
    }));
    check(modelBox.y >= actionsBox.y + actionsBox.height - 1,
      profile.name + ": modelo debajo de la fila de acciones");
    check(dividerBox.y >= Math.max(modelBox.y + modelBox.height, savingBox.y + savingBox.height) - 1,
      profile.name + ": divisor debajo del modelo y del estado de guardado");
    check(toolbarBox.x >= -1 && toolbarBox.x + toolbarBox.width <= profile.width + 1,
      profile.name + ": encabezado sin desbordamiento horizontal");

    await page.screenshot({
      path: path.join(ROOT, "artifacts", "aug-146-" + profile.name + "-detail.png"),
      fullPage: false
    });

    // Entrar al modo de edición sin guardar ni descartar: se valida la geometría
    // real del input y de los controles, sin enviar escrituras al servicio.
    const editButton = detailModal.locator('button[aria-label="Activar modo edición"]');
    check(await editButton.count() === 1, profile.name + ": acción de edición disponible");
    await editButton.click();
    const editInput = detailModal.locator(".detail-modal-title-input");
    await editInput.waitFor({ state: "visible" });
    const editInputBox = await editInput.boundingBox();
    const editToolbar = detailModal.locator(".detail-modal-toolbar");
    const editToolbarBox = await editToolbar.boundingBox();
    const editLogoBox = await logoImage.boundingBox();
    const editActionsBox = await detailModal.locator(".detail-modal-header-actions").boundingBox();
    const titleLayout = await editToolbar.getAttribute("data-model-title-layout");
    const saveButton = detailModal.locator('button[aria-label="Guardar cambios"]');
    const discardButton = detailModal.locator('button[aria-label="Descartar cambios"]');
    const saveBox = await saveButton.boundingBox();
    const discardBox = await discardButton.boundingBox();
    check(Boolean(editInputBox && editToolbarBox && editLogoBox && editActionsBox && saveBox && discardBox),
      profile.name + ": input y acciones del encabezado en modo edición");
    check(editInputBox.x >= editToolbarBox.x - 1 &&
      editInputBox.x + editInputBox.width <= editToolbarBox.x + editToolbarBox.width + 1,
      profile.name + ": input de edición contenido en el encabezado");
    const overlapsLogo = editInputBox.x < editLogoBox.x + editLogoBox.width - 1 &&
      editInputBox.x + editInputBox.width > editLogoBox.x + 1 &&
      editInputBox.y < editLogoBox.y + editLogoBox.height - 1 &&
      editInputBox.y + editInputBox.height > editLogoBox.y + 1;
    check(!overlapsLogo, profile.name + ": input de edición no se solapa con el logo");
    if (titleLayout === "below-logo") {
      check(editInputBox.y >= editLogoBox.y + editLogoBox.height - 1,
        profile.name + ": nombre largo se coloca debajo del logo");
    } else {
      check(editInputBox.x >= editLogoBox.x + editLogoBox.width - 1,
        profile.name + ": input corto conserva la columna derecha del logo");
    }
    check(editInputBox.y >= editActionsBox.y + editActionsBox.height - 1,
      profile.name + ": input de edición debajo de los controles superiores");
    check(saveBox.x >= editActionsBox.x - 1 &&
      saveBox.x + saveBox.width <= editActionsBox.x + editActionsBox.width + 1 &&
      discardBox.x >= editActionsBox.x - 1 &&
      discardBox.x + discardBox.width <= editActionsBox.x + editActionsBox.width + 1,
      profile.name + ": guardar y descartar contenidos en la fila de acciones");
    await page.screenshot({
      path: path.join(ROOT, "artifacts", "aug-146-" + profile.name + "-detail-edit.png"),
      fullPage: false
    });

    await page.evaluate(async () => {
      const detail = document.getElementById("modalDetalle");
      if (detail) { detail.style.display = "none"; detail.classList.remove("visible"); }
      await window.__aug146Ui.openDashboard();
    });
    const dashboard = page.locator("#dashboard-modal");
    await dashboard.waitFor({ state: "visible" });
    const activityRows = dashboard.locator("#activity-logs tr");
    const contributionRows = dashboard.locator("#activity-contributions tr");
    check(await activityRows.count() === 1, profile.name + ": dashboard muestra la actividad sintética");
    check((await activityRows.first().innerText()).includes("Actividad de prueba"),
      profile.name + ": descripción de actividad visible");
    check(await contributionRows.count() === 1, profile.name + ": dashboard muestra el aporte sintético");
    check((await dashboard.locator("#activity-insights").innerText()).includes("3"),
      profile.name + ": dashboard muestra métricas sintéticas");
    check(await dashboard.locator("#activity-dashboard-status").evaluate(element => element.hidden),
      profile.name + ": dashboard oculta el estado cuando los datos están disponibles");
    await page.screenshot({
      path: path.join(ROOT, "artifacts", "aug-146-" + profile.name + "-dashboard.png"),
      fullPage: false
    });

    check(pageErrors.length === 0,
      profile.name + ": sin excepciones JavaScript en navegador (" + pageErrors.join("; ") + ")");
    console.log("PASS " + profile.name + " (" + profile.width + "x" + profile.height + ")");
    await context.close();
  }
  console.log("AUG-146 Playwright: " + assertions + "/" + assertions + " PASS; 4 viewports; 16 capturas.");
} catch (error) {
  failures.push(error);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
if (failures.length) {
  for (const failure of failures) console.error(failure && failure.stack || failure);
  process.exitCode = 1;
}
