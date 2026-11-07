/* ═══════════════════════════════════════════════════════════════
   ONA STUDIO — Escena de la portada (js/hero-escena.js)
   · Campo de señal: la misma trama de puntos del slogan, en un canvas detrás de todo. Desde el centro del slogan sale
     una onda cada pocos segundos —tu marca, encontrada—: a su paso los puntos crecen y se aclaran, y las letras del
     slogan vibran apenas (Halftone.onda). Con mouse, el cursor ilumina los puntos como una linterna.
     El lienzo solo dibuja mientras hay onda o cursor; entre ondas duerme y un temporizador programa la siguiente.
   · Tarjetas: se mueven en profundidad con el mouse (--px/--py en .hero__frags, con inercia).
   · Buscador: alguien busca uno de los servicios de ONA y aparece ONA Studio; en bucle solo mientras se ve.
   · TikTok: el video se descarga y corre solo si las tarjetas se ven (pantallas anchas) y la portada está en pantalla.
   · Fuera de pantalla o en otra pestaña, todo se detiene. Con movimiento reducido, todo queda quieto.
   · El destello de la onda sobre las letras (redibuja miles de puntos) solo va en equipos holgados (destello: true);
     en celulares y equipos modestos la señal corre solo en el fondo.
   Uso: const e = HeroEscena.mount({ hero, title, semitono, reduce, destello }); e.iniciar();
═══════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const V = 0.9;            // velocidad de la onda (px/ms): la misma de la onda del slogan, para que pasen juntas
  const PERIODO = 5200;     // una onda cada 5.2 s
  const BANDA = 74;         // grosor de la onda
  const LINTERNA = 190;     // radio de luz del cursor
  const NIVELES = 7;        // tamaños/tonos de punto (se dibujan por lotes: una llamada a fill por nivel)
  const CONSULTAS = ['desarrollo web', 'grabación de videos', 'estrategia de contenido', 'manejo de redes sociales', 'página web para mi negocio', 'edición de videos'];

  // Del azul claro de la marca al crema: cada nivel es un punto más grande y más claro
  const ESTILOS = Array.from({ length: NIVELES + 1 }, (_, k) => {
    const t = k / NIVELES;
    return `rgba(${Math.round(80 + 160 * t)},${Math.round(127 + 116 * t)},${Math.round(250 + 5 * t)},${(0.2 + 0.6 * t).toFixed(3)})`;
  });
  const RADIOS = Array.from({ length: NIVELES + 1 }, (_, k) => 0.95 + 2.15 * (k / NIVELES));

  function mount({ hero, title, semitono, reduce, destello = true }) {
    const cv = hero.querySelector('.hero__campo');
    const ctx = cv && cv.getContext('2d');
    const frags = hero.querySelector('.hero__frags');
    const busca = hero.querySelector('[data-hero-busca]');
    const tarjeta = busca && busca.closest('.frag');
    const fino = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const ancho = matchMedia('(min-width: 1260px) and (min-aspect-ratio: 7/5) and (min-height: 640px)'); // cuando se ven las tarjetas (igual que el CSS)
    const video = hero.querySelector('.tt__video');
    const tt = video && video.closest('.tt');
    // El video del TikTok: solo con tarjetas visibles, portada en pantalla y pestaña activa (sin descargarlo en celular)
    const videoAlDia = () => {
      if (!video) return;
      const debe = vivo && visible && ancho.matches && !document.hidden && !reduce;
      if (debe) {
        if (!video.src) video.src = video.dataset.src;
        const p = video.play();
        if (p && p.catch) p.catch(() => {});
      } else if (!video.paused) video.pause();
    };
    if (video) {
      video.addEventListener('playing', () => { tt.classList.remove('is-play'); void tt.offsetWidth; tt.classList.add('is-play'); });
      video.addEventListener('pause', () => tt.classList.remove('is-play'));
      ancho.addEventListener('change', () => videoAlDia());
    }

    let W = 0, H = 0, dpr = 1, cx = 0, cy = 0, maxR = 1, n = 0;
    let pts = new Float32Array(0);    // x, y, distancia al centro del slogan · por punto
    let nivel = new Uint8Array(0);
    let ondas = [];                   // inicio de cada onda viva (ms)
    let px = -1e5, py = -1e5, ultMov = 0;
    let raf = 0, visible = true, vivo = false, sigT = 0, nOndas = 0;
    let sucio = null;                 // zona pintada en el cuadro anterior: solo esa se borra

    /* ── Campo de señal ── */
    const medir = () => {
      if (!ctx) return;
      const b = hero.getBoundingClientRect();
      if (!b.width || !b.height) return;
      rHero = null;
      W = Math.round(b.width);
      H = Math.round(b.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      const t = title.getBoundingClientRect();
      cx = t.left - b.left + t.width / 2;
      cy = t.top - b.top + t.height / 2;
      const gap = W < 600 ? 21 : 26;
      const paso = gap * 0.866; // trama hexagonal: cada fila corrida medio punto
      // Los puntos en reposo son el fondo CSS del lienzo (misma trama, cero costo por cuadro); el lienzo solo pinta los
      // que se encienden con la onda o con el cursor
      const punto = `radial-gradient(circle at 50% 50%, ${ESTILOS[0]} 0 ${RADIOS[0]}px, rgba(80,127,250,0) ${RADIOS[0] + 0.7}px)`;
      cv.style.background = `${punto} ${-gap / 2}px ${gap / 2 - paso}px / ${gap}px ${paso * 2}px, ${punto} 0 ${gap / 2}px / ${gap}px ${paso * 2}px`;
      sucio = null;
      const tmp = [];
      for (let r = 0, y = gap / 2; y < H + gap; r++, y += paso) {
        for (let x = (r % 2 ? gap / 2 : 0); x < W + gap; x += gap) tmp.push(x, y, Math.hypot(x - cx, y - cy));
      }
      pts = new Float32Array(tmp);
      n = tmp.length / 3;
      nivel = new Uint8Array(n);
      maxR = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + BANDA * 2;
      dibujar(performance.now());
    };

    // Devuelve true si el siguiente cuadro todavía cambia (onda en curso o cursor recién movido)
    const dibujar = (now) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (sucio) ctx.clearRect(sucio[0], sucio[1], sucio[2] - sucio[0], sucio[3] - sucio[1]);
      ondas = ondas.filter((t0) => (now - t0) * V < maxR);
      const luz = px > -1e4;
      const L2 = LINTERNA * LINTERNA;
      for (let i = 0; i < n; i++) {
        const j = i * 3;
        const d = pts[j + 2];
        let s = 0;
        for (let o = 0; o < ondas.length; o++) {
          const e = now - ondas[o];
          if (e <= 0) continue;
          const rr = e * V;
          const q = (d - rr) / BANDA;
          if (q > -1.7 && q < 0.9) {
            // frente nítido y estela suave; se apaga al alejarse
            const k = q > 0 ? Math.exp(-((q * 2.4) ** 2)) : Math.exp(-((q * 0.85) ** 2));
            s += k * (1 - 0.7 * Math.min(1, rr / maxR));
          }
        }
        if (luz) {
          const dx = pts[j] - px;
          const dy = pts[j + 1] - py;
          const dd = dx * dx + dy * dy;
          if (dd < L2) { const f = 1 - Math.sqrt(dd) / LINTERNA; s += f * f * 0.9; }
        }
        nivel[i] = s > 0.09 ? Math.min(NIVELES, Math.ceil(s * NIVELES)) : 0;
      }
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (let k = 1; k <= NIVELES; k++) {
        const r = RADIOS[k];
        let alguno = false;
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          if (nivel[i] !== k) continue;
          const j = i * 3;
          const x = pts[j], y = pts[j + 1];
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, TAU);
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
          alguno = true;
        }
        if (alguno) { ctx.fillStyle = ESTILOS[k]; ctx.fill(); }
      }
      const m = RADIOS[NIVELES] + 2;
      sucio = x1 >= x0 ? [x0 - m, y0 - m, x1 + m, y1 + m] : null;
      return ondas.length > 0 || (luz && now - ultMov < 700);
    };

    const loop = (now) => {
      raf = 0;
      if (!visible || !ctx) return;
      if (dibujar(now)) raf = requestAnimationFrame(loop);
    };
    const despertar = () => { if (!raf && visible && ctx) raf = requestAnimationFrame(loop); };

    const onda = () => {
      clearTimeout(sigT);
      if (!vivo || reduce || !visible || document.hidden) return;
      ondas.push(performance.now());
      if (destello && semitono && semitono.onda && nOndas++ > 0) semitono.onda(0.5); // la primera sale mientras el slogan se arma
      despertar();
      sigT = setTimeout(onda, PERIODO);
    };

    /* ── Texto de ONA: ya escrito (.is-listo), las palabras cerca del cursor se encienden y suben apenas (lupa de luz) ── */
    const sub = hero.querySelector('[data-hero-sub]');
    let palabras = [], centros = null, lraf = 0, lx = -1e5, ly = -1e5;
    const medirPalabras = () => {
      palabras = [...sub.querySelectorAll('.w > i')];
      const b = sub.getBoundingClientRect();
      centros = palabras.map((el) => { const r = el.getBoundingClientRect(); return [r.left - b.left + r.width / 2, r.top - b.top + r.height / 2]; });
    };
    const lente = () => {
      lraf = 0;
      if (!sub || !sub.classList.contains('is-listo')) return;
      if (!centros) medirPalabras();
      if (!rSub) rSub = sub.getBoundingClientRect();
      const x = lx - rSub.left, y = ly - rSub.top;
      for (let k = 0; k < palabras.length; k++) {
        const dx = (centros[k][0] - x) / 150, dy = (centros[k][1] - y) / 56; // lente ovalada: más ancha que alta
        const q = 1 - Math.sqrt(dx * dx + dy * dy);
        const v = q > 0.05 ? (q * q).toFixed(2) : '';
        if ((palabras[k].dataset.p || '') === v) continue;
        palabras[k].dataset.p = v;
        if (v) palabras[k].style.setProperty('--p', v); else palabras[k].style.removeProperty('--p');
      }
    };

    // Posiciones de la portada y del texto: se miden una vez y se guardan hasta el siguiente scroll o cambio de tamaño
    let rHero = null, rSub = null;
    const olvidar = () => { rHero = null; rSub = null; };
    window.addEventListener('scroll', olvidar, { passive: true });
    window.addEventListener('resize', olvidar, { passive: true });

    /* ── Tarjetas en profundidad ── */
    let tx = 0, ty = 0, ax = 0, ay = 0, praf = 0;
    // El movimiento se escribe en el transform de cada tarjeta (no en una variable heredada: esa obligaría a recalcular
    // el estilo de todo lo que hay dentro de las tarjetas en cada cuadro)
    let piezas = null;
    const inercia = () => {
      praf = 0;
      ax += (tx - ax) * 0.075;
      ay += (ty - ay) * 0.075;
      if (!piezas) piezas = [...frags.querySelectorAll('.frag')].map((f) => { const cs = getComputedStyle(f); return [f, parseFloat(cs.getPropertyValue('--d')) || 1, cs.getPropertyValue('--r').trim() || '0deg']; });
      for (const [f, d, r] of piezas) f.style.transform = `translate3d(${(ax * d * 22).toFixed(2)}px, ${(ay * d * 14).toFixed(2)}px, 0) rotate(${r})`;
      if (Math.abs(tx - ax) + Math.abs(ty - ay) > 0.002) praf = requestAnimationFrame(inercia);
    };

    if (fino && !reduce) {
      hero.addEventListener('pointermove', (e) => {
        if (!rHero) rHero = hero.getBoundingClientRect();
        px = e.clientX - rHero.left;
        py = e.clientY - rHero.top;
        ultMov = performance.now();
        despertar();
        lx = e.clientX; ly = e.clientY;
        if (sub && !lraf) lraf = requestAnimationFrame(lente);
        if (frags && ancho.matches) {
          tx = (e.clientX / innerWidth - 0.5) * 2;
          ty = (e.clientY / innerHeight - 0.5) * 2;
          if (!praf) praf = requestAnimationFrame(inercia);
        }
      }, { passive: true });
      hero.addEventListener('pointerleave', () => {
        px = -1e5; py = -1e5; ultMov = performance.now();
        despertar();
        lx = -1e5; ly = -1e5;
        if (sub && !lraf) lraf = requestAnimationFrame(lente);
        tx = 0; ty = 0;
        if (frags && !praf) praf = requestAnimationFrame(inercia);
      });
    }

    /* ── Buscador: escribe, encuentra tu marca, borra y sigue ── */
    const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));
    let buscando = false, qi = 0;
    const ciclo = async () => {
      if (buscando || !busca) return;
      buscando = true;
      while (vivo) {
        if (!visible || !ancho.matches || document.hidden) { await esperar(700); continue; }
        tarjeta.classList.remove('is-hallada');
        for (let k = busca.textContent.length - 1; k >= 0; k--) { busca.textContent = busca.textContent.slice(0, k); await esperar(24); }
        await esperar(380);
        const q = CONSULTAS[qi++ % CONSULTAS.length];
        for (let k = 1; k <= q.length; k++) { busca.textContent = q.slice(0, k); await esperar(52 + Math.random() * 64); }
        await esperar(420);
        tarjeta.classList.add('is-hallada');
        await esperar(3400);
      }
      buscando = false;
    };

    /* ── Medidas, visibilidad y pestaña ── */
    let rT = 0;
    new ResizeObserver(() => { clearTimeout(rT); centros = null; olvidar(); rT = setTimeout(medir, 120); }).observe(hero);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(medir); // el slogan cambia de alto con Anton
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      videoAlDia();
      if (!visible) { cancelAnimationFrame(raf); raf = 0; clearTimeout(sigT); return; }
      despertar();
      clearTimeout(sigT);
      if (vivo && !reduce) sigT = setTimeout(onda, 900);
    }).observe(hero);
    document.addEventListener('visibilitychange', () => {
      videoAlDia();
      clearTimeout(sigT);
      if (!document.hidden && vivo && visible && !reduce) sigT = setTimeout(onda, 900);
    });
    medir();

    return {
      // Al terminar la pantalla de carga: primera onda con el slogan armándose y el buscador en marcha
      iniciar() {
        if (vivo) return;
        vivo = true;
        if (reduce) { if (tarjeta) tarjeta.classList.add('is-hallada'); return; }
        medir();
        sigT = setTimeout(onda, 260);
        setTimeout(ciclo, 2900);
        setTimeout(videoAlDia, 1700); // entra con las tarjetas
      },
    };
  }

  window.HeroEscena = { mount };
})();
