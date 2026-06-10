// Generación de selectores CSS a partir de un elemento (usado por el picker).
// Toca el DOM (document, CSS), así que se aísla aquí para poder testearlo con
// jsdom en Node. En el navegador se carga tras lib.js; en Node hace require.
const Selector = (() => {
  // Funciones puras: en Node vienen de lib.js; en navegador, de los globals
  // que lib.js dejó con Object.assign(self, ...).
  const L = (typeof module !== "undefined" && module.exports) ? require("./lib.js") : self;
  const isValidId = L.isValidId, isStableClass = L.isStableClass, classListOf = L.classListOf;

  const GOOD_ATTRS = ["aria-label", "data-testid", "data-test", "data-qa", "data-cy", "name", "title", "alt", "role"];

  function attrSelector(el) {
    const tag = el.tagName.toLowerCase();
    for (const a of GOOD_ATTRS) {
      const v = el.getAttribute(a);
      if (v && v.length <= 40 && !/["\\]/.test(v)) {
        const sel = `${tag}[${a}="${v}"]`;
        try { if (document.querySelector(sel)) return sel; } catch (e) {}
      }
    }
    return null;
  }

  function classSelector(el) {
    const tag = el.tagName.toLowerCase();
    const classes = classListOf(el).filter(isStableClass).slice(0, 2);
    if (!classes.length) return null;
    const sel = tag + classes.map((c) => "." + CSS.escape(c)).join("");
    try { if (document.querySelector(sel)) return sel; } catch (e) {}
    return null;
  }

  function nthPath(el) {
    // Fallback robusto: camino con :nth-of-type hasta encontrar un id o body.
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && node !== document.body && parts.length < 6) {
      if (isValidId(node.id)) { parts.unshift("#" + node.id); break; }
      let part = node.tagName.toLowerCase();
      const parent = node.parentElement;
      if (parent) {
        const sameTag = Array.from(parent.children).filter((c) => c.tagName === node.tagName);
        if (sameTag.length > 1) part += `:nth-of-type(${sameTag.indexOf(node) + 1})`;
      }
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(" > ");
  }

  function generateSelector(el) {
    if (isValidId(el.id)) {
      const sel = "#" + el.id;
      try { if (document.querySelectorAll(sel).length === 1) return sel; } catch (e) {}
    }
    return attrSelector(el) || classSelector(el) || nthPath(el);
  }

  function previewSelector(el) {
    // Versión corta solo para la etiqueta que sigue al cursor.
    let s = el.tagName.toLowerCase();
    if (isValidId(el.id)) return s + "#" + el.id;
    const c = classListOf(el).filter(isStableClass)[0];
    return c ? s + "." + c : s;
  }

  return { GOOD_ATTRS, attrSelector, classSelector, nthPath, generateSelector, previewSelector };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Selector; // Node / tests
if (typeof self !== "undefined") Object.assign(self, Selector);                 // content script
