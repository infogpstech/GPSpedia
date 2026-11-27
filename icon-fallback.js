/* Activa símbolos locales solo si la hoja o las fuentes Font Awesome no están disponibles. */
(() => {
  'use strict';
  const root = document.documentElement;
  const activateFallback = () => root.classList.add('gp-icons-fallback');
  const iconStylesheet = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .find(link => /cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome\/6\.4\.0\/css\/all\.min\.css/.test(link.href));
  if (!iconStylesheet || !iconStylesheet.sheet) activateFallback();
  if (!document.fonts || typeof document.fonts.load !== 'function') {
    activateFallback();
    return;
  }
  Promise.all([
    document.fonts.load('900 16px "Font Awesome 6 Free"', '\uf007'),
    document.fonts.load('400 16px "Font Awesome 6 Free"', '\uf007'),
    document.fonts.load('400 16px "Font Awesome 6 Brands"', '\uf2b9')
  ]).then(results => {
    if (results.some(fonts => !fonts || fonts.length === 0)) activateFallback();
  }).catch(activateFallback);
})();
