/* ═══════════════════════════════════════════════════════════════
   ONA STUDIO — Fondos vivos en canvas (js/escenas.js)
   · [data-pistas]  Cómo trabajamos: un "piso" de pistas de edición en perspectiva. Los clips corren por sus pistas a
                    distintas velocidades, pulsos de luz las recorren y un cabezal rojo barre la escena encendiendo los
                    clips que toca. Acelera cuando haces scroll; con mouse, el punto de fuga sigue un poco al cursor.
   · Estela del cursor: con mouse, sobre zonas que no son botones ni enlaces, se encienden celdas hexagonales de un
                    "panel táctil" que se apagan solas; un clic manda un pulso corto.
   · [data-parvada] Pie de página: miles de estorninos sobre un cielo de atardecer que se juntan para formar el logo
                    de ONA (aves blancas sobre el azul de la página), lo sostienen y se dispersan; el cursor es un
                    halcón que abre la parvada.
   Ambos se duermen fuera de pantalla. Con movimiento reducido se dibujan una sola vez, quietos.
═══════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fino = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const azar = Math.random;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  // Lienzo al tamaño de su caja (máx. 1.5x para cuidar la batería); devuelve [ancho, alto, dpr]
  const ajustar = (cv, ctx) => {
    const r = cv.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return [w, h, dpr];
  };

  // Bucle que solo corre mientras el elemento se ve
  const bucle = (el, paso) => {
    let raf = 0;
    let visible = false;
    let antes = 0;
    const tick = (now) => {
      raf = 0;
      if (!visible) return;
      paso(now, Math.min(64, now - (antes || now)));
      antes = now;
      raf = requestAnimationFrame(tick);
    };
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      antes = 0;
      if (visible && !raf && !reduce) raf = requestAnimationFrame(tick);
    }).observe(el);
  };


  /* ─── Pistas de edición en perspectiva ─────────────────── */
  function pistas(wrap) {
    const cv = wrap.querySelector('canvas');
    const ctx = cv && cv.getContext('2d');
    if (!ctx) return;
    const seccion = wrap.closest('section') || wrap;
    const N = 16;
    const Z0 = 1;
    const Z1 = 10;
    const MEDIA = (Z1 - Z0) / (N - 1) * 0.34; // medio grosor de cada pista (en profundidad)
    const lanes = Array.from({ length: N }, (_, i) => {
      const clips = [];
      let x = 0;
      while (x < 3200) {
        const largo = 140 + azar() * 420;
        const r = azar();
        clips.push({ x, largo, tono: r < 0.12 ? 2 : r < 0.5 ? 1 : 0 });
        x += largo + 50 + azar() * 260;
      }
      return { z: Z0 + (Z1 - Z0) * (i / (N - 1)), clips, tramo: x, vel: 0.55 + azar() * 0.9 };
    });
    const pulsos = Array.from({ length: 10 }, () => ({ pista: (azar() * N) | 0, x: azar() * 3000, vel: 380 + azar() * 520 }));
    let w = 0, h = 0, yh = 0, cx = 0, fugaX = 0.5, meta = 0.5;
    let camX = 0, extra = 0, barrido = 0;
    let prevY = window.scrollY;

    const medir = () => { [w, h] = ajustar(cv, ctx); yh = h * 0.34; cx = w / 2; };
    const py = (z) => yh + (h - yh) * 1.3 / z;
    const sx = (X, z) => cx + X / z;

    const dibujar = () => {
      ctx.clearRect(0, 0, w, h);
      cx = w * (0.5 + (fugaX - 0.5) * 0.16);
      // Resplandor del horizonte
      const g = ctx.createLinearGradient(0, yh - 90, 0, yh + 70);
      g.addColorStop(0, 'rgba(80,127,250,0)');
      g.addColorStop(0.55, 'rgba(80,127,250,.22)');
      g.addColorStop(1, 'rgba(80,127,250,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, yh - 90, w, 160);
      // Líneas de fuga del piso (se desplazan con la cámara)
      ctx.lineWidth = 1;
      const paso = 260;
      const base = -((camX * 0.8) % paso);
      for (let X = base - w * 6; X < w * 6; X += paso) {
        const x0 = sx(X, Z0 * 0.8);
        const x1 = sx(X, Z1);
        ctx.strokeStyle = 'rgba(240,243,255,.05)';
        ctx.beginPath(); ctx.moveTo(x0, py(Z0 * 0.8)); ctx.lineTo(x1, py(Z1)); ctx.stroke();
      }
      // Cabezal: un plano vertical fijo en el mundo (cabMundo); cabX es dónde cruza la pista más cercana
      const cabX = -w * 0.1 + barrido * w * 1.2;
      const cabMundo = (cabX - cx) * Z0 * 0.8;
      // Pistas, de la más lejana a la más cercana
      for (let i = N - 1; i >= 0; i--) {
        const L = lanes[i];
        const a = Math.pow(1 - (L.z - Z0) / (Z1 - Z0), 0.9);
        const zc = L.z - MEDIA;
        const zl = L.z + MEDIA;
        const yC = py(zc);
        const yL = py(zl);
        if (yL > h + 40) continue;
        ctx.strokeStyle = `rgba(240,243,255,${(0.04 + a * 0.08).toFixed(3)})`;
        ctx.beginPath(); ctx.moveTo(0, yC + 1); ctx.lineTo(w, yC + 1); ctx.stroke();
        const desp = camX * L.vel;
        const visto0 = (0 - cx) * L.z + desp;
        const visto1 = (w - cx) * L.z + desp;
        for (let k = Math.floor(visto0 / L.tramo) - 1; k <= Math.floor(visto1 / L.tramo); k++) {
          for (const c of L.clips) {
            const X0 = c.x + k * L.tramo - desp;
            const X1 = X0 + c.largo;
            if (X1 < visto0 - desp || X0 > visto1 - desp) continue;
            const encendido = cabMundo >= X0 && cabMundo <= X1;
            const ax = sx(X0, zc), bx = sx(X1, zc), cxl = sx(X1, zl), dx = sx(X0, zl);
            ctx.beginPath(); ctx.moveTo(ax, yC); ctx.lineTo(bx, yC); ctx.lineTo(cxl, yL); ctx.lineTo(dx, yL); ctx.closePath();
            if (encendido) ctx.fillStyle = `rgba(190,210,255,${(a * 0.55).toFixed(3)})`;
            else if (c.tono === 2) ctx.fillStyle = `rgba(255,77,61,${(a * 0.26).toFixed(3)})`;
            else if (c.tono === 1) ctx.fillStyle = `rgba(240,243,255,${(a * 0.1).toFixed(3)})`;
            else ctx.fillStyle = `rgba(80,127,250,${(a * 0.26).toFixed(3)})`;
            ctx.fill();
            ctx.strokeStyle = encendido ? `rgba(255,255,255,${(a * 0.8).toFixed(3)})` : `rgba(80,127,250,${(a * 0.5).toFixed(3)})`;
            ctx.stroke();
          }
        }
      }
      // Pulsos de luz que corren por las pistas
      pulsos.forEach((p) => {
        const L = lanes[p.pista];
        const a = Math.pow(1 - (L.z - Z0) / (Z1 - Z0), 0.9);
        const X = ((p.x - camX * L.vel) % 6000 + 6000) % 6000 - 3000;
        const x = sx(X, L.z);
        const y = py(L.z);
        if (x < -60 || x > w + 60) return;
        const cola = ctx.createLinearGradient(x - 70 / L.z * 2, y, x, y);
        cola.addColorStop(0, 'rgba(240,243,255,0)');
        cola.addColorStop(1, `rgba(240,243,255,${(a * 0.9).toFixed(3)})`);
        ctx.strokeStyle = cola;
        ctx.lineWidth = Math.max(1, 2.4 / Math.sqrt(L.z));
        ctx.beginPath(); ctx.moveTo(x - 140 / L.z, y); ctx.lineTo(x, y); ctx.stroke();
      });
      ctx.lineWidth = 1;
      // Cabezal rojo: un plano vertical que se pierde hacia el punto de fuga
      ctx.save();
      ctx.strokeStyle = 'rgba(255,77,61,.85)';
      ctx.shadowColor = 'rgba(255,77,61,.9)';
      ctx.shadowBlur = 14;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cabX, py(Z0 * 0.8)); ctx.lineTo(cx + (cabX - cx) * (Z0 * 0.8) / Z1, py(Z1)); ctx.stroke();
      ctx.restore();
      // Niebla al fondo: las pistas lejanas se funden con el azul de la sección
      const n = ctx.createLinearGradient(0, yh - 4, 0, yh + (h - yh) * 0.3);
      n.addColorStop(0, 'rgba(15,31,178,1)');
      n.addColorStop(1, 'rgba(15,31,178,0)');
      ctx.fillStyle = n;
      ctx.fillRect(0, yh - 4, w, (h - yh) * 0.3 + 4);
    };

    medir();
    new ResizeObserver(() => { medir(); if (reduce) dibujar(); }).observe(cv);
    if (reduce) { dibujar(); return; }
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      extra = Math.min(2600, extra + Math.abs(y - prevY) * 6);
      prevY = y;
    }, { passive: true });
    if (fino) seccion.addEventListener('pointermove', (e) => { meta = e.clientX / window.innerWidth; });
    bucle(wrap, (now, dt) => {
      const s = dt / 1000;
      extra *= Math.pow(0.04, s);
      camX += (90 + extra) * s;
      pulsos.forEach((p) => { p.x += p.vel * s; });
      barrido = ((now / 7000) % 1);
      fugaX += (meta - fugaX) * Math.min(1, s * 2);
      dibujar();
    });
  }


  /* ─── Parvada: miles de estorninos que forman el ONA ─────
     Adaptación sin React de "Murmuration Wordmark" (llegó como prompt; sin aviso de autor ni licencia): la parvada se
     pliega con una corriente rotacional (no amontona aves ni abre huecos) y un centro de gravedad que deambula; cada
     ciclo se junta en el logo real de ONA (muestreado del SVG), lo sostiene y se dispersa. El cursor es un halcón.
     Aves blancas sobre el mismo azul de la página, con un cielo de estrellas realista: solo puntos pequeños de distinto
     brillo (unos pocos titilan) y una vía láctea muy tenue hecha de puntitos. */
  const semilla = (s) => {
    let a = (s >>> 0) || 1;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let x = a;
      x = Math.imul(x ^ (x >>> 15), x | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  };
  const corriente = (x, y, t) => {
    const a = 1.7 * x + t;
    const b = 1.3 * y - 0.6 * t;
    const c = 2.9 * y + 1.1 * x - 0.8 * t;
    const d = 4.3 * x - 3.7 * y + 1.3 * t;
    const dx = 1.7 * Math.cos(a) * Math.cos(b) + 0.66 * Math.cos(c) - 1.505 * Math.sin(d);
    const dy = -1.3 * Math.sin(a) * Math.sin(b) + 1.74 * Math.cos(c) + 1.295 * Math.sin(d);
    return [dy, -dx];
  };
  const suave = (k) => { const x = clamp(k); return x * x * (3 - 2 * x); };

  function parvada(box) {
    const cv = document.createElement('canvas');
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    cv.className = 'footer__parvada';
    box.append(cv);
    box.classList.add('is-parvada');
    const TINTA = '#FAF9F4'; // aves blancas (crema de ONA)
    const FONDO = '#0F1FB2'; // el azul de la página (--bg)
    const VUELA = 6, FORMA = 2.4, SOSTIENE = 3.6, SUELTA = 0.7;
    const CICLO = VUELA + FORMA + SOSTIENE + SUELTA;
    const rnd = semilla(11);
    let w = 1, h = 1, dpr = 1, n = 0;
    let cielo = null;
    let px = new Float32Array(0), py = px, vx = px, vy = px, prof = px, fase = px;
    let meta = new Int32Array(0);
    let tx = new Float32Array(0), ty = tx;
    let estrellas = [];
    let hx = -1e5, hy = -1e5;
    let reloj = VUELA - 1.6; // la primera vez forma el logo poco después de aparecer
    const logo = new Image();
    const imgBox = box.querySelector('img');
    logo.src = imgBox ? imgBox.getAttribute('src') : 'assets/img/ona-wordmark-cream.svg';

    // Fondo: el azul de la página con un campo de estrellas fijo, pintado una vez. Como en una foto del cielo: puntos
    // diminutos (la mayoría apenas visibles, pocos más brillantes), sin halos ni destellos; una vía láctea tenue.
    const pintarCielo = () => {
      cielo = document.createElement('canvas');
      cielo.width = cv.width;
      cielo.height = cv.height;
      const s = cielo.getContext('2d');
      s.setTransform(dpr, 0, 0, dpr, 0, 0);
      s.fillStyle = FONDO;
      s.fillRect(0, 0, w, h);
      const er = semilla(9);
      const punto = (x, y, tam, alfa, frio) => {
        s.fillStyle = frio ? `rgba(200,215,255,${alfa.toFixed(2)})` : `rgba(255,255,252,${alfa.toFixed(2)})`;
        s.fillRect(x, y, tam, tam);
      };
      // Vía láctea: una franja diagonal donde los puntitos son más densos (sin halo de color)
      const ang = -0.32;
      for (let i = 0; i < (w * h) / 1100; i++) {
        const x = (er() - 0.5) * w * 1.4;
        const y = (er() + er() + er() - 1.5) * h * 0.14;
        punto(w / 2 + x * Math.cos(ang) - y * Math.sin(ang), h / 2 + x * Math.sin(ang) + y * Math.cos(ang), 0.7, 0.08 + er() * 0.22, er() < 0.3);
      }
      // Campo de estrellas: casi todas diminutas y tenues; pocas un poco más brillantes (nunca grandes)
      for (let i = 0; i < (w * h) / 1500; i++) {
        const b = Math.pow(er(), 2.6); // brillo: la mayoría baja
        punto(er() * w, er() * h, b > 0.6 ? 1.4 : b > 0.25 ? 1.1 : 0.8, 0.18 + b * 0.75, er() < 0.2);
      }
      estrellas = Array.from({ length: Math.round(w / 14) }, () => ({ x: er() * w, y: er() * h, r: 0.8 + er() * 0.6, f: er() * 6.28 }));
    };

    // El logo de ONA, muestreado en puntos (los lugares de las aves cuando forman la palabra)
    const muestrear = () => {
      if (!logo.complete || !logo.naturalWidth) return;
      const m = document.createElement('canvas');
      m.width = w;
      m.height = h;
      const mc = m.getContext('2d', { willReadFrequently: true });
      if (!mc) return;
      const asp = (logo.naturalWidth / logo.naturalHeight) || 904 / 422;
      const lw = Math.min(w * (w < 640 ? 0.92 : 0.86), h * 0.7 * asp); // el logo, grande
      const lh = lw / asp;
      mc.drawImage(logo, (w - lw) / 2, h * 0.5 - lh / 2, lw, lh);
      const img = mc.getImageData(0, 0, w, h).data;
      const paso = Math.max(2, Math.round(Math.sqrt((w * h) / 90000)));
      const pts = [];
      for (let y = 0; y < h; y += paso) {
        for (let x = 0; x < w; x += paso) {
          if (img[(y * w + x) * 4 + 3] > 128) pts.push(x + (rnd() - 0.5) * paso, y + (rnd() - 0.5) * paso);
        }
      }
      const k = pts.length / 2;
      tx = new Float32Array(k);
      ty = new Float32Array(k);
      for (let i = 0; i < k; i++) { tx[i] = pts[i * 2]; ty[i] = pts[i * 2 + 1]; }
      // Cada ave a un punto, barajados: la palabra se llena desde todos lados a la vez
      const orden = Int32Array.from({ length: k }, (_, i) => i);
      const r = semilla(23);
      for (let i = k - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const x = orden[i]; orden[i] = orden[j]; orden[j] = x; }
      meta = new Int32Array(n);
      for (let i = 0; i < n; i++) meta[i] = k ? orden[i % k] : -1;
    };

    const medir = () => {
      const r = box.getBoundingClientRect();
      w = Math.max(1, Math.round(r.width));
      h = Math.max(1, Math.round(r.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      pintarCielo();
      const quiere = Math.max(1100, Math.round(6800 * Math.min(1.25, (w * h) / (1440 * 860)))); // más aves: el logo es más grande
      if (quiere !== n) {
        n = quiere;
        px = new Float32Array(n); py = new Float32Array(n); vx = new Float32Array(n); vy = new Float32Array(n);
        prof = new Float32Array(n); fase = new Float32Array(n);
        for (let i = 0; i < n; i++) {
          const a = rnd() * Math.PI * 2;
          const rr = Math.sqrt(rnd());
          px[i] = w * 0.5 + Math.cos(a) * rr * w * 0.22;
          py[i] = h * 0.4 + Math.sin(a) * rr * h * 0.16;
          prof[i] = 0.55 + rnd() * 0.45;
          fase[i] = rnd() * Math.PI * 2;
        }
      }
      muestrear();
      if (reduce) asentar();
    };
    // Movimiento reducido: la parvada aparece ya formando el logo, quieta
    const asentar = () => { for (let i = 0; i < n; i++) { const m = meta[i]; if (m >= 0) { px[i] = tx[m]; py[i] = ty[m]; } } };

    const dibujar = (dt) => {
      reloj += dt;
      const tc = reloj % CICLO;
      let tira = 0; // 0 vuelo libre → 1 formando el logo
      if (reduce) tira = 1;
      else if (tc > VUELA && tc <= VUELA + FORMA) tira = suave((tc - VUELA) / FORMA);
      else if (tc > VUELA + FORMA && tc <= VUELA + FORMA + SOSTIENE) tira = 1;
      else if (tc > VUELA + FORMA + SOSTIENE) tira = 1 - suave((tc - VUELA - FORMA - SOSTIENE) / SUELTA);
      const u = Math.min(w, h);
      const cx = w / 2 + (0.42 * Math.sin(reloj * 0.21) + 0.12 * Math.sin(reloj * 0.53 + 1)) * w * 0.5;
      const cy = h * 0.42 + (0.16 * Math.sin(reloj * 0.33 + 2) - 0.08) * h;
      const t = reloj * 0.35;
      const halcon = hx > -1e4;
      const rH = u * 0.16;
      const libre = 1 - tira;
      for (let i = 0; i < n && dt > 0; i++) {
        const x = px[i], y = py[i];
        let ax = 0, ay = 0;
        const c = corriente(((x - w / 2) / u) * 2.2 + prof[i] * 0.25, ((y - h / 2) / u) * 2.2, t);
        ax += c[0] * 420 * libre;
        ay += c[1] * 420 * libre;
        const dX = cx - x;
        const dY = (cy - y) * 1.6;
        const dC = Math.hypot(dX, dY) / u;
        const junta = dC < 0.14 ? 0.15 : 0.15 + (dC - 0.14) * 6;
        ax += dX * junta * 2.2 * libre;
        ay += dY * junta * 1.6 * libre;
        const m = meta[i];
        if (tira > 0 && m >= 0) {
          ax += (tx[m] - x) * 9 * tira - vx[i] * 3.2 * tira;
          ay += (ty[m] - y) * 9 * tira - vy[i] * 3.2 * tira;
        }
        if (halcon) {
          const ex = x - hx, ey = y - hy;
          const d2 = ex * ex + ey * ey;
          if (d2 < rH * rH) {
            const d = Math.sqrt(d2) + 0.01;
            const f = (1 - d / rH) * 5200;
            ax += (ex / d) * f;
            ay += (ey / d) * f;
          }
        }
        let nx = (vx[i] + ax * dt) * (1 - 1.1 * dt);
        let ny = (vy[i] + ay * dt) * (1 - 1.1 * dt);
        const sp = Math.hypot(nx, ny);
        const tope = 520 + 380 * tira;
        if (sp > tope) { nx = (nx / sp) * tope; ny = (ny / sp) * tope; }
        vx[i] = nx; vy[i] = ny;
        px[i] = x + nx * dt; py[i] = y + ny * dt;
        fase[i] += dt * (9 + sp * 0.02);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (cielo) ctx.drawImage(cielo, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Unas pocas estrellas titilan suavemente
      for (const e of estrellas) {
        ctx.fillStyle = `rgba(255,255,252,${Math.max(0, 0.32 + 0.3 * Math.sin(reloj * 1.3 + e.f)).toFixed(3)})`;
        ctx.fillRect(e.x, e.y, e.r, e.r);
      }
      // Dos pasadas por profundidad: las aves cercanas, más oscuras y gruesas
      for (let pasada = 0; pasada < 2; pasada++) {
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const cerca = prof[i] > 0.78;
          if ((pasada === 1) !== cerca) continue;
          const s = (1.6 + prof[i] * 2.2) * (1 - 0.35 * tira);
          const sp = Math.hypot(vx[i], vy[i]) + 0.001;
          const dx = sp > 0.01 ? vx[i] / sp : 1;
          const dy = sp > 0.01 ? vy[i] / sp : 0;
          const aleteo = 0.55 + 0.45 * Math.sin(fase[i]);
          const wx = -dx * s, wy = -dy * s;
          const nx = -dy * s * aleteo, ny = dx * s * aleteo;
          ctx.moveTo(px[i] + wx + nx, py[i] + wy + ny);
          ctx.lineTo(px[i], py[i]);
          ctx.lineTo(px[i] + wx - nx, py[i] + wy - ny);
        }
        ctx.strokeStyle = TINTA;
        ctx.globalAlpha = pasada === 0 ? 0.6 : 0.95;
        ctx.lineWidth = pasada === 0 ? 0.9 : 1.25;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    medir();
    logo.addEventListener('load', () => { muestrear(); if (reduce) { asentar(); dibujar(0); } });
    let rT = 0;
    new ResizeObserver(() => { clearTimeout(rT); rT = setTimeout(() => { medir(); if (reduce) dibujar(0); }, 120); }).observe(box);
    if (reduce) { dibujar(0); return; }
    box.addEventListener('pointermove', (e) => {
      const r = cv.getBoundingClientRect();
      hx = e.clientX - r.left;
      hy = e.clientY - r.top;
    });
    box.addEventListener('pointerleave', () => { hx = -1e5; hy = -1e5; });
    // Un toque o clic espanta a la parvada desde ese punto
    box.addEventListener('pointerdown', (e) => {
      const r = cv.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      for (let i = 0; i < n; i++) {
        const ex = px[i] - x, ey = py[i] - y;
        const d = Math.hypot(ex, ey) + 1;
        const f = Math.max(0, 1 - d / (Math.min(w, h) * 0.5)) * 900;
        vx[i] += (ex / d) * f;
        vy[i] += (ey / d) * f;
      }
    });
    bucle(box, (now, dt) => dibujar(Math.min(0.05, dt / 1000)));
  }

  /* ─── Estela "panel táctil" del cursor ─────────────────────
     Con mouse, sobre lo que no es interactivo, las celdas hexagonales de un panel invisible se encienden un instante
     bajo el cursor y se apagan solas (un matiz, no un efecto grande); un clic manda un pulso corto de celdas, como al
     presionar un panel. Nunca sobre botones, enlaces, campos ni zonas con su propia interacción. */
  function estela() {
    if (reduce || !fino) return;
    const cv = document.createElement('canvas');
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    cv.className = 'estela';
    cv.setAttribute('aria-hidden', 'true');
    document.body.append(cv);
    const S = 11;          // radio de cada celda (px)
    const VIDA = 0.2;      // segundos que tarda una celda en apagarse (estela corta: un matiz, no distrae)
    const TRAMO = 24;      // al mover rápido, solo se encienden los últimos px del recorrido
    const R3 = Math.sqrt(3);
    const VECINOS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
    const IMPORTANTE = 'a, button, input, textarea, select, label, summary, [role="button"], [role="slider"], [role="tab"], [data-cursor], [data-magnetic], .header, .mbar, .menu, .compare, .chat, .tl, .form, .hero__title, .footer__giant';
    const PULSO = 0.45;    // el pulso del clic dura un poco más que la estela, para que se alcance a ver
    const celdas = new Map(); // "q,r" → { q, r, a: intensidad 0–1, t: retraso (s), v: vida (s) }
    let w = 0, h = 0, dpr = 1, raf = 0, antes = 0;
    let ult = null;
    const medir = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    };
    // Del punto en pantalla a su celda (hexágonos con punta arriba; redondeo cúbico)
    const aCelda = (x, y) => {
      const q = ((R3 / 3) * x - y / 3) / S;
      const r = ((2 / 3) * y) / S;
      const s = -q - r;
      let rq = Math.round(q), rr = Math.round(r);
      const rs = Math.round(s);
      const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
      if (dq > dr && dq > ds) rq = -rr - rs;
      else if (dr > ds) rr = -rq - rs;
      return [rq, rr];
    };
    const encender = (q, r, a, t = 0, v = VIDA) => {
      const k = `${q},${r}`;
      const c = celdas.get(k);
      if (c) { c.a = Math.max(c.a, a); c.t = Math.min(c.t, t); c.v = Math.max(c.v, v); } else celdas.set(k, { q, r, a, t, v });
    };
    const dibujar = (now) => {
      const dt = Math.min(0.05, (now - (antes || now)) / 1000);
      antes = now;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;
      for (const [k, c] of celdas) {
        if (c.t > 0) { c.t -= dt; continue; }
        c.a -= dt / c.v;
        if (c.a <= 0) { celdas.delete(k); continue; }
        const x = S * R3 * (c.q + c.r / 2);
        const y = S * 1.5 * c.r;
        const e = c.a * c.a; // se apaga suave
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const ang = (Math.PI / 180) * (60 * i - 30);
          const px = x + S * 0.86 * Math.cos(ang);
          const py = y + S * 0.86 * Math.sin(ang);
          if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(80,127,250,${(e * 0.18).toFixed(3)})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(80,127,250,${(e * 0.9).toFixed(3)})`;
        ctx.stroke();
      }
      raf = celdas.size ? requestAnimationFrame(dibujar) : 0;
      if (!raf) { antes = 0; ctx.clearRect(0, 0, w, h); }
    };
    const despertar = () => { if (!raf) raf = requestAnimationFrame(dibujar); };
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const p = [e.clientX, e.clientY];
      if (!e.target || !e.target.closest || e.target.closest(IMPORTANTE)) { ult = null; return; }
      // Celdas a lo largo del recorrido (cada ~8 px) para que la estela no salte; en la punta, un leve halo
      let desde = ult || p;
      const dist = Math.hypot(p[0] - desde[0], p[1] - desde[1]);
      if (dist > TRAMO) desde = [p[0] - ((p[0] - desde[0]) / dist) * TRAMO, p[1] - ((p[1] - desde[1]) / dist) * TRAMO];
      const pasos = Math.max(1, Math.ceil(Math.hypot(p[0] - desde[0], p[1] - desde[1]) / 8));
      for (let i = 1; i <= pasos; i++) {
        const [q, r] = aCelda(desde[0] + ((p[0] - desde[0]) * i) / pasos, desde[1] + ((p[1] - desde[1]) * i) / pasos);
        encender(q, r, 1);
      }
      const [q, r] = aCelda(p[0], p[1]);
      VECINOS.forEach(([dq, dr]) => encender(q + dq, r + dr, 0.12));
      ult = p;
      despertar();
    }, { passive: true });
    // Clic: pulso de dos anillos de celdas, como al presionar un panel
    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || !e.target.closest || e.target.closest(IMPORTANTE)) return;
      const [q, r] = aCelda(e.clientX, e.clientY);
      encender(q, r, 1, 0, PULSO);
      VECINOS.forEach(([dq, dr], i) => {
        const [eq, er] = VECINOS[(i + 1) % 6];
        encender(q + dq, r + dr, 0.75, 0.06, PULSO);
        encender(q + 2 * dq, r + 2 * dr, 0.45, 0.12, PULSO);
        encender(q + dq + eq, r + dr + er, 0.45, 0.12, PULSO);
      });
      despertar();
    });
    document.addEventListener('pointerleave', () => { ult = null; });
    window.addEventListener('resize', medir);
    medir();
  }

  document.querySelectorAll('[data-pistas]').forEach(pistas);
  document.querySelectorAll('[data-parvada]').forEach(parvada);
  estela();
})();
