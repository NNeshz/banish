// Tests de la lógica pura (node:test, sin dependencias).
//   node --test
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  GENERIC_RULE, isValidId, isStableClass, classListOf, effectiveRule, linesToArr, hostKeyFromUrl
} = require("../lib.js");

test("isValidId: acepta identificadores CSS válidos", () => {
  assert.ok(isValidId("onetrust-accept-btn-handler"));
  assert.ok(isValidId("_modal"));
  assert.ok(isValidId("a1-b2"));
});

test("isValidId: rechaza inválidos", () => {
  assert.equal(isValidId("1modal"), false);   // empieza por dígito
  assert.equal(isValidId("has space"), false); // espacio
  assert.equal(isValidId(""), false);
  assert.equal(isValidId(null), false);
  assert.equal(isValidId(undefined), false);
});

test("isStableClass: acepta clases legibles", () => {
  assert.ok(isStableClass("newsletter-overlay"));
  assert.ok(isStableClass("modal-close"));
  assert.ok(isStableClass("btn"));
});

test("isStableClass: rechaza autogeneradas/hashes/largas", () => {
  assert.equal(isStableClass("css-1q2w3e"), false);  // CSS-in-JS
  assert.equal(isStableClass("sc-AxjAm"), false);     // styled-components
  assert.equal(isStableClass("emotion-12"), false);
  assert.equal(isStableClass("col-12345"), false);    // muchos dígitos
  assert.equal(isStableClass("a1b2c3"), false);       // hash alfanumérico
  assert.equal(isStableClass("x".repeat(31)), false); // demasiado larga
  assert.equal(isStableClass(""), false);
});

test("classListOf: divide className en clases", () => {
  assert.deepEqual(classListOf({ className: "a  b c" }), ["a", "b", "c"]);
  assert.deepEqual(classListOf({ className: "  solo " }), ["solo"]);
});

test("classListOf: tolera ausencia o tipos raros (p.ej. SVGAnimatedString)", () => {
  assert.deepEqual(classListOf({}), []);
  assert.deepEqual(classListOf({ className: 123 }), []);
  assert.deepEqual(classListOf(null), []);
});

test("effectiveRule: null entra, null sale", () => {
  assert.equal(effectiveRule(null), null);
});

test("effectiveRule: sin generic devuelve la misma regla", () => {
  const rule = { dismissSelectors: [".x"], removeSelectors: [], unlockScroll: false };
  assert.equal(effectiveRule(rule), rule);
});

test("effectiveRule: con generic fusiona genérico + custom y fuerza unlockScroll", () => {
  const rule = { generic: true, dismissSelectors: [".mi-boton"], removeSelectors: [".mi-overlay"] };
  const eff = effectiveRule(rule);
  assert.ok(eff.dismissSelectors.includes("#onetrust-accept-btn-handler")); // del genérico
  assert.ok(eff.dismissSelectors.includes(".mi-boton"));                    // del custom
  assert.ok(eff.removeSelectors.includes(".paywall-backdrop"));
  assert.ok(eff.removeSelectors.includes(".mi-overlay"));
  assert.equal(eff.unlockScroll, true);
});

test("effectiveRule: con generic y sin custom no rompe", () => {
  const eff = effectiveRule({ generic: true });
  assert.deepEqual(eff.dismissSelectors, GENERIC_RULE.dismissSelectors);
  assert.deepEqual(eff.removeSelectors, GENERIC_RULE.removeSelectors);
});

test("linesToArr: divide, recorta y descarta vacías", () => {
  assert.deepEqual(linesToArr("a\n b \n\n  \nc"), ["a", "b", "c"]);
  assert.deepEqual(linesToArr(""), []);
  assert.deepEqual(linesToArr(null), []);
  assert.deepEqual(linesToArr(undefined), []);
});

test("hostKeyFromUrl: quita www y extrae el host", () => {
  assert.equal(hostKeyFromUrl("https://www.example.com/path?q=1"), "example.com");
  assert.equal(hostKeyFromUrl("https://sub.example.com"), "sub.example.com");
  assert.equal(hostKeyFromUrl("http://localhost:8765/popups.html"), "localhost");
});

test("hostKeyFromUrl: URL inválida devuelve null", () => {
  assert.equal(hostKeyFromUrl("no es una url"), null);
  assert.equal(hostKeyFromUrl(""), null);
});
