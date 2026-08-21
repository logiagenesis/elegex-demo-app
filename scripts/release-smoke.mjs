const releaseUrl = process.env.ELEGEX_RELEASE_URL || "https://elegexapp-jvc9dhln.manus.space/";
const targets = await fetch("http://127.0.0.1:9222/json/list").then(response => response.json());
const target = targets.find(item => item.type === "page");
if (!target?.webSocketDebuggerUrl) throw new Error("No debuggable browser page is available for release smoke testing");

const socket = new WebSocket(target.webSocketDebuggerUrl);
let sequence = 0;
const pending = new Map();
const events = [];
const call = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});

socket.addEventListener("message", event => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    message.error ? reject(new Error(message.error.message)) : resolve(message.result);
    return;
  }
  if (["Runtime.exceptionThrown", "Log.entryAdded"].includes(message.method)) events.push(message);
});

await new Promise(resolve => socket.addEventListener("open", resolve, { once: true }));
await Promise.all([call("Runtime.enable"), call("Page.enable"), call("Log.enable")]);
await call("Page.navigate", { url: releaseUrl });
await new Promise(resolve => setTimeout(resolve, 7_000));
const state = await call("Runtime.evaluate", {
  expression: "JSON.stringify({ title: document.title, rootText: document.getElementById('root')?.innerText || '', hasPublicEntry: Boolean(document.querySelector('[data-testid=public-entry]')) })",
  returnByValue: true,
});

const page = JSON.parse(state.result.value);
const exceptions = events.filter(event => event.method === "Runtime.exceptionThrown");
const passed = page.title === "Elegex — Business Operations Platform" && page.rootText.includes("Every job, visible from booking to invoice.") && exceptions.length === 0;
console.log(JSON.stringify({ releaseUrl, passed, page, exceptionCount: exceptions.length, exceptions }, null, 2));
socket.close();
if (!passed) process.exitCode = 1;
