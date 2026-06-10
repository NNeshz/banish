// Tests B: generateSelector y compañía de punta a punta sobre DOM real (jsdom).
//   node --test
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");

// selector.js lee `document` y `CSS` como globals (igual que en el navegador):
// los inyectamos desde jsdom antes de cada caso.
function build(bodyHtml) {
  const dom = new JSDOM(`<!DOCTYPE html><html><body>${bodyHtml}</body></html>`);
  global.document = dom.window.document;
  global.CSS = (dom.window.CSS && dom.window.CSS.escape)
    ? dom.window.CSS
    : { escape: (s) => String(s).replace(/[^a-zA-Z0-9_-]/g, (c) => "\\" + c) };
  return dom.window.document;
}

const { generateSelector, previewSelector, attrSelector, classSelector, nthPath } = require("../selector.js");

test("usa #id cuando es válido y único", () => {
  const doc = build('<div id="popup">x</div>');
  assert.equal(generateSelector(doc.getElementById("popup")), "#popup");
});

test("id inválido (empieza por dígito) cae a atributo accesible", () => {
  const doc = build('<button id="1modal" aria-label="Close">x</button>');
  assert.equal(generateSelector(doc.querySelector("button")), 'button[aria-label="Close"]');
});

test("prefiere aria-label sobre la clase", () => {
  const doc = build('<button class="newsletter-overlay" aria-label="Cerrar">x</button>');
  assert.equal(generateSelector(doc.querySelector("button")), 'button[aria-label="Cerrar"]');
});

test("usa data-testid", () => {
  const doc = build('<button data-testid="close-x">x</button>');
  assert.equal(generateSelector(doc.querySelector("button")), 'button[data-testid="close-x"]');
});

test("usa clase estable y descarta la autogenerada", () => {
  const doc = build('<div class="css-1ab2c3 newsletter-overlay">x</div>');
  assert.equal(generateSelector(doc.querySelector("div")), "div.newsletter-overlay");
});

test("ignora atributos demasiado largos y cae a nth-of-type (round-trip)", () => {
  const doc = build('<div><span title="' + "x".repeat(60) + '">a</span><span>b</span></div>');
  const first = doc.querySelectorAll("span")[0];
  const sel = generateSelector(first);
  assert.equal(doc.querySelector(sel), first);
});

test("fallback nth-of-type distingue hermanos solo con clases autogeneradas", () => {
  const doc = build('<section><div class="sc-AbCd"></div><div class="sc-XyZw"></div></section>');
  const second = doc.querySelectorAll("section > div")[1];
  const sel = generateSelector(second);
  assert.match(sel, /nth-of-type\(2\)/);
  assert.equal(doc.querySelector(sel), second);
});

test("round-trip sobre HTML tipo popup real (newsletter + paywall)", () => {
  const doc = build(`
    <div class="newsletter-overlay">
      <div class="newsletter-dialog">
        <button class="modal-close" aria-label="Close">&times;</button>
      </div>
    </div>
    <div class="paywall-backdrop"><button>Iniciar sesión</button></div>
  `);
  const targets = doc.querySelectorAll("button, .newsletter-overlay, .paywall-backdrop");
  for (const el of targets) {
    const sel = generateSelector(el);
    assert.equal(doc.querySelector(sel), el, "debe re-seleccionar el elemento: " + sel);
  }
});

test("previewSelector: id / clase estable / solo etiqueta", () => {
  let doc = build('<div id="x"></div>');
  assert.equal(previewSelector(doc.querySelector("div")), "div#x");
  doc = build('<div class="modal-close css-1a2b3c"></div>');
  assert.equal(previewSelector(doc.querySelector("div")), "div.modal-close");
  doc = build('<span></span>');
  assert.equal(previewSelector(doc.querySelector("span")), "span");
});

test("attrSelector / classSelector devuelven null cuando no aplican", () => {
  const doc = build('<div class="css-1q2w3e"></div>');
  const el = doc.querySelector("div");
  assert.equal(attrSelector(el), null);   // sin atributos buenos
  assert.equal(classSelector(el), null);  // solo clase autogenerada
  assert.match(nthPath(el), /div/);       // pero nthPath siempre da algo
});
