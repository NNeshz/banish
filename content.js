// Observa la página. Cuando aparece un overlay/modal que coincide con
// un selector configurado, lo cierra (clic en su botón de cerrar) o lo elimina.
// Por defecto solo actúa en sitios que tú actives, para no romper páginas.

const DEFAULT_RULES = {
  // host (sin www) : { dismissSelectors:[botones de cerrar], removeSelectors:[overlays a borrar], unlockScroll:bool, generic:bool }
  // Plantilla de ejemplo. Edítala desde el popup.
  "example.com": {
    dismissSelectors: ["button[aria-label='Close']", ".modal-close"],
    removeSelectors: [".newsletter-overlay", ".paywall-backdrop"],
    unlockScroll: true
  }
};

// GENERIC_RULE, effectiveRule, isValidId, isStableClass y classListOf viven en
// lib.js (se carga antes que este script desde el manifest) para poder testearlas.

// Elementos que ya cliqueamos, para no volver a hacerlo en cada mutación.
const clicked = new WeakSet();

function hostKey() {
  return location.hostname.replace(/^www\./, "");
}

function unlockScroll() {
  document.documentElement.style.setProperty("overflow", "auto", "important");
  document.body.style.setProperty("overflow", "auto", "important");
}

function runRule(rule) {
  if (!rule) return 0;
  let count = 0;
  (rule.dismissSelectors || []).forEach((sel) => {
    let nodes;
    try { nodes = document.querySelectorAll(sel); }
    catch (e) { return; } // selector inválido: lo ignoramos sin romper el resto
    nodes.forEach((el) => {
      if (clicked.has(el)) return;
      clicked.add(el);
      try { el.click(); count++; } catch (e) {}
    });
  });
  (rule.removeSelectors || []).forEach((sel) => {
    let nodes;
    try { nodes = document.querySelectorAll(sel); }
    catch (e) { return; }
    nodes.forEach((el) => { el.remove(); count++; });
  });
  if (rule.unlockScroll) unlockScroll();
  return count;
}

let observer = null;
let stopTimer = null;
let debounceTimer = null;

function stop() {
  if (observer) { observer.disconnect(); observer = null; }
  if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; }
  if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
}

function startFor(rule) {
  stop();
  runRule(rule);

  // Muchos popups aparecen segundos después; observamos cambios.
  // Debounce para no re-ejecutar en cada mutación (y para no auto-dispararnos
  // al eliminar nodos nosotros mismos).
  observer = new MutationObserver(() => {
    if (debounceTimer) return;
    debounceTimer = setTimeout(() => { debounceTimer = null; runRule(rule); }, 150);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // Cortamos el observer tras 20s para no gastar recursos.
  stopTimer = setTimeout(() => {
    if (observer) { observer.disconnect(); observer = null; }
  }, 20000);
}

function load() {
  chrome.storage.sync.get(
    { rules: DEFAULT_RULES, enabled: {}, globalEnabled: true },
    (data) => {
      const host = hostKey();
      // Solo actuamos si la extensión está activa globalmente y este host habilitado.
      if (!data.globalEnabled || !data.enabled[host]) { stop(); return; }
      const rule = effectiveRule(data.rules[host]);
      if (!rule) { stop(); return; }
      startFor(rule);
    }
  );
}

load();

// Aplica los cambios al instante cuando guardas en el popup: sin recargar.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  if (changes.rules || changes.enabled || changes.globalEnabled) load();
});

// ---------------------------------------------------------------------------
// Element picker: el usuario elige un elemento con un clic en vez de escribir
// CSS. El popup manda START_PICK; aquí resaltamos lo que hay bajo el cursor,
// generamos un selector estable y lo guardamos en la regla del sitio.
// (isValidId, isStableClass y classListOf vienen de lib.js.)
// ---------------------------------------------------------------------------

// generateSelector y previewSelector viven en selector.js (cargado antes que
// este script desde el manifest), para poder testearlos con jsdom.

let toastTimer = null;
function toast(msg) {
  let t = document.getElementById("__banish_toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "__banish_toast";
    Object.assign(t.style, {
      position: "fixed", zIndex: 2147483647, bottom: "16px", left: "50%",
      transform: "translateX(-50%)", background: "#1a1a1a", color: "#fff",
      font: "13px system-ui, sans-serif", padding: "8px 14px", borderRadius: "8px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.3)", maxWidth: "80vw", pointerEvents: "none"
    });
    document.documentElement.appendChild(t);
  }
  t.textContent = msg;
  t.style.display = "block";
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.style.display = "none"; }, 2600);
}

let pickState = null;

function startPick(mode) {
  if (pickState) stopPick();

  const box = document.createElement("div");
  Object.assign(box.style, {
    position: "fixed", zIndex: 2147483647, pointerEvents: "none", display: "none",
    border: "2px solid #2b6cf6", background: "rgba(43,108,246,0.12)",
    borderRadius: "3px", transition: "all 40ms ease"
  });
  const label = document.createElement("div");
  Object.assign(label.style, {
    position: "fixed", zIndex: 2147483647, pointerEvents: "none", display: "none",
    background: "#1a1a1a", color: "#fff", font: "12px system-ui, sans-serif",
    padding: "3px 7px", borderRadius: "6px", maxWidth: "80vw",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
  });
  const hint = document.createElement("div");
  hint.textContent = mode === "remove"
    ? "Clic en el OVERLAY a eliminar  ·  Esc para cancelar"
    : "Clic en el BOTÓN de cerrar  ·  Esc para cancelar";
  Object.assign(hint.style, {
    position: "fixed", zIndex: 2147483647, pointerEvents: "none", top: "12px",
    left: "50%", transform: "translateX(-50%)", background: "#2b6cf6", color: "#fff",
    font: "600 12px system-ui, sans-serif", padding: "6px 12px", borderRadius: "999px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.25)"
  });
  document.documentElement.append(box, label, hint);

  let current = null;
  const onMove = (e) => {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === box || el === label || el === hint) return;
    current = el;
    const r = el.getBoundingClientRect();
    Object.assign(box.style, {
      display: "block", left: r.left + "px", top: r.top + "px",
      width: r.width + "px", height: r.height + "px"
    });
    label.textContent = previewSelector(el);
    label.style.display = "block";
    label.style.left = Math.max(4, r.left) + "px";
    label.style.top = (r.top > 26 ? r.top - 24 : r.bottom + 4) + "px";
  };
  const onClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const el = current || document.elementFromPoint(e.clientX, e.clientY);
    stopPick();
    if (el) commitPick(mode, el);
  };
  const onKey = (e) => {
    if (e.key === "Escape") { stopPick(); toast("Selección cancelada"); }
  };

  window.addEventListener("mousemove", onMove, true);
  window.addEventListener("click", onClick, true);
  window.addEventListener("keydown", onKey, true);
  pickState = { box, label, hint, onMove, onClick, onKey };
}

function stopPick() {
  if (!pickState) return;
  window.removeEventListener("mousemove", pickState.onMove, true);
  window.removeEventListener("click", pickState.onClick, true);
  window.removeEventListener("keydown", pickState.onKey, true);
  pickState.box.remove();
  pickState.label.remove();
  pickState.hint.remove();
  pickState = null;
}

function commitPick(mode, el) {
  const sel = generateSelector(el);
  if (!sel) { toast("No pude generar un selector para eso"); return; }
  const host = hostKey();
  chrome.storage.sync.get({ rules: {}, enabled: {} }, (data) => {
    const rule = data.rules[host] || { dismissSelectors: [], removeSelectors: [], unlockScroll: false };
    const key = mode === "remove" ? "removeSelectors" : "dismissSelectors";
    rule[key] = rule[key] || [];
    if (!rule[key].includes(sel)) rule[key].push(sel);
    if (mode === "remove") rule.unlockScroll = true; // al quitar el overlay, recuperamos scroll
    data.rules[host] = rule;
    data.enabled[host] = true;
    chrome.storage.sync.set({ rules: data.rules, enabled: data.enabled }, () => {
      toast("✓ Añadido: " + sel);
      // storage.onChanged dispara load() y aplica la regla al instante.
    });
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "START_PICK") {
    startPick(msg.mode === "remove" ? "remove" : "dismiss");
    sendResponse({ ok: true });
  }
  return true;
});
