// Overprint content script. Injected on demand by the popup (activeTab + scripting).
// Lets the user pick an element on the page and replaces it with a creative.
if (typeof window.__overprintInitialized === 'undefined') {
  window.__overprintInitialized = true;

  const AD_SELECTORS = [
    'iframe[src*="doubleclick.net"]',
    'iframe[src*="googlesyndication.com"]',
    'iframe[src*="amazon-adsystem.com"]',
    'iframe[id^="google_ads_iframe"]',
    'ins.adsbygoogle',
    '[id^="div-gpt-ad"]',
    '[id*="google_ads"]',
    '[id*="taboola"]',
    '[id*="outbrain"]',
    '.teads-inread',
    '[data-ad-slot]',
    '[data-ad-unit]',
    '[class*="ad-slot"]',
    '[class*="ad_slot"]',
    '[class*="advertisement"]',
    '[class*="ad-container"]',
    '[class*="ad-wrapper"]'
  ].join(', ');

  const CONTAINER_ATTR = 'data-overprint-container';
  const HIGHLIGHT_COLOR = '#e6195f';
  const PROTECTED_TAGS = ['BODY', 'MAIN', 'ARTICLE', 'SECTION', 'HTML', 'HEADER', 'FOOTER', 'ASIDE', 'NAV'];
  const IGNORED_CHILD_TAGS = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'];

  let isSelecting = false;
  let hovered = null; // { el, outline, outlineOffset }
  let pending = null; // { creative, options }
  let observer = null;
  const swaps = []; // stack, most recent last

  // ---------- Undo (Ctrl/Cmd+Z) ----------
  function isEditable(target) {
    return !!target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
  }

  document.addEventListener('keydown', (e) => {
    if (isSelecting && e.key === 'Escape') {
      cancelSelection();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
      if (isEditable(e.target) || swaps.length === 0) return;
      e.preventDefault();
      undoLastSwap();
    }
  }, true);

  function undoLastSwap() {
    const swap = swaps.pop();
    if (!swap) return;
    if (swap.container.isConnected) swap.container.replaceWith(swap.target);
    swap.hidden.forEach(restoreElement);
    if (swaps.length === 0 && observer) {
      observer.disconnect();
      observer = null;
    }
  }

  function restoreElement(rec) {
    if (rec.display) rec.el.style.setProperty('display', rec.display, rec.priority);
    else rec.el.style.removeProperty('display');
  }

  // ---------- Messaging ----------
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.command === 'PING') {
      sendResponse({ status: 'alive' });
      return;
    }
    if (request.command === 'START_SELECTION') {
      if (!request.creative) {
        sendResponse({ status: 'error', message: 'No creative provided.' });
        return;
      }
      pending = { creative: request.creative, options: request.options || {} };
      enableSelection();
      sendResponse({ status: 'success' });
    }
  });

  // ---------- Element selection ----------
  function enableSelection() {
    if (isSelecting) return;
    isSelecting = true;
    document.body.style.cursor = 'crosshair';

    const style = document.createElement('style');
    style.id = 'overprint-pointer-lock';
    style.textContent = `
      body.overprint-selecting iframe,
      body.overprint-selecting object,
      body.overprint-selecting embed { pointer-events: none !important; }
    `;
    document.head.appendChild(style);
    document.body.classList.add('overprint-selecting');

    document.addEventListener('mouseover', onMouseOver, true);
    document.addEventListener('mouseout', onMouseOut, true);
    document.addEventListener('click', onClick, true);
  }

  function disableSelection() {
    isSelecting = false;
    document.body.style.cursor = '';
    document.body.classList.remove('overprint-selecting');
    const style = document.getElementById('overprint-pointer-lock');
    if (style) style.remove();
    document.removeEventListener('mouseover', onMouseOver, true);
    document.removeEventListener('mouseout', onMouseOut, true);
    document.removeEventListener('click', onClick, true);
  }

  function clearHighlight() {
    if (!hovered) return;
    hovered.el.style.outline = hovered.outline;
    hovered.el.style.outlineOffset = hovered.outlineOffset;
    hovered = null;
  }

  function cancelSelection() {
    clearHighlight();
    disableSelection();
    pending = null;
  }

  function onMouseOver(e) {
    if (!isSelecting) return;
    e.stopPropagation();
    clearHighlight();
    const el = e.target;
    hovered = { el, outline: el.style.outline, outlineOffset: el.style.outlineOffset };
    el.style.outline = `4px dashed ${HIGHLIGHT_COLOR}`;
    el.style.outlineOffset = '-4px';
  }

  function onMouseOut(e) {
    if (!isSelecting) return;
    e.stopPropagation();
    clearHighlight();
  }

  function onClick(e) {
    if (!isSelecting) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const target = hovered ? hovered.el : e.target;
    clearHighlight();
    disableSelection();

    const job = pending;
    pending = null;
    if (target && job) swapElement(target, job.creative, job.options);
  }

  // ---------- Replacement ----------
  function swapElement(target, creative, options) {
    if (target.closest(`[${CONTAINER_ATTR}]`)) return; // don't swap our own mockup

    const container = buildContainer(creative);
    const swap = { target, container, hidden: [] };
    swaps.push(swap);

    target.replaceWith(container);

    if (options.hideOtherAds) {
      document.querySelectorAll(AD_SELECTORS).forEach(hideAd);
      startObserver();
    }
  }

  function buildContainer(creative) {
    const box = document.createElement('div');
    box.setAttribute(CONTAINER_ATTR, 'true');
    const set = (prop, value) => box.style.setProperty(prop, value, 'important');
    set('display', 'flex');
    set('justify-content', 'center');
    set('align-items', 'center');
    set('width', creative.width);
    set('height', creative.height);
    set('max-width', '100%');
    set('margin', 'auto');
    set('align-self', 'center');
    set('justify-self', 'center');
    set('z-index', '999999');
    set('position', 'relative');
    set('overflow', 'hidden');

    const img = document.createElement('img');
    img.src = creative.data;
    img.style.setProperty('width', '100%', 'important');
    img.style.setProperty('height', '100%', 'important');
    img.style.setProperty('object-fit', 'contain', 'important');
    box.appendChild(img);
    return box;
  }

  // ---------- Hiding other ads (optional, reversible) ----------
  function currentSwap() {
    return swaps[swaps.length - 1];
  }

  function hideElement(el, swap) {
    swap.hidden.push({
      el,
      display: el.style.getPropertyValue('display'),
      priority: el.style.getPropertyPriority('display')
    });
    el.style.setProperty('display', 'none', 'important');
  }

  function isOurs(el) {
    return el.hasAttribute(CONTAINER_ATTR) || !!el.querySelector(`[${CONTAINER_ATTR}]`) || !!el.closest(`[${CONTAINER_ATTR}]`);
  }

  function hideAd(el) {
    const swap = currentSwap();
    if (!swap || !el.isConnected || isOurs(el)) return;
    if (el.style.getPropertyValue('display') === 'none') return;
    hideElement(el, swap);

    // Collapse wrappers that are now empty (up to 3 levels).
    let parent = el.parentElement;
    for (let depth = 0; parent && depth < 3; depth++) {
      if (PROTECTED_TAGS.includes(parent.tagName) || isOurs(parent)) break;
      const visible = Array.from(parent.children).filter(
        (c) => !IGNORED_CHILD_TAGS.includes(c.tagName) && c.style.getPropertyValue('display') !== 'none'
      );
      if (visible.length > 0) break;
      hideElement(parent, swap);
      parent = parent.parentElement;
    }
  }

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.matches(AD_SELECTORS)) hideAd(node);
          else node.querySelectorAll(AD_SELECTORS).forEach(hideAd);
        }
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
}
