// hostKeyFromUrl y linesToArr vienen de lib.js (cargado antes en popup.html).
const $ = (id) => document.getElementById(id);

let currentHost = null;

// Lee storage y pinta todo: toggle global, campos del sitio actual y lista.
function refresh() {
  chrome.storage.sync.get({ rules: {}, enabled: {}, globalEnabled: true }, (data) => {
    $("globalEnabled").checked = !!data.globalEnabled;
    $("siteSection").classList.toggle("section-disabled", !data.globalEnabled);

    if (currentHost) {
      const rule = data.rules[currentHost] || {};
      $("enabled").checked = !!data.enabled[currentHost];
      $("generic").checked = !!rule.generic;
      $("dismiss").value = (rule.dismissSelectors || []).join("\n");
      $("remove").value = (rule.removeSelectors || []).join("\n");
      $("unlockScroll").checked = !!rule.unlockScroll;
    }

    renderSites(data);
  });
}

function renderSites(data) {
  const ul = $("siteList");
  ul.innerHTML = "";
  const hosts = Object.keys(data.enabled).filter((h) => data.enabled[h]).sort();
  if (!hosts.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "Ningún sitio activo todavía.";
    ul.appendChild(li);
    return;
  }
  hosts.forEach((h) => {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = h + (data.rules[h] && data.rules[h].generic ? " · genérico" : "");
    span.title = h;
    const btn = document.createElement("button");
    btn.className = "rm";
    btn.textContent = "✕";
    btn.title = "Quitar de la lista";
    btn.addEventListener("click", () => removeSite(h));
    li.append(span, btn);
    ul.appendChild(li);
  });
}

function removeSite(host) {
  chrome.storage.sync.get({ rules: {}, enabled: {} }, (data) => {
    delete data.enabled[host];
    delete data.rules[host];
    chrome.storage.sync.set({ rules: data.rules, enabled: data.enabled }, refresh);
  });
}

(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentHost = hostKeyFromUrl(tab && tab.url);
  $("host").textContent = currentHost || "(sitio no válido)";
  if (!currentHost) {
    $("save").disabled = true;
    $("pickDismiss").disabled = true;
    $("pickRemove").disabled = true;
  }
  refresh();
})();

// Inicia el modo "elegir elemento": avisa al content script y cierra el popup
// para que el usuario pueda interactuar con la página.
function startPicker(mode) {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab || !tab.id) return;
    chrome.tabs.sendMessage(tab.id, { type: "START_PICK", mode }, () => {
      if (chrome.runtime.lastError) {
        $("status").style.color = "#c5221f";
        $("status").textContent = "No disponible aquí (recarga la página).";
        setTimeout(() => {
          $("status").textContent = "";
          $("status").style.color = "#137333";
        }, 3000);
        return;
      }
      window.close();
    });
  });
}

$("pickDismiss").addEventListener("click", () => startPicker("dismiss"));
$("pickRemove").addEventListener("click", () => startPicker("remove"));

// El toggle global se guarda al instante (sin botón Guardar).
$("globalEnabled").addEventListener("change", () => {
  chrome.storage.sync.set({ globalEnabled: $("globalEnabled").checked }, refresh);
});

$("save").addEventListener("click", () => {
  if (!currentHost) return;
  chrome.storage.sync.get({ rules: {}, enabled: {} }, (data) => {
    data.rules[currentHost] = {
      dismissSelectors: linesToArr($("dismiss").value),
      removeSelectors: linesToArr($("remove").value),
      unlockScroll: $("unlockScroll").checked,
      generic: $("generic").checked
    };
    data.enabled[currentHost] = $("enabled").checked;
    chrome.storage.sync.set({ rules: data.rules, enabled: data.enabled }, () => {
      $("status").textContent = "✓ Guardado y aplicado.";
      setTimeout(() => ($("status").textContent = ""), 2500);
      renderSites(data);
    });
  });
});
