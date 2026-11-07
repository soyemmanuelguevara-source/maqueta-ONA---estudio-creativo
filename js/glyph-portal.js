/**
 * Glyph Portal © 2026 Christian Katzmann. MIT.
 * Origin: UsefulPortal.astro on https://ktzm.dk → UsefulPortal.tsx → ClarityPortal.tsx.
 * A scroll-driven camera through live type. Keep this notice with copies.
 *
 * Port a JavaScript vanilla del componente React <GlyphPortal /> (glyph-portal.tsx),
 * para este sitio estático. Sin dependencias ni build; se carga con `defer`.
 *
 * Uso:
 *   const portal = GlyphPortal.mount(document.querySelector('#portal'), {
 *     word, focusChar, interactive, scrollLength, fontFamily, fontWeight,
 *     annotations, onProgress, letterLabel,
 *   });
 *   portal.destroy();
 *
 * El marcado (campo, svg, front, caption, contenido) vive en el HTML; el estilo, en
 * css/styles.css (sección "Portal de letra"). Las fuentes personalizadas deben estar
 * cargadas ANTES de montar: el componente congela la cara disponible en ese momento.
 */
(() => {
  'use strict';

  const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n));
  const smooth = (a, b, n) => {
    const t = clamp((n - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  const DEFAULT_FONT = '"Arial Black", "Arial", sans-serif';

  /** Largest opaque square, in linear time. Unlike a stem guess, it works in O, S and Ø. */
  function interior(context, char, font) {
    const canvas = context.canvas;
    context.font = font;
    const m = context.measureText(char);
    const pad = 8;
    const left = Math.ceil(m.actualBoundingBoxLeft);
    const ascent = Math.ceil(m.actualBoundingBoxAscent);
    canvas.width = Math.max(1, Math.ceil(m.actualBoundingBoxLeft + m.actualBoundingBoxRight) + pad * 2);
    canvas.height = Math.max(1, Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) + pad * 2);
    context.font = font;
    context.fontKerning = 'none';
    context.fillText(char, pad + left, pad + ascent);
    const { width, height } = canvas;
    const pixels = context.getImageData(0, 0, width, height).data;
    const rows = new Uint16Array(width + 1);
    let size = 0, bx = 0, by = 0;
    for (let y = 0; y < height; y++) {
      let diagonal = 0;
      for (let x = 0; x < width; x++) {
        const above = rows[x + 1];
        rows[x + 1] = pixels[(y * width + x) * 4 + 3] > 245
          ? Math.min(above, rows[x], diagonal) + 1 : 0;
        diagonal = above;
        if (rows[x + 1] > size) { size = rows[x + 1]; bx = x; by = y; }
      }
    }
    if (size < 3) return null;
    // Scan at 3× SVG size. Inscribe a disk in the square, with room for raster disagreement.
    return {
      x: (bx + 1 - size / 2 - pad - left) / 3,
      y: (by + 1 - size / 2 - pad - ascent) / 3,
      radius: (size / 2 - 1) / 3,
    };
  }

  function scrollParent(element) {
    for (let p = element.parentElement; p; p = p.parentElement) {
      if (/(auto|scroll|hidden)/.test(getComputedStyle(p).overflowY) && p !== document.body && p !== document.documentElement) return p;
    }
    return null;
  }

  function mount(section, options) {
    const opts = options || {};
    const q = (sel) => section.querySelector(sel);
    const pin = q('[data-gp-pin]');
    const field = q('[data-gp-field]');
    const art = q('[data-gp-art]');
    const clip = q('clipPath');
    const glyph = q('[data-gp-glyph]');
    const marks = q('[data-gp-marks]');
    const choices = q('[data-gp-choices]');
    const picker = q('[data-gp-select]');
    const fallback = q('[data-gp-fallback]');
    const viewport = q('[data-gp-viewport]');
    if (!pin || !field || !art || !clip || !glyph || !marks || !choices || !picker || !viewport) return null;

    const word = opts.word != null ? opts.word : (section.dataset.gpWord || 'SUBLIME');
    const focusChar = opts.focusChar;
    const interactive = opts.interactive !== false;
    const fontFamily = opts.fontFamily || DEFAULT_FONT;
    const annotations = !!opts.annotations;
    const onProgress = opts.onProgress;
    const letterLabel = opts.letterLabel || ((char, i, n) => `${char}, letter ${i + 1} of ${n}`);
    const scrollLength = opts.scrollLength != null ? opts.scrollLength : 2.4;
    const fontWeight = opts.fontWeight != null ? opts.fontWeight : 900;

    const clipId = clip.id;
    const text = word.trim().normalize('NFC') || 'SUBLIME';
    let characterOffset = 0;
    const characters = Array.from(text, (char) => {
      const index = characterOffset; characterOffset += char.length;
      return { char, index };
    });
    const length = Number.isFinite(scrollLength) ? clamp(scrollLength, 1, 8) : 2.4;
    const weight = Number.isFinite(fontWeight) ? clamp(fontWeight, 1, 1000) : 900;
    const hasFront = !!q('[data-gp-front]');

    /* ─── markup derivado de la palabra (botones por letra, selector táctil) ─── */
    section.setAttribute('aria-label', text);
    section.style.setProperty('--gp-length', String(length));
    section.style.setProperty('--gp-characters', String(Array.from(text).length));
    glyph.textContent = text;
    Object.assign(glyph.style, {
      fontWeight: String(weight), fontSize: '100px', fontKerning: 'none',
      fontVariantLigatures: 'none', letterSpacing: '0',
    });
    if (fallback) {
      fallback.textContent = text;
      fallback.style.fontFamily = fontFamily;
      fallback.style.fontWeight = String(weight);
    }
    choices.replaceChildren(...characters.map(({ char, index }, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', 'false');
      button.tabIndex = -1;
      button.dataset.gpLetter = String(index);
      button.setAttribute('aria-label', letterLabel(char, i, characters.length));
      return button;
    }));
    const placeholder = picker.querySelector('option[value=""]');
    picker.replaceChildren(...(placeholder ? [placeholder] : []), ...characters.map(({ char, index }, i) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = `${i + 1} · ${char}`;
      return option;
    }));
    picker.value = '';
    const buttons = Array.from(choices.querySelectorAll('button'));
    marks.style.visibility = annotations ? 'visible' : 'hidden';

    const root = scrollParent(section);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    let disposed = false, raf = 0, dirty = true, active = true, ready = false;
    const mountedAt = performance.now();
    let browserFrameSeen = false, stalled = false;
    let W = 1, H = 1, travel = 1, startScale = 1, endScale = 1;
    let center = { x: 0, y: 0 }, target = null;
    let lastProgress = -1;
    let candidates = [], letters = [];
    let choosing = false;
    let bounds = { x: 0, y: 0, width: 1, height: 1 };
    let fontDirty = true;

    // Freeze an available face for this mount. Late font swaps move the ink under the camera.
    // Preload custom faces before mounting; pending/failed faces use the supplied fallback stack.
    glyph.style.fontFamily = fontFamily;
    const computedFamily = getComputedStyle(glyph).fontFamily;
    const families = computedFamily.match(/(?:[^,"']+|"[^"]*"|'[^']*')+/g) || [];
    const available = families.filter((family) => {
      try { return document.fonts.check(`${weight} 100px ${family.trim()}`, text); }
      catch (e) { return false; }
    });
    glyph.style.fontFamily = [...available, DEFAULT_FONT].join(',');
    // A pending requested face may also hold WebKit's render loop. Keep that mount static.
    stalled = available.length < families.length;

    const readInk = () => {
      if (!context) return false;
      const font = getComputedStyle(glyph);
      const scanFont = `${font.fontWeight} 300px ${font.fontFamily}`;
      context.font = `${font.fontWeight} 100px ${font.fontFamily}`;
      context.fontKerning = 'none';
      const metrics = context.measureText(text);
      const advances = Array.from({ length: text.length }, (_, i) => context.measureText(text.slice(0, i)).width);
      // SVG getBBox includes the font's line box in some engines. Frame visible ink instead.
      bounds = {
        x: -metrics.actualBoundingBoxLeft, y: -metrics.actualBoundingBoxAscent,
        width: metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight,
        height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent,
      };
      if (!bounds.width || !bounds.height) return false;
      center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
      const requested = focusChar ? text.indexOf(focusChar.normalize('NFC')) : -1;
      let offset = 0;
      candidates = []; letters = [];
      for (const char of Array.from(text)) {
        context.font = `${font.fontWeight} 100px ${font.fontFamily}`;
        const m = context.measureText(char);
        letters.push({
          index: offset, x: advances[offset] - m.actualBoundingBoxLeft,
          y: -m.actualBoundingBoxAscent, width: m.actualBoundingBoxLeft + m.actualBoundingBoxRight,
          height: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent,
        });
        const found = interior(context, char, scanFont);
        if (found) candidates.push({ ...found, x: found.x + advances[offset], index: offset });
        offset += char.length;
      }
      target = candidates.find((candidate) => candidate.index === requested)
        || [...candidates].sort((a, b) => b.radius - a.radius || Math.abs(a.x - center.x) - Math.abs(b.x - center.x))[0]
        || null;
      return true;
    };

    const select = (next) => {
      target = next;
      endScale = target ? Math.max(startScale, Math.hypot(W, H) / (target.radius * 1.35)) : startScale;
      section.dataset.gpFocus = target ? Array.from(text.slice(target.index))[0] : '';
      section.dataset.gpFocusIndex = String(target ? target.index : -1);
      for (const button of buttons) {
        const selected = Number(button.dataset.gpLetter) === (target && target.index);
        button.disabled = !candidates.some((candidate) => candidate.index === Number(button.dataset.gpLetter));
        button.setAttribute('aria-checked', String(selected));
        button.tabIndex = selected ? 0 : -1;
      }
      if (picker.value !== '') picker.value = String(target ? target.index : -1);
      for (const option of Array.from(picker.options)) {
        option.disabled = option.value === '' || !candidates.some((candidate) => candidate.index === Number(option.value));
      }
      const u = 1 / startScale;
      const y = bounds.y + bounds.height + 25 * u;
      const x = bounds.x;
      const right = x + bounds.width;
      const cross = target ? `M${target.x - 9 * u} ${target.y}h${18 * u}M${target.x} ${target.y - 9 * u}v${18 * u}` : '';
      const annotationPath = marks.querySelector('path');
      annotationPath.setAttribute('d', `M${x} ${y}H${right}M${x} ${y - 5 * u}v${10 * u}M${right} ${y - 5 * u}v${10 * u}${cross}`);
      annotationPath.setAttribute('stroke-width', String(u));
    };

    const position = () => {
      const origin = root ? root.getBoundingClientRect().top + root.clientTop : 0;
      return clamp((origin - section.getBoundingClientRect().top) / travel);
    };

    const paint = (progress) => {
      const isStatic = motion.matches || !browserFrameSeen || stalled || !target;
      const p = isStatic ? 0 : progress;
      const t = clamp(p / 0.78);
      const eased = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
      const scale = Math.exp(Math.log(startScale) + Math.log(endScale / startScale) * eased);
      const blend = endScale === startScale ? 0 : (1 / scale - 1 / startScale) / (1 / endScale - 1 / startScale);
      const cx = center.x + ((target ? target.x : center.x) - center.x) * blend;
      const cy = center.y + ((target ? target.y : center.y) - center.y) * blend;
      const roll = -4 * smooth(0.06, 0.5, t) * (1 - smooth(0.62, 0.92, t));
      const transform = `translate(${W / 2} ${H * 0.46 + H * 0.04 * eased}) scale(${scale}) rotate(${roll}) translate(${-cx} ${-cy})`;
      // Keep scale on the clip to avoid text paint limits. Text-local translation
      // follows page zoom in WebKit; translation on an HTML clip reference does not.
      const radians = roll * Math.PI / 180;
      const dx = W / 2 / scale, dy = (H * 0.46 + H * 0.04 * eased) / scale;
      clip.setAttribute('transform', `scale(${scale}) rotate(${roll})`);
      glyph.setAttribute('transform', `translate(${Math.cos(radians) * dx + Math.sin(radians) * dy - cx} ${-Math.sin(radians) * dx + Math.cos(radians) * dy - cy})`);
      marks.setAttribute('transform', transform);
      marks.style.opacity = String(1 - smooth(0.015, 0.17, p));
      choosing = interactive && !isStatic && p < 0.04;
      choices.inert = !choosing;
      section.dataset.gpChoosing = String(choosing);
      // Drop the clip only after the camera has already filled the viewport with ink.
      field.style.clipPath = t >= 1 ? 'none' : `url(#${clipId})`;
      section.style.setProperty('--gp-caption', String(1 - smooth(0.01, 0.16, p)));
      section.style.setProperty('--gp-reveal', String(isStatic ? 1 : smooth(0.78, 0.9, p)));
      section.style.setProperty('--gp-field-scale', String(1 + 0.16 * smooth(0, 0.82, p)));
      section.style.setProperty('--gp-caption-hit', p < 0.08 ? 'auto' : 'none');
      section.dataset.gpEntered = String(p >= 0.9);
      section.dataset.gpProgress = p.toFixed(5);
      if (p !== lastProgress) { lastProgress = p; if (onProgress) onProgress(p); }
    };

    const layout = () => {
      if (!section.clientWidth) return;
      W = pin.clientWidth;
      // A 100svh probe keeps browser chrome from continually changing the scroll distance.
      const smallViewport = viewport.offsetHeight;
      const viewportHeight = Math.max(1, Math.min(root ? root.clientHeight : smallViewport, smallViewport));
      H = motion.matches ? Math.min(viewportHeight * 0.75, 480) : viewportHeight;
      section.style.setProperty('--gp-height', `${H}px`);
      travel = H * length;
      art.setAttribute('viewBox', `0 0 ${W} ${H}`);
      if (fontDirty) { ready = readInk(); fontDirty = false; }
      if (!ready) return;
      const wordHeight = hasFront && H < 480 ? Math.min(H * 0.38, Math.max(24, H - 264)) : H * 0.38;
      startScale = Math.min(W * 0.84 / bounds.width, wordHeight / bounds.height);
      // The whole viewport fits inside measured ink, even with the small camera bank.
      select(target);
      for (const button of buttons) {
        const letter = letters.find((item) => item.index === Number(button.dataset.gpLetter));
        Object.assign(button.style, {
          left: `${W / 2 + (letter.x - center.x) * startScale}px`,
          top: `${H * 0.46 + (letter.y - center.y) * startScale - Math.max(0, 44 - letter.height * startScale) / 2}px`,
          width: `${Math.max(1, letter.width * startScale)}px`,
          height: `${Math.max(44, letter.height * startScale)}px`,
        });
      }
      section.style.setProperty('--gp-word-top', `${H * 0.46 - bounds.height * startScale / 2}px`);
      section.style.setProperty('--gp-word-bottom', `${H * 0.46 + bounds.height * startScale / 2}px`);
      section.dataset.gpReady = 'true';
      section.dataset.gpMotion = !motion.matches && browserFrameSeen && !stalled && target ? 'on' : 'off';
    };

    const frame = (time) => {
      raf = 0;
      if (disposed) return;
      if (time !== undefined && !browserFrameSeen) {
        browserFrameSeen = true; stalled = stalled || performance.now() - mountedAt > 2500; dirty = true;
      }
      if (dirty) { dirty = false; layout(); }
      if (ready) paint(position());
    };
    const schedule = () => { if (!raf && active) raf = requestAnimationFrame(frame); };
    const resize = () => { cancelAnimationFrame(raf); dirty = true; frame(); };
    const scroll = () => schedule();
    const choose = (event) => {
      if (!choosing || position() >= 0.04) return;
      const button = event.target.closest('[data-gp-letter]');
      const next = candidates.find((candidate) => candidate.index === Number(button && button.dataset.gpLetter));
      if (!next || next === target) return;
      select(next); paint(position());
    };
    const navigate = (event) => {
      if (!choosing || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const current = candidates.indexOf(target);
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? candidates.length - 1
        : (current + (event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1) + candidates.length) % candidates.length;
      const button = buttons.find((b) => Number(b.dataset.gpLetter) === candidates[index].index);
      if (button) button.focus({ preventScroll: true });
    };
    const pick = () => {
      if (!choosing || position() >= 0.04) return;
      const next = candidates.find((candidate) => candidate.index === Number(picker.value));
      if (next) { select(next); paint(position()); }
    };
    choices.addEventListener('pointerover', choose);
    choices.addEventListener('click', choose);
    choices.addEventListener('focusin', choose);
    choices.addEventListener('keydown', navigate);
    picker.addEventListener('change', pick);
    const observer = new ResizeObserver(resize);
    observer.observe(section);
    if (root) observer.observe(root);
    const visibility = new IntersectionObserver(([entry]) => {
      active = entry.isIntersecting;
      if (active) { dirty = true; schedule(); }
      else if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }, { root, rootMargin: '100% 0px' });
    visibility.observe(section);
    (root || window).addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', resize);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
    motion.addEventListener('change', resize);
    frame();
    // WebKit can withhold frames, timers and scroll events behind an initial hung font.
    // Begin in reading flow. Enable motion only when the browser starts rendering promptly.
    schedule();

    return {
      destroy() {
        disposed = true;
        cancelAnimationFrame(raf);
        observer.disconnect();
        visibility.disconnect();
        (root || window).removeEventListener('scroll', scroll);
        window.removeEventListener('resize', resize);
        if (window.visualViewport) window.visualViewport.removeEventListener('resize', resize);
        motion.removeEventListener('change', resize);
        choices.removeEventListener('pointerover', choose);
        choices.removeEventListener('click', choose);
        choices.removeEventListener('focusin', choose);
        choices.removeEventListener('keydown', navigate);
        picker.removeEventListener('change', pick);
      },
    };
  }

  window.GlyphPortal = { mount };
})();
