// Funciones puras (sin DOM ni chrome.*) compartidas por content.js, popup.js y
// los tests de node:test. Se carga como primer content script y antes de
// popup.js; en Node se exporta con module.exports.
const Lib = (() => {
  // "Modo genérico": lista amplia de selectores que cierran cookie banners,
  // modales de newsletter y paywalls en la mayoría de sitios SIN configurar nada
  // (pensado para usuarios no técnicos: activan el toggle y listo). Los de
  // "dismiss" reciben clic (seguro: si no es un popup no suele pasar nada); los
  // de "remove" se eliminan (más agresivo, por eso son patrones muy específicos
  // de overlays de popup). Es opt-in por sitio, así que ante un falso positivo
  // basta con desactivarlo. Cada selector se valida en runRule con try/catch.
  const GENERIC_RULE = {
    dismissSelectors: [
      // --- Frameworks de consentimiento de cookies (aceptar / cerrar) ---
      "#onetrust-accept-btn-handler",            // OneTrust
      ".onetrust-close-btn-handler",
      "#accept-recommended-btn-handler",
      "#CybotCookiebotDialogBodyButtonAccept",   // Cookiebot
      "#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll",
      "#CybotCookiebotDialogBodyButtonDecline",
      "#truste-consent-button",                  // TrustArc
      ".truste-button2",
      "#didomi-notice-agree-button",             // Didomi
      ".didomi-continue-without-agreeing",
      "[data-testid='uc-accept-all-button']",    // Usercentrics
      "[data-testid='uc-deny-all-button']",
      ".cky-btn-accept",                         // CookieYes
      "[data-cky-tag='accept-button']",
      ".osano-cm-accept-all", ".osano-cm-accept", // Osano
      ".cmplz-accept",                           // Complianz
      "#cn-accept-cookie",                       // Cookie Notice (WP)
      "#cookie_action_close_header",             // GDPR Cookie Consent (WP)
      ".cli-plugin-main-button", ".wt-cli-accept-all-btn",
      "._brlbs-btn-accept-all",                  // Borlabs
      ".iubenda-cs-accept-btn", ".iubenda-cs-close-btn", // Iubenda
      ".cm-btn-success",                         // Klaro
      "#tarteaucitronAllAllowed", ".tarteaucitronAllow", // tarteaucitron
      "#ccc-notify-accept", ".ccc-accept-button", // Civic
      ".cc-dismiss", ".cc-allow", ".cc-btn",     // Cookie Consent (Insites/Osano)
      ".fc-cta-consent",                         // Google Funding Choices
      ".qc-cmp2-summary-buttons button[mode='primary']", // Quantcast
      "button[aria-label*='accept all' i]",
      "button[aria-label*='aceptar' i]",
      "button[aria-label*='accept' i][aria-label*='cookie' i]",

      // --- Botones de cerrar por etiqueta accesible (multi-idioma) ---
      "button[aria-label*='close' i]",   "a[aria-label*='close' i]",   "[role='button'][aria-label*='close' i]",
      "button[aria-label*='cerrar' i]",  "[role='button'][aria-label*='cerrar' i]",
      "button[aria-label*='dismiss' i]", "[role='button'][aria-label*='dismiss' i]",
      "button[aria-label*='fermer' i]",      // FR
      "button[aria-label*='schließen' i]",   // DE
      "button[aria-label*='chiudi' i]",      // IT
      "button[aria-label*='fechar' i]",      // PT
      "button[aria-label*='sluiten' i]",     // NL
      "button[aria-label*='zamknij' i]",     // PL
      "button[aria-label*='закрыть' i]",     // RU
      "button[title*='close' i]", "button[title*='cerrar' i]",

      // --- Clases de cierre muy habituales ---
      ".modal-close", ".modal__close", ".modal-close-button", ".close-modal",
      ".close-button", ".close-btn", ".btn-close", ".close-icon", ".icon-close",
      ".popup-close", ".popup__close", ".popup-closer", ".dialog-close",
      ".lightbox-close", ".overlay-close", ".js-close", ".js-modal-close", ".close",

      // --- Plugins de popup / lightbox conocidos ---
      ".mfp-close",                 // Magnific Popup
      ".fancybox-close", ".fancybox-close-small", // Fancybox
      ".pum-close", ".popmake-close",             // Popup Maker
      ".sqs-popup-overlay-close",   // Squarespace
      ".mc-closeModal",             // Mailchimp
      ".privy-close", ".privy-x-button",          // Privy
      ".om-close",                  // OptinMonster
      ".sumome-react-wysiwyg-popup-close",        // Sumo
      ".klaviyo-close-form",        // Klaviyo

      // --- Atributos de cierre ---
      "[data-dismiss='modal']", "[data-bs-dismiss='modal']", "[data-close]",
      "[data-modal-close]", "[data-micromodal-close]", "[data-fancybox-close]",
      "[data-role='close']"
    ],
    removeSelectors: [
      // Solo patrones inequívocos de overlay de popup (eliminar es agresivo).
      ".newsletter-overlay", ".newsletter-modal", ".newsletter-popup",
      ".subscribe-overlay", ".signup-overlay",
      ".paywall-backdrop", ".paywall-overlay",
      ".pum-overlay", ".popmake-overlay",         // Popup Maker
      ".mfp-bg",                                  // Magnific Popup
      ".fancybox-overlay",                        // Fancybox
      ".sqs-popup-overlay",                       // Squarespace
      ".privy-popup", ".om-holder",               // Privy / OptinMonster
      ".modal-backdrop",                          // Bootstrap (queda con scroll bloqueado)
      "[class*='newsletter' i][class*='overlay' i]",
      "[class*='paywall' i][class*='overlay' i]",
      "[class*='subscribe' i][class*='modal' i]"
    ],
    unlockScroll: true
  };

  // Identificador CSS seguro (sin espacios, no empieza por dígito).
  function isValidId(id) {
    return !!id && /^[A-Za-z_][\w-]*$/.test(id);
  }

  // Clases que parecen autogeneradas (CSS-in-JS, hashes): las evitamos porque
  // cambian entre recargas y no sirven como selector estable.
  function isStableClass(c) {
    if (!c || c.length > 30) return false;
    if (/^(css|sc|jsx|emotion|styled)-/i.test(c)) return false; // styled-components / emotion
    if (/\d{4,}/.test(c)) return false;                          // muchos dígitos seguidos
    if (/^[a-z0-9]{6,}$/i.test(c) && /\d/.test(c) && /[a-z]/i.test(c)) return false; // hash css-1q2w3e
    return true;
  }

  function classListOf(el) {
    return (el && el.className && typeof el.className === "string")
      ? el.className.trim().split(/\s+/).filter(Boolean)
      : [];
  }

  // Combina la regla del sitio con la genérica si está activada.
  function effectiveRule(rule) {
    if (!rule) return null;
    if (!rule.generic) return rule;
    return {
      dismissSelectors: [...GENERIC_RULE.dismissSelectors, ...(rule.dismissSelectors || [])],
      removeSelectors: [...GENERIC_RULE.removeSelectors, ...(rule.removeSelectors || [])],
      unlockScroll: true
    };
  }

  function linesToArr(text) {
    return String(text == null ? "" : text).split("\n").map((s) => s.trim()).filter(Boolean);
  }

  function hostKeyFromUrl(url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); }
    catch (e) { return null; }
  }

  return { GENERIC_RULE, isValidId, isStableClass, classListOf, effectiveRule, linesToArr, hostKeyFromUrl };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Lib; // Node / tests
if (typeof self !== "undefined") Object.assign(self, Lib);                 // content script / popup
