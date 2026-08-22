const releaseUrl =
  process.env.ELEGEX_RELEASE_URL || "https://elegexapp-jvc9dhln.manus.space/";
const expectedText =
  process.env.ELEGEX_EXPECTED_TEXT ||
  "Every job, visible from booking to invoice.";
const primaryPaths = ["/", "/jobs", "/documents", "/reports", "/field"];
const managedDocumentPath =
  "/manus-storage/elegex-demo-job-card-2045_7797837f.txt";
const targets = await fetch("http://127.0.0.1:9222/json/list").then(response =>
  response.json()
);
const target = targets.find(item => item.type === "page");
if (!target?.webSocketDebuggerUrl)
  throw new Error(
    "No debuggable browser page is available for release smoke testing"
  );

const socket = new WebSocket(target.webSocketDebuggerUrl);
let sequence = 0;
const pending = new Map();
const events = [];
const call = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });

socket.addEventListener("message", event => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    message.error
      ? reject(new Error(message.error.message))
      : resolve(message.result);
    return;
  }
  if (
    [
      "Runtime.exceptionThrown",
      "Log.entryAdded",
      "Network.responseReceived",
      "Network.loadingFailed",
    ].includes(message.method)
  )
    events.push(message);
});

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const readPageState = async () => {
  const state = await call("Runtime.evaluate", {
    expression:
      "JSON.stringify({ title: document.title, rootText: document.getElementById('root')?.innerText || '', hasPublicEntry: Boolean(document.querySelector('[data-testid=public-entry]')), scrollWidth: document.documentElement.scrollWidth, viewportWidth: window.innerWidth })",
    returnByValue: true,
  });
  return JSON.parse(state.result.value);
};

await new Promise(resolve =>
  socket.addEventListener("open", resolve, { once: true })
);
await Promise.all([
  call("Runtime.enable"),
  call("Page.enable"),
  call("Log.enable"),
  call("Network.enable"),
]);

const routeResults = [];
for (const path of primaryPaths) {
  const eventStart = events.length;
  const url = new URL(path, releaseUrl).toString();
  await call("Page.navigate", { url });
  await wait(4_000);
  const page = await readPageState();
  const routeEvents = events.slice(eventStart);
  const responses = routeEvents
    .filter(event => event.method === "Network.responseReceived")
    .map(event => ({
      url: event.params.response.url,
      status: event.params.response.status,
      type: event.params.type,
    }));
  const assets = responses.filter(response =>
    ["Script", "Stylesheet", "Font", "Image"].includes(response.type)
  );
  const assetFailures = assets.filter(
    response => response.status < 200 || response.status >= 400
  );
  routeResults.push({
    path,
    page,
    assetCount: assets.length,
    assetFailures,
    passed:
      page.title === "Elegex — Business Operations Platform" &&
      page.hasPublicEntry &&
      page.rootText.includes(expectedText) &&
      assetFailures.length === 0,
  });
}

await call("Emulation.setDeviceMetricsOverride", {
  width: 375,
  height: 812,
  deviceScaleFactor: 1,
  mobile: true,
});
await call("Page.navigate", { url: new URL("/", releaseUrl).toString() });
await wait(4_000);
const mobile = await readPageState();
await call("Emulation.clearDeviceMetricsOverride");

const managedDocument = await fetch(new URL(managedDocumentPath, releaseUrl), {
  redirect: "follow",
});
const exceptions = events.filter(
  event => event.method === "Runtime.exceptionThrown"
);
const loadingFailures = events
  .filter(event => event.method === "Network.loadingFailed")
  .map(event => ({
    errorText: event.params.errorText,
    type: event.params.type,
  }));
const apiResponses = events
  .filter(
    event =>
      event.method === "Network.responseReceived" &&
      event.params.response.url.includes("/api/trpc")
  )
  .map(event => ({
    url: event.params.response.url,
    status: event.params.response.status,
  }));
const publicRoutesPassed = routeResults.every(result => result.passed);
const mobilePassed =
  mobile.hasPublicEntry &&
  mobile.rootText.includes("Continue with Manus") &&
  mobile.scrollWidth <= mobile.viewportWidth;
const managedDocumentPassed =
  managedDocument.ok && (await managedDocument.text()).includes("Synthetic");
const passed =
  publicRoutesPassed &&
  mobilePassed &&
  managedDocumentPassed &&
  exceptions.length === 0;

console.log(
  JSON.stringify(
    {
      releaseUrl,
      expectedText,
      passed,
      publicRoutesPassed,
      routeResults,
      mobile: { ...mobile, passed: mobilePassed },
      managedDocument: {
        path: managedDocumentPath,
        status: managedDocument.status,
        passed: managedDocumentPassed,
      },
      exceptionCount: exceptions.length,
      exceptions,
      loadingFailures,
      apiResponses,
      authenticatedInspectionBoundary:
        "The DevTools smoke target uses its own browser profile. Published authenticated owner-route evidence is captured separately in the connected browser and cannot be injected into this public-session trace.",
    },
    null,
    2
  )
);

socket.close();
if (!passed) process.exitCode = 1;
