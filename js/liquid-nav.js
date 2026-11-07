/* ═══════════════════════════════════════════════════════════════
   ONA STUDIO — Menú líquido (js/liquid-nav.js), con una cápsula de luz "high tech" en lugar de la gota de agua
   Adaptación a JavaScript sin dependencias de "Nimbus UI · Liquid Navbar — Waterline" (por guglielmogiannattasio.it),
   que originalmente es un componente de React. El sitio no usa React: aquí se conserva su lógica (física de la gota,
   gotitas al partirse, ondas, menisco del cursor y shader de agua) sobre el menú que ya existe en el HTML.

   · Hay dos: en el header (pantallas amplias, con texto) y en la barra inferior del celular (solo íconos, data-compact).
   · La gota sigue a la sección activa (aria-current="true", que pone js/main.js al hacer scroll). En el hero no hay
     sección activa y la gota se evapora; al llegar a una sección se condensa con una onda.
   · Al hacer clic, la gota viaja directo a la sección elegida (ignora las secciones que cruza el scroll) y el ícono
     hace su pequeña escena (data-nv-fx en cada enlace: pop, glow, spin, drop, wave).
   · El agua es un shader WebGL diminuto, solo dentro de la píldora. Se detiene en reposo, fuera de pantalla o con la
     pestaña oculta. Sin WebGL, una gota de CSS. Con movimiento reducido, la gota salta sin animarse.
═══════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const PAD = 14;            // margen del lienzo alrededor de la píldora (sombras y ondas)
  const REPOSO_MS = 2500;    // tras este tiempo sin actividad el agua se queda quieta (ahorra batería)
  const BLOQUEO_CLIC_MS = 1700; // tras un clic, la gota no sigue al scroll mientras viaja a la sección

  /* ─── Shader "high tech" ───
     La física es la del original (cabeza y cola con resortes, piezas que se desprenden, ondas), pero se dibuja como una
     cápsula de luz: vidrio oscuro con líneas de escaneo y retícula de puntos, borde de neón nítido con resplandor, un
     barrido de luz que la cruza, "bits" cuadrados en lugar de gotitas y pulsos en anillo en lugar de ondas de agua. */
  const VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  const FRAG = `precision highp float;
uniform vec2 uRes;uniform float uDpr;uniform float uTime;uniform vec4 uPill;
uniform vec4 uBlob[6];uniform float uSy[6];uniform vec4 uRip[6];uniform vec3 uMouse;uniform float uDark;uniform float uAmb;
float sdRB(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float sdChip(vec2 p,vec4 B,float sy){p-=B.xy;p.y/=sy;return sdRB(p,vec2(B.z+B.w,B.w),B.w*.5)*min(1.,sy);}
float sdBit(vec2 p,vec4 B){p-=B.xy;vec2 q=abs(p)-vec2(B.w*.6);return length(max(q,0.))+min(max(q.x,q.y),0.);}
float chipD(vec2 p){float d=1e4;for(int i=0;i<2;i++){if(uBlob[i].w>.5){d=smin(d,sdChip(p,uBlob[i],uSy[i]),4.);}}return d;}
float bitD(vec2 p){float d=1e4;for(int i=2;i<6;i++){if(uBlob[i].w>.5){d=min(d,sdBit(p,uBlob[i]));}}return d;}
float pillD(vec2 p){vec2 h=uPill.zw*.5;return sdRB(p-uPill.xy-h,h,h.y);}
vec4 sobre(vec3 c,float a,vec4 d){return vec4(c*a,a)+d*(1.-a);}
void main(){
 vec2 p=vec2(gl_FragCoord.x,uRes.y*uDpr-gl_FragCoord.y)/uDpr;
 float clip=smoothstep(1.,-1.,pillD(p));
 float dc=chipD(p);float db=bitD(p);
 vec3 neon=vec3(.3,.56,1.);vec3 hielo=vec3(.76,.88,1.);
 vec4 col=vec4(0.);
 float glow=exp(-max(dc,0.)*.2)*.34*clip;
 col=sobre(neon,glow,col);
 float dentro=smoothstep(.7,-.7,dc)*clip;
 float lin=.5+.5*sin(p.y*2.2);
 vec2 g=fract(p/5.);float pun=step(.8,g.x)*step(.8,g.y);
 float cx=uPill.x-80.+mod(uTime*110.,uPill.z+160.);
 float barrido=exp(-pow((p.x-cx+(p.y-uPill.y)*.5)/9.,2.))*uAmb;
 vec3 cuerpo=vec3(.02,.06,.3)+neon*(.2+lin*.07+pun*.22)+hielo*barrido*.6;
 col=sobre(cuerpo,dentro*.8,col);
 float borde=exp(-abs(dc)*1.5)*clip;
 col=sobre(mix(neon,vec3(1.),.6),borde,col);
 float bit=smoothstep(.6,-.6,db)*clip;
 col=sobre(hielo,bit,col);
 for(int i=0;i<6;i++){vec4 R=uRip[i];if(R.w>0.){float x=length(p-R.xy)-R.z*150.;float an=clamp(R.w*exp(-R.z*2.4)*exp(-x*x/3.)*clip*.8,0.,1.);col=sobre(hielo,an,col);}}
 vec2 m=p-uMouse.xy;float mm=uMouse.z*exp(-dot(m,m)/600.)*.16*clip;
 col=sobre(neon,mm,col);
 gl_FragColor=col;
}`;

  const initGL = (canvas) => {
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) return null;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const vs = sh(gl.VERTEX_SHADER, VERT);
    const fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
    gl.useProgram(p);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(p, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = {};
    ['uRes', 'uDpr', 'uTime', 'uPill', 'uBlob', 'uSy', 'uRip', 'uMouse', 'uDark', 'uAmb'].forEach((n) => { u[n] = gl.getUniformLocation(p, n); });
    return { gl, u };
  };

  // Refracción del vidrio (filtro SVG en backdrop-filter): solo los navegadores Chromium la soportan
  const soportaRefraccion = () => {
    const ua = navigator.userAgent;
    return /Chrome\/|Chromium\/|Edg\//.test(ua) && !/Firefox\//.test(ua) && !!(window.CSS && CSS.supports && CSS.supports('backdrop-filter', 'url(#a)'));
  };

  // Cada menú líquido es independiente: su píldora, su lienzo y su gota
  const crear = (nav) => {
    /* ─── Estado ─── */
    const canvas = nav.querySelector('.nimbus-water');
    const drop = nav.querySelector('.nimbus-drop');
    const items = [...nav.querySelectorAll('.nimbus-item')];
    const icons = items.map((a) => a.querySelector('.nv-ico'));
    const DARK = nav.dataset.tone === 'dark' ? 1 : 0;
    const s = {
      a: { x: 0, v: 0 }, b: { x: 0, v: 0 }, sy: { s: 1, v: 0 }, lead: 0, lagFrom: 0,
      sats: [], rips: [], t: { x: 0, cy: 0, q: 0, r: 21 }, q: 0,
      mouse: { x: 0, y: 0, s: 0, on: false },
      show: 0, showT: 0, // la gota existe solo con una sección activa
      moving: false, split: false, ready: false, w: 0, h: 0,
      visible: true, reduce: false, raf: 0, last: 0, time: 0, activo: 0, glc: null,
    };
    let current = -1;
    let lockUntil = 0;
    let playing = -1;

    /* ─── Dibujo ─── */
    const draw = () => {
      const T = s.t;
      const sep = Math.abs(s.a.x - s.b.x);
      const thin = Math.min(sep / (2 * (s.q + T.r) || 1), 1);
      const r = T.r * (1 - 0.3 * thin);
      const v = s.show;
      if (s.glc) {
        const { gl, u } = s.glc;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.uniform2f(u.uRes, s.w + PAD * 2, s.h + PAD * 2);
        gl.uniform1f(u.uDpr, dpr);
        gl.uniform1f(u.uTime, s.time);
        gl.uniform4f(u.uPill, PAD, PAD, s.w, s.h);
        const blobs = new Float32Array(24);
        const sy = new Float32Array(6).fill(1);
        const head = s.lead === 0 ? s.a : s.b;
        const tail = s.lead === 0 ? s.b : s.a;
        blobs.set([head.x, T.cy, s.q * (1 - 0.25 * thin) * v, T.r * (1 - 0.12 * thin) * v, tail.x, T.cy, s.q * (1 - 0.8 * thin) * v, T.r * (1 - 0.5 * thin) * v], 0);
        sy[0] = sy[1] = s.sy.s;
        s.sats.slice(0, 4).forEach((d, i) => blobs.set([d.x, d.y, 0, d.r * v], 8 + i * 4));
        gl.uniform4fv(u.uBlob, blobs);
        gl.uniform1fv(u.uSy, sy);
        const rips = new Float32Array(24);
        s.rips.slice(-6).forEach((p, i) => rips.set([p.x, p.y, p.age, p.amp], i * 4));
        gl.uniform4fv(u.uRip, rips);
        gl.uniform3f(u.uMouse, s.mouse.x, s.mouse.y, s.mouse.s);
        gl.uniform1f(u.uDark, DARK);
        gl.uniform1f(u.uAmb, s.reduce ? 0 : 1);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      } else if (drop) {
        const left = Math.min(s.a.x, s.b.x) - s.q - r - PAD;
        drop.style.width = `${sep + 2 * (s.q + r)}px`;
        drop.style.transform = `translateX(${left}px) scaleY(${s.sy.s})`;
        drop.style.opacity = v.toFixed(3);
      }
    };

    /* ─── Física (resortes de la gota, gotitas que se desprenden y ondas) ─── */
    const step = (dt, now) => {
      const T = s.t;
      s.time += dt;
      s.q += (T.q - s.q) * Math.min(1, dt * 12);
      s.show += (s.showT - s.show) * Math.min(1, dt * 7);
      const bodies = [s.a, s.b];
      let still = true;
      if (s.reduce) {
        s.a.x = s.b.x = T.x; s.a.v = s.b.v = 0; s.sy.s = 1; s.sats = []; s.show = s.showT;
      } else {
        bodies.forEach((B, i) => {
          const lead = i === s.lead;
          const k = lead ? 210 : 72;
          const c = lead ? 25 : 13;
          const f = !lead && now < s.lagFrom ? 0.08 : 1;
          B.v += (k * (T.x - B.x) - c * B.v) * dt * f;
          B.x += B.v * dt;
          const lo = PAD + 6 + s.q + T.r - 3;
          const hi = PAD + s.w - 6 - s.q - T.r + 3;
          if (B.x < lo || B.x > hi) {
            s.sy.v -= Math.min(Math.abs(B.v), 900) * 0.0016;
            B.x = Math.max(lo, Math.min(hi, B.x));
            B.v *= -0.25;
          }
          if (Math.abs(T.x - B.x) > 0.3 || Math.abs(B.v) > 3) still = false;
        });
        const L = bodies[s.lead];
        const syT = 1 - 0.2 * Math.min(Math.abs(L.v) / 1500, 1);
        s.sy.v += (280 * (syT - s.sy.s) - 9 * s.sy.v) * dt;
        s.sy.s += s.sy.v * dt;
        if (Math.abs(s.sy.s - 1) > 0.002 || Math.abs(s.sy.v) > 0.02) still = false;
        // Se rompe el cuello: gotitas entre la cabeza y la cola
        const sep = Math.abs(s.a.x - s.b.x);
        const r = T.r * (1 - 0.3 * Math.min(sep / (2 * (T.q + T.r) || 1), 1));
        if (!s.split && s.moving && sep - 2 * T.q - 2 * r > -6) {
          s.split = true;
          const lo = bodies[1 - s.lead];
          const hi = bodies[s.lead];
          [0.3, 0.5, 0.72].forEach((t, j) => {
            s.sats.push({
              x: lo.x + (hi.x - lo.x) * t + (Math.random() - 0.5) * 6,
              y: T.cy + (Math.random() - 0.5) * 10,
              vx: (lo.v + hi.v) * 0.45,
              vy: (Math.random() - 0.5) * 60,
              r: 5 + Math.random() * 3 - j * 0.5,
              k: 70 + Math.random() * 90,
            });
          });
        }
        s.sats = s.sats.filter((d) => {
          d.vx += (d.k * (T.x - d.x) - 9 * d.vx) * dt;
          d.vy += (90 * (T.cy - d.y) - 7 * d.vy) * dt;
          d.x += d.vx * dt;
          d.y += d.vy * dt;
          d.x = Math.max(PAD + 8 + d.r, Math.min(PAD + s.w - 8 - d.r, d.x));
          d.y = Math.max(T.cy - T.r + d.r, Math.min(T.cy + T.r - d.r, d.y));
          if (Math.abs(T.x - d.x) < T.q + T.r * 0.5 || s.showT === 0) d.r -= dt * 26;
          return d.r > 0.6;
        });
        if (s.sats.length) still = false;
      }
      if (s.moving && still) {
        s.moving = false;
        s.rips.push({ x: T.x, y: T.cy, age: 0, amp: s.split ? 1.2 : 0.7 });
      }
      s.rips.forEach((p) => { p.age += dt; });
      s.rips = s.rips.filter((p) => p.age < 2.4);
      s.mouse.s += ((s.mouse.on ? 1 : 0) - s.mouse.s) * Math.min(1, dt * 7);
    };

    const loop = () => {
      s.activo = performance.now();
      if (s.raf) return;
      s.last = performance.now();
      const tick = (now) => {
        const dt = Math.min((now - s.last) / 1000, 1 / 30);
        s.last = now;
        step(dt, now);
        draw();
        const busy = s.moving || s.rips.length || s.sats.length || s.mouse.on || s.mouse.s > 0.01 || Math.abs(s.showT - s.show) > 0.004;
        if (busy) s.activo = now;
        // El agua ondula sola mientras hay actividad y un rato después; luego se queda quieta
        const seguir = s.visible && (s.reduce ? busy : now - s.activo < REPOSO_MS);
        s.raf = seguir ? requestAnimationFrame(tick) : 0;
      };
      s.raf = requestAnimationFrame(tick);
    };

    /* ─── Medidas y sección activa ─── */
    const local = (x, y) => {
      const r = nav.getBoundingClientRect();
      return { x: x - r.left + PAD, y: y - r.top + PAD };
    };
    const ripple = (x, y, amp) => {
      if (s.reduce) return;
      s.rips.push({ x, y, age: 0, amp });
      loop();
    };

    const measure = () => {
      s.w = nav.offsetWidth;
      s.h = nav.offsetHeight;
      if (canvas) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const W = s.w + PAD * 2;
        const Hh = s.h + PAD * 2;
        if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(Hh * dpr)) {
          canvas.width = Math.round(W * dpr);
          canvas.height = Math.round(Hh * dpr);
          canvas.style.width = `${W}px`;
          canvas.style.height = `${Hh}px`;
        }
      }
      const el = items[current];
      if (!el || !s.w) { s.showT = 0; loop(); return; }
      const T = s.t;
      T.r = el.offsetHeight / 2;
      T.q = Math.max(0, el.offsetWidth / 2 - T.r);
      T.cy = PAD + el.offsetTop + el.offsetHeight / 2;
      const nx = PAD + el.offsetLeft + el.offsetWidth / 2;
      if (!s.ready || s.show < 0.05) {
        // Sin gota visible: se condensa directo en la sección (con una onda), sin viajar desde la anterior
        const condensa = s.ready && s.showT === 0;
        s.a.x = s.b.x = nx; s.a.v = s.b.v = 0; s.q = T.q; s.ready = true;
        if (condensa) ripple(nx, T.cy, 0.9);
      } else if (Math.abs(nx - T.x) > 0.5) {
        s.lead = Math.abs(nx - s.a.x) <= Math.abs(nx - s.b.x) ? 0 : 1;
        s.lagFrom = performance.now() + 70;
        s.moving = true;
        s.split = false;
      }
      T.x = nx;
      s.showT = 1;
      loop();
    };

    const seccionActiva = () => items.findIndex((a) => a.getAttribute('aria-current') === 'true');
    const sincronizar = () => {
      if (performance.now() < lockUntil) return;
      const i = seccionActiva();
      if (i !== current) { current = i; measure(); }
    };
    new MutationObserver(sincronizar).observe(nav, { attributes: true, attributeFilter: ['aria-current'], subtree: true });

    /* ─── Escenas de los íconos ─── */
    const playFx = (i) => {
      const ico = icons[i];
      const kind = items[i].dataset.nvFx || 'pop';
      if (!ico || kind === 'none') return;
      if (playing > -1 && icons[playing]) icons[playing].removeAttribute('data-fx');
      ico.removeAttribute('data-fx');
      void ico.offsetWidth; // reinicia la animación aunque sea el mismo ícono
      ico.setAttribute('data-fx', kind);
      playing = i;
      const b = ico.getBoundingClientRect();
      const c = local(b.left + b.width / 2, b.top + b.height / 2);
      if (kind === 'drop') setTimeout(() => ripple(c.x, s.t.cy, 1.4), 430);
    };

    /* ─── Interacción ─── */
    items.forEach((a, i) => a.addEventListener('click', () => {
      playFx(i);
      // La gota viaja directo a la sección elegida mientras el scroll suave cruza las demás
      lockUntil = performance.now() + BLOQUEO_CLIC_MS;
      current = i;
      measure();
      setTimeout(() => { lockUntil = 0; sincronizar(); }, BLOQUEO_CLIC_MS + 50);
    }));
    // Flechas izquierda/derecha: el foco recorre el menú
    nav.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const i = items.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      items[(i + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length].focus();
    });
    nav.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const p = local(e.clientX, e.clientY);
      s.mouse.x = p.x;
      s.mouse.y = p.y;
      s.mouse.on = true;
      loop();
    });
    nav.addEventListener('pointerleave', () => { s.mouse.on = false; loop(); });
    nav.addEventListener('pointerdown', (e) => { const p = local(e.clientX, e.clientY); ripple(p.x, p.y, 0.8); });

    /* ─── Arranque ─── */
    if (soportaRefraccion()) nav.dataset.refract = 'on';
    s.reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    s.glc = canvas ? initGL(canvas) : null;
    nav.dataset.gl = s.glc ? 'on' : 'off';
    if (canvas) canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); s.glc = null; nav.dataset.gl = 'off'; draw(); });
    new IntersectionObserver(([e]) => { s.visible = e.isIntersecting; if (s.visible) loop(); }).observe(nav);
    document.addEventListener('visibilitychange', () => { s.visible = document.visibilityState === 'visible'; if (s.visible) loop(); });
    // Cada menú se ve en un tamaño de pantalla distinto: se vuelve a medir cuando cambia su ancho o cargan las fuentes
    let lastW = -1;
    new ResizeObserver(() => {
      if (nav.offsetWidth !== lastW) { lastW = nav.offsetWidth; s.ready = false; measure(); }
    }).observe(nav);
    if (document.fonts) document.fonts.ready.then(() => { s.ready = false; measure(); });
    current = seccionActiva();
    measure();
  };

  document.querySelectorAll('[data-liquid-nav]').forEach(crear);
})();
