const targets = await fetch("http://127.0.0.1:9222/json/list").then(response => response.json());
const target = targets.find(item => item.type === "page");
if (!target?.webSocketDebuggerUrl) throw new Error("No debuggable preview page is available.");

const socket = new WebSocket(target.webSocketDebuggerUrl);
let sequence = 0;
const pending = new Map();
const call = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});
socket.addEventListener("message", event => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  message.error ? reject(new Error(message.error.message)) : resolve(message.result);
});
await new Promise(resolve => socket.addEventListener("open", resolve, { once: true }));
await call("Runtime.enable");
const result = await call("Runtime.evaluate", {
  expression: "JSON.stringify({ url: location.href, title: document.title, hasPublicEntry: Boolean(document.querySelector('[data-testid=public-entry]')), text: document.getElementById('root')?.innerText?.slice(0, 1200) || '' })",
  returnByValue: true,
});
console.log(result.result.value);
socket.close();
