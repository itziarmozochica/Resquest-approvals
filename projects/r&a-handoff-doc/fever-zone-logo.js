/*!
 * Fever Zone — animated logo
 *
 *   <fever-zone-logo>        lines → outline → fill + ripple → static grey logo
 *   <fever-zone-overscroll>  vertical elastic overscroll that reveals the logo and drives it
 *
 * One file, no dependencies. Works in plain HTML, Angular, React and Vue.
 *   <script src="fever-zone-logo.js"></script>
 *
 * Source: Figma steps 1–4 (assets/fever-zone-animation-step-*.svg).
 */
(() => {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Geometry                                                            */
  /* ------------------------------------------------------------------ */

  // viewBox 0 0 133 28, left to right: f e v e r Z O N E
  const LETTERS = [
    { d: 'M5.70126 12.4967L5.69898 13.3068H9.14161C9.83254 13.3068 10.393 13.8695 10.393 14.5633V16.8922C10.393 17.5859 9.83254 18.1486 9.14161 18.1486H5.69898V25.8588C5.69898 26.5529 5.13856 27.1153 4.44762 27.1153H1.25136C0.560102 27.1153 0 26.5529 0 25.8588V12.4265H0.00227816C0.0341724 6.05409 4.31158 0.788138 9.81888 0.0120522C10.5648 -0.0931687 11.2274 0.504499 11.2274 1.26098V4.697C11.2274 5.29368 10.8066 5.79594 10.2267 5.92468C7.6556 6.49588 5.70126 9.22542 5.70126 12.4967Z' }, // f
    { d: 'M32.7367 22.9683C33.4465 23.6682 33.3819 24.8204 32.6012 25.4428C30.5223 27.1006 27.7393 28.0001 25.0149 28.0001C18.5131 28.0001 13.6255 23.5782 13.6255 16.8575C13.6255 10.8875 17.7507 5.66992 24.2079 5.66992C30.2164 5.66992 34.4764 10.6665 34.4764 16.6359C34.4764 16.7807 34.4734 16.9258 34.4678 17.0695C34.4412 17.7432 33.8719 18.272 33.1881 18.272H19.2754C19.5893 21.2787 22.0554 23.3573 25.1497 23.3573C26.911 23.3573 28.4211 22.6578 29.516 21.8551C30.1991 21.3548 31.1428 21.3965 31.7447 21.9901L32.7367 22.9683ZM28.3077 14.2261C28.1282 12.3248 26.3795 10.4674 24.003 10.4674C21.5815 10.4674 19.6084 12.2805 19.3395 14.2261H28.3077Z', evenodd: true }, // e
    { d: 'M51.0988 6.41778L45.511 18.8117L39.9235 6.41778C39.7182 5.96294 39.2641 5.66992 38.7634 5.66992H35.5568C34.6294 5.66992 34.014 6.62741 34.4016 7.4669L43.1659 26.4646C43.3736 26.9142 43.8247 27.2026 44.3214 27.2026H46.7006C47.1973 27.2026 47.6488 26.9142 47.8561 26.4646L56.6208 7.4669C57.0081 6.62741 56.3926 5.66992 55.4653 5.66992H52.2586C51.7579 5.66992 51.3039 5.96294 51.0988 6.41778Z' }, // v
    { d: 'M76.5608 23.2739C77.0807 23.7864 77.0589 24.6261 76.5119 25.11C74.3984 26.9798 71.4302 28.0001 68.5293 28.0001C62.0272 28.0001 57.1396 23.5782 57.1396 16.8575C57.1396 10.8875 61.2649 5.66992 67.722 5.66992C73.7308 5.66992 77.9907 10.6665 77.9907 16.6359C77.9907 16.7807 77.9877 16.9258 77.982 17.0692C77.9554 17.7432 77.3861 18.272 76.7023 18.272H62.7896C63.1035 21.2787 65.57 23.3573 68.6639 23.3573C70.583 23.3573 72.2031 22.5271 73.3137 21.6381C73.8157 21.2363 74.5485 21.2892 75.0056 21.7402L76.5608 23.2739ZM71.8218 14.2261C71.6423 12.3248 69.8936 10.4674 67.5171 10.4674C65.0956 10.4674 63.1229 12.2805 62.8536 14.2261H71.8218Z', evenodd: true }, // e
    { d: 'M79.9984 16.4014H79.9956V25.8617C79.9956 26.5604 80.5792 27.1271 81.2991 27.1271H84.5997C85.3301 27.1271 85.9178 26.5442 85.9028 25.8353L85.7022 16.4014C85.749 13.4027 87.6574 10.9096 90.1714 10.3577C90.7788 10.2244 91.2231 9.72212 91.2231 9.11752V6.06722C91.2231 5.2997 90.5239 4.70103 89.7417 4.80964C84.2829 5.56958 80.0509 10.4699 79.9984 16.4014Z' }, // r
    { d: 'M94.7227 27.8809V26.8477L100.104 20.2927L100.282 20.8746H94.806V19.5684H101.675V20.6015L96.294 27.1565L96.1036 26.5746H101.83V27.8809H94.7227Z' }, // Z
    { d: 'M108.249 27.9992C107.598 27.9992 106.999 27.8923 106.452 27.6786C105.904 27.4648 105.428 27.168 105.023 26.788C104.618 26.4001 104.305 25.9488 104.083 25.4342C103.861 24.9117 103.749 24.3417 103.749 23.7242C103.749 23.1067 103.861 22.5407 104.083 22.0261C104.305 21.5036 104.618 21.0523 105.023 20.6723C105.428 20.2844 105.904 19.9836 106.452 19.7698C106.999 19.5561 107.594 19.4492 108.237 19.4492C108.888 19.4492 109.483 19.5561 110.023 19.7698C110.57 19.9836 111.047 20.2844 111.451 20.6723C111.856 21.0523 112.17 21.5036 112.392 22.0261C112.614 22.5407 112.725 23.1067 112.725 23.7242C112.725 24.3417 112.614 24.9117 112.392 25.4342C112.17 25.9567 111.856 26.408 111.451 26.788C111.047 27.168 110.57 27.4648 110.023 27.6786C109.483 27.8923 108.892 27.9992 108.249 27.9992ZM108.237 26.6455C108.658 26.6455 109.047 26.5742 109.404 26.4317C109.761 26.2892 110.071 26.0873 110.332 25.8261C110.594 25.5569 110.797 25.2482 110.94 24.8998C111.09 24.5436 111.166 24.1517 111.166 23.7242C111.166 23.2967 111.09 22.9088 110.94 22.5605C110.797 22.2042 110.594 21.8955 110.332 21.6342C110.071 21.3651 109.761 21.1592 109.404 21.0167C109.047 20.8742 108.658 20.803 108.237 20.803C107.817 20.803 107.428 20.8742 107.071 21.0167C106.721 21.1592 106.412 21.3651 106.142 21.6342C105.88 21.8955 105.674 22.2042 105.523 22.5605C105.38 22.9088 105.309 23.2967 105.309 23.7242C105.309 24.1438 105.38 24.5317 105.523 24.888C105.674 25.2442 105.88 25.5569 106.142 25.8261C106.404 26.0873 106.714 26.2892 107.071 26.4317C107.428 26.5742 107.817 26.6455 108.237 26.6455Z' }, // O
    { d: 'M115.556 27.8809V19.5684H116.83L122.056 25.969H121.425V19.5684H122.96V27.8809H121.686L116.461 21.4802H117.092V27.8809H115.556Z' }, // N
    { d: 'M127.812 23.024H131.955V24.2946H127.812V23.024ZM127.931 26.5865H132.633V27.8809H126.383V19.5684H132.466V20.8627H127.931V26.5865Z' }, // E
  ];

  // Outline length of each letter, in viewBox units (measured with getTotalLength).
  const LENGTHS = [75.4, 117.8, 88.7, 118.2, 57.9, 48, 46.2, 52.8, 49];

  // Step 3: three discs behind the logo, in viewBox units.
  const RIPPLE = { cx: 58, cy: 14, discs: [{ r: 52, o: 0.04 }, { r: 33, o: 0.07 }, { r: 18, o: 0.07 }] };

  // Each outline is drawn as several short lines that grow until they meet (step 1).
  const SEGMENTS = LENGTHS.map((len) => Math.max(2, Math.round(len / 24)));

  /* ------------------------------------------------------------------ */
  /* Timeline (ms at 1x)                                                 */
  /* ------------------------------------------------------------------ */

  const DRAW = LETTERS.map((_, i) => (i < 5 ? [i * 70, 650] : [420 + (i - 5) * 60, 480]));
  const LINES_END = Math.max(...DRAW.map(([start, dur]) => start + dur)); // step 2
  const FILL = LETTERS.map((_, i) => [LINES_END + 120 + i * 25, 260]);
  const RIPPLE_GROW = 560; // outer disc; smaller discs start later at the same speed
  const RIPPLE_PEAK = FILL[0][0] + 100 + RIPPLE_GROW; // step 3
  const RIPPLE_FADE = 500;
  const END = RIPPLE_PEAK + RIPPLE_FADE; // step 4

  /* ------------------------------------------------------------------ */
  /* Sizes                                                               */
  /* ------------------------------------------------------------------ */

  // Presets by logo height in px; md is the Figma size (133 × 28).
  const SIZES = { xs: 16, sm: 20, md: 28, lg: 36, xl: 48, '2xl': 64 };
  const DESKTOP_MIN_WIDTH = 768; // second value of size="sm lg" applies from here up

  // 'lg' → 171, '200' → 200 (a number is a width in px), anything else → null
  const sizeToWidth = (token) => {
    if (!token) return null;
    if (Object.prototype.hasOwnProperty.call(SIZES, token)) return (SIZES[token] * 133) / 28;
    const px = parseFloat(token);
    if (px > 0 && /^\d+(\.\d+)?(px)?$/.test(token)) return px;
    console.warn(`[fever-zone] Unknown size "${token}". Use ${Object.keys(SIZES).join(', ')} or a width in px.`);
    return null;
  };

  // Applies size="md" or size="sm lg" (phone / desktop) to an element through private custom properties,
  // so a plain CSS width set by the page still wins.
  const applySize = (el, value) => {
    const [phone, desktop] = (value || '').trim().split(/\s+/);
    const set = (prop, width) => (width ? el.style.setProperty(prop, `${width}px`) : el.style.removeProperty(prop));
    set('--_fz-w', sizeToWidth(phone));
    set('--_fz-w-desktop', sizeToWidth(desktop));
  };

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------ */
  /* <fever-zone-logo>                                                   */
  /* ------------------------------------------------------------------ */

  const logoTemplate = document.createElement('template');
  logoTemplate.innerHTML = `
    <style>
      :host { display: inline-block; position: relative; width: var(--_fz-w, 133px); line-height: 0; vertical-align: middle; color: var(--fz-color, #A7B2BA); }
      @media (min-width: ${DESKTOP_MIN_WIDTH}px) { :host { width: var(--_fz-w-desktop, var(--_fz-w, 133px)); } }
      :host([hidden]) { display: none; }
      svg { display: block; width: 100%; height: auto; overflow: visible; }
      .lines { stroke-width: var(--fz-stroke-width, var(--_fz-stroke, 0.5px)); }
    </style>
    <svg viewBox="0 0 133 28" aria-hidden="true" focusable="false">
      <g class="ripple" fill="currentColor">
        ${RIPPLE.discs.map(() => `<circle cx="${RIPPLE.cx}" cy="${RIPPLE.cy}" r="0" fill-opacity="0"/>`).join('')}
      </g>
      <g class="fills" fill="currentColor">
        ${LETTERS.map((l) => `<path d="${l.d}"${l.evenodd ? ' fill-rule="evenodd"' : ''}/>`).join('')}
      </g>
      <g class="lines" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        ${LETTERS.map((l) => `<path d="${l.d}"/>`).join('')}
      </g>
    </svg>`;

  class FeverZoneLogo extends HTMLElement {
    static get observedAttributes() {
      return ['progress', 'size'];
    }

    constructor() {
      super();
      const root = this.attachShadow({ mode: 'open' });
      root.appendChild(logoTemplate.content.cloneNode(true));
      // Lines are 0.5 logo units like in Figma, but never thinner than 0.5px on screen at small sizes.
      this._ro = new ResizeObserver(([entry]) => {
        const scale = entry.contentRect.width / 133;
        if (scale > 0) this.style.setProperty('--_fz-stroke', `${Math.max(0.5, 0.5 / scale).toFixed(3)}px`);
      });
      this._lines = [...root.querySelectorAll('.lines path')];
      this._fills = [...root.querySelectorAll('.fills path')];
      this._discs = [...root.querySelectorAll('.ripple circle')];
      this._t = END; // without attributes it behaves as a plain static logo
      this._state = 'done';
      this._raf = 0;
      this._waiters = [];
      this._loopTimer = 0;
      this.playbackRate = 1;
      this._render(this._t);
    }

    connectedCallback() {
      if (!this.hasAttribute('role') && !this.hasAttribute('aria-hidden')) {
        this.setAttribute('role', 'img');
        if (!this.hasAttribute('aria-label')) this.setAttribute('aria-label', 'Fever Zone');
      }
      applySize(this, this.getAttribute('size'));
      this._ro.observe(this);
      if (this.hasAttribute('progress')) this.progress = this.getAttribute('progress');
      else if (this.hasAttribute('autoplay')) this._autoplay();
    }

    disconnectedCallback() {
      this._stop();
      clearTimeout(this._loopTimer);
      if (this._io) this._io.disconnect();
      this._ro.disconnect();
    }

    attributeChangedCallback(name, _old, value) {
      if (name === 'progress' && value !== null) this.progress = value;
      if (name === 'size' && this.isConnected) applySize(this, value);
    }

    /** 'idle' | 'drawing' | 'completing' | 'paused' | 'done' */
    get state() {
      return this._state;
    }

    /** 0–1 along the line-drawing part (steps 1 → 2). Reaching 1 plays fill + ripple on its own. */
    get progress() {
      return Math.min(1, this._t / LINES_END);
    }

    set progress(value) {
      if (this._state === 'completing' || this._state === 'done') return;
      const p = clamp01(parseFloat(value) || 0);
      this._stop();
      this._t = p * LINES_END;
      this._state = p > 0 ? 'drawing' : 'idle';
      this._render(this._t);
      if (p >= 1) this.complete();
    }

    /** Where the playhead is on the full timeline (0–1). */
    get position() {
      return this._t / END;
    }

    /** Plays the whole sequence from the start. Resolves when the static logo is reached. */
    play() {
      this._stop();
      this._t = 0;
      return this._runTo(END, 1);
    }

    /** Finishes from wherever it is: remaining lines (fast) → fill → ripple → static. */
    complete() {
      if (this._state === 'done') return Promise.resolve(true);
      if (this._state === 'completing') return this._whenDone();
      return this._runTo(END, 3);
    }

    /** Back to empty (nothing drawn). */
    reset() {
      this._stop();
      clearTimeout(this._loopTimer);
      this._t = 0;
      this._state = 'idle';
      this._render(0);
      this._flushWaiters(false);
    }

    /** Jumps to a point of the full timeline (0–1). For reviews and demos. */
    seek(fraction) {
      this._stop();
      this._t = clamp01(fraction) * END;
      this._state = this._t >= END ? 'done' : this._t <= 0 ? 'idle' : this._t < LINES_END ? 'drawing' : 'paused';
      this._render(this._t);
    }

    _runTo(target, lineSpeed) {
      if (reducedMotion()) {
        this._t = target;
        this._render(target);
        this._finish();
        return Promise.resolve(true);
      }
      this._state = 'completing';
      const done = this._whenDone();
      let last = performance.now();
      const tick = (now) => {
        const dt = Math.min(64, now - last) * this.playbackRate;
        last = now;
        this._t = Math.min(target, this._t + dt * (this._t < LINES_END ? lineSpeed : 1));
        this._render(this._t);
        if (this._t >= target) {
          this._raf = 0;
          this._finish();
        } else {
          this._raf = requestAnimationFrame(tick);
        }
      };
      cancelAnimationFrame(this._raf);
      this._raf = requestAnimationFrame(tick);
      return done;
    }

    _finish() {
      this._state = 'done';
      this._flushWaiters(true);
      this.dispatchEvent(new CustomEvent('fz-complete', { bubbles: true, composed: true }));
      if (this.hasAttribute('loop')) {
        this._loopTimer = setTimeout(() => this.isConnected && this.play(), 1400);
      }
    }

    _stop() {
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = 0;
      if (this._state === 'completing') this._state = 'paused';
    }

    _whenDone() {
      return new Promise((resolve) => this._waiters.push(resolve));
    }

    _flushWaiters(value) {
      const waiters = this._waiters;
      this._waiters = [];
      waiters.forEach((resolve) => resolve(value));
    }

    _autoplay() {
      this.reset();
      if (!('IntersectionObserver' in window)) return void this.play();
      this._io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          this._io.disconnect();
          this.play();
        }
      }, { threshold: 0.5 });
      this._io.observe(this);
    }

    _render(t) {
      for (let i = 0; i < LETTERS.length; i++) {
        const line = this._lines[i];
        const draw = easeInOut(clamp01((t - DRAW[i][0]) / DRAW[i][1]));
        const fill = easeOut(clamp01((t - FILL[i][0]) / FILL[i][1]));
        if (draw >= 1) {
          line.style.strokeDasharray = '';
          line.style.strokeDashoffset = '';
        } else {
          // n short lines centred on evenly spaced points, growing until they meet
          const period = LENGTHS[i] / SEGMENTS[i];
          const dash = period * draw;
          line.style.strokeDasharray = `${dash} ${period - dash}`;
          line.style.strokeDashoffset = `${-(period - dash) / 2}`;
        }
        line.style.opacity = draw > 0 ? String(1 - fill) : '0';
        this._fills[i].style.opacity = String(fill);
      }

      const outer = RIPPLE.discs[0].r;
      for (let k = 0; k < this._discs.length; k++) {
        const { r, o } = RIPPLE.discs[k];
        const growDur = (RIPPLE_GROW * r) / outer;
        const grow = clamp01((t - (RIPPLE_PEAK - growDur)) / growDur);
        const fade = clamp01((t - RIPPLE_PEAK) / RIPPLE_FADE);
        const disc = this._discs[k];
        if (grow <= 0 || fade >= 1) {
          disc.setAttribute('fill-opacity', '0');
          continue;
        }
        disc.setAttribute('r', (r * (easeOut(grow) + 0.1 * easeOut(fade))).toFixed(2));
        disc.setAttribute('fill-opacity', (o * Math.min(1, grow * 4) * (1 - easeInOut(fade))).toFixed(4));
      }
    }
  }

  FeverZoneLogo.timeline = Object.freeze({
    linesEnd: LINES_END,
    ripplePeak: RIPPLE_PEAK,
    end: END,
    // where each Figma step sits on the 0–1 timeline
    steps: [380 / END, LINES_END / END, RIPPLE_PEAK / END, 1],
  });

  // { xs: { width: 76, height: 16 }, … } — for pickers and docs
  FeverZoneLogo.sizes = Object.freeze(Object.fromEntries(
    Object.entries(SIZES).map(([name, height]) => [name, Object.freeze({ width: (height * 133) / 28, height })]),
  ));
  FeverZoneLogo.desktopMinWidth = DESKTOP_MIN_WIDTH;

  /* ------------------------------------------------------------------ */
  /* <fever-zone-overscroll>                                             */
  /* ------------------------------------------------------------------ */

  const RUBBER = 0.55; // same resistance curve as iOS

  const overscrollTemplate = document.createElement('template');
  overscrollTemplate.innerHTML = `
    <style>
      :host { display: block; position: relative; height: 100%; overflow: hidden; isolation: isolate; background: var(--fz-backdrop, #F2F3F3); }
      .stage { position: absolute; left: 0; right: 0; height: 0; pointer-events: none; }
      .stage.top { top: 0; }
      .stage.bottom { bottom: 0; }
      fever-zone-logo { position: absolute; left: 50%; top: 0; opacity: 0; transform: translate(-50%, -50%); }
      .scroller { position: relative; height: 100%; overflow-x: hidden; overflow-y: auto; overscroll-behavior: none; -webkit-overflow-scrolling: touch; background: var(--fz-surface, #FFFFFF); }
      .scroller.dragging { cursor: grabbing; user-select: none; -webkit-user-select: none; }
    </style>
    <div class="stage top"><fever-zone-logo aria-hidden="true"></fever-zone-logo></div>
    <div class="stage bottom"><fever-zone-logo aria-hidden="true"></fever-zone-logo></div>
    <div class="scroller" part="scroller"><slot></slot></div>`;

  class FeverZoneOverscroll extends HTMLElement {
    static get observedAttributes() {
      return ['size'];
    }

    constructor() {
      super();
      const root = this.attachShadow({ mode: 'open' });
      root.appendChild(overscrollTemplate.content.cloneNode(true));
      customElements.upgrade(root);
      this._scroller = root.querySelector('.scroller');
      this._logos = {
        top: root.querySelector('.top fever-zone-logo'),
        bottom: root.querySelector('.bottom fever-zone-logo'),
      };
      this._logos.top.reset();
      this._logos.bottom.reset();
      this._offset = 0; // visible gap in px
      this._raw = 0; // finger / wheel travel before resistance
      this._edge = null; // 'top' | 'bottom' while overscrolling
      this._released = false; // finger / wheel let go, gap springing back or held open
      this._gesture = null;
      this._gen = 0; // invalidates pending closes when a new gesture starts
      this._springRaf = 0;
      this._wheelIdle = 0;
      this._wheelLock = false;
      this._wheelLockTimer = 0;
      this._suppressClick = false;
      this._thresholdPx = 104;
      this._applySize();
      this._bind();
    }

    disconnectedCallback() {
      this._stopSpring();
      clearTimeout(this._wheelIdle);
      clearTimeout(this._wheelLockTimer);
    }

    attributeChangedCallback() {
      this._applySize();
    }

    /** The element that actually scrolls (listen to its 'scroll' event, read scrollTop…). */
    get scroller() {
      return this._scroller;
    }

    /** Gap in px that triggers fill + ripple: the ripple height of the current logo size, or the threshold attribute. */
    get threshold() {
      this._measureThreshold();
      return this._thresholdPx;
    }

    _measureThreshold() {
      const attr = parseFloat(this.getAttribute('threshold'));
      const width = this._logos.top.offsetWidth || 133;
      this._thresholdPx = attr > 0 ? attr : Math.round((104 * width) / 133); // step 3 canvas is 104 × 133
    }

    get _hold() {
      return this.getAttribute('hold') !== 'false';
    }

    _allows(edge) {
      const edges = this.getAttribute('edges') || 'both';
      return edges === 'both' || edges === edge;
    }

    _applySize() {
      const size = this.getAttribute('size');
      for (const logo of Object.values(this._logos)) {
        if (size) logo.setAttribute('size', size);
        else logo.removeAttribute('size');
      }
    }

    _atTop() {
      return this._scroller.scrollTop <= 0;
    }

    _atBottom() {
      const s = this._scroller;
      return Math.ceil(s.scrollTop + s.clientHeight) >= s.scrollHeight - 1;
    }

    _rubber(raw) {
      const d = this.clientHeight || 600;
      return (raw * d * RUBBER) / (d + RUBBER * raw);
    }

    _unrubber(offset) {
      const d = this.clientHeight || 600;
      const v = Math.min(offset, d * 0.99);
      return (v * d) / (RUBBER * (d - v));
    }

    /* ---------- input ---------- */

    _bind() {
      const s = this._scroller;

      s.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return void this._end();
        this._start(e.touches[0].clientX, e.touches[0].clientY, 'touch');
      }, { passive: true });
      s.addEventListener('touchmove', (e) => {
        const t = e.touches[0];
        if (t && this._gesture) this._move(t.clientX, t.clientY, e);
      }, { passive: false });
      s.addEventListener('touchend', (e) => e.touches.length === 0 && this._end(), { passive: true });
      s.addEventListener('touchcancel', () => this._end(), { passive: true });

      // Optional: drag with the mouse like a phone (attribute "mouse-drag").
      s.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse' || e.button !== 0 || !this.hasAttribute('mouse-drag')) return;
        this._start(e.clientX, e.clientY, 'mouse');
        s.setPointerCapture(e.pointerId);
      });
      s.addEventListener('pointermove', (e) => {
        if (this._gesture && this._gesture.kind === 'mouse') this._move(e.clientX, e.clientY, e);
      });
      const pointerEnd = () => {
        if (!this._gesture || this._gesture.kind !== 'mouse') return;
        s.classList.remove('dragging');
        this._end();
      };
      s.addEventListener('pointerup', pointerEnd);
      s.addEventListener('pointercancel', pointerEnd);
      s.addEventListener('click', (e) => {
        if (!this._suppressClick) return;
        this._suppressClick = false;
        e.preventDefault();
        e.stopPropagation();
      }, true);

      s.addEventListener('wheel', (e) => this._wheel(e), { passive: false });
    }

    _start(x, y, kind) {
      this._gesture = { x0: x, y0: y, lastY: y, axis: null, kind };
      this._suppressClick = false;
      if (this._edge) {
        // grabbed again while springing back or holding
        this._stopSpring();
        this._gen++;
        this._released = false;
        this._raw = this._unrubber(this._offset);
      }
    }

    _move(x, y, e) {
      const g = this._gesture;
      if (!g.axis) {
        const dx = x - g.x0;
        const dy = y - g.y0;
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
        g.axis = Math.abs(dy) >= Math.abs(dx) ? 'y' : 'x';
        if (g.kind === 'mouse') {
          this._suppressClick = true;
          this._scroller.classList.add('dragging');
        }
      }
      if (g.axis !== 'y') return;
      const dy = y - g.lastY;
      g.lastY = y;

      if (!this._edge) {
        if (dy > 0 && this._allows('top') && this._atTop()) this._edge = 'top';
        else if (dy < 0 && this._allows('bottom') && this._atBottom()) this._edge = 'bottom';
        else {
          if (g.kind === 'mouse') this._scroller.scrollTop -= dy; // touch scrolls natively
          return;
        }
        this._raw = 0;
        this._measureThreshold();
      }
      if (e.cancelable) e.preventDefault();
      this._raw += this._edge === 'top' ? dy : -dy;
      if (this._raw <= 0) return void this._closeNow();
      this._setOffset(this._rubber(this._raw));
    }

    _end() {
      if (!this._gesture) return;
      this._gesture = null;
      if (this._edge) this._release();
    }

    _wheel(e) {
      if (e.ctrlKey || this._gesture) return; // pinch-zoom or a touch in progress
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.clientHeight : 1);
      if (Math.abs(e.deltaX) > Math.abs(dy)) return;

      if (this._wheelLock) {
        // momentum tail of a gesture that was already released: swallow it
        clearTimeout(this._wheelLockTimer);
        this._wheelLockTimer = setTimeout(() => (this._wheelLock = false), 200);
        if (this._edge) e.preventDefault();
        return;
      }
      if (!this._edge) {
        if (dy < 0 && this._allows('top') && this._atTop()) this._edge = 'top';
        else if (dy > 0 && this._allows('bottom') && this._atBottom()) this._edge = 'bottom';
        else return;
        this._raw = 0;
        this._measureThreshold();
      } else if (this._released) {
        // picked up again while springing back or holding
        this._stopSpring();
        this._gen++;
        this._released = false;
        this._raw = this._unrubber(this._offset);
      }
      e.preventDefault();
      this._raw += this._edge === 'top' ? -dy : dy;
      if (this._raw <= 0) return void this._closeNow();
      this._setOffset(this._rubber(this._raw));

      clearTimeout(this._wheelIdle);
      this._wheelIdle = setTimeout(() => {
        this._wheelLock = true;
        this._wheelLockTimer = setTimeout(() => (this._wheelLock = false), 200);
        this._release();
      }, 140);
    }

    /* ---------- motion ---------- */

    _setOffset(offset) {
      this._offset = offset;
      const edge = this._edge;
      this._scroller.style.transform = offset ? `translate3d(0, ${edge === 'bottom' ? -offset : offset}px, 0)` : '';
      if (!edge) return;

      const logo = this._logos[edge];
      const centre = edge === 'top' ? offset / 2 : -offset / 2;
      logo.style.transform = `translate(-50%, calc(${centre}px - 50%))`;
      logo.style.opacity = String(clamp01((offset - 6) / 30));

      if (logo.state === 'idle' || logo.state === 'drawing') {
        const threshold = this._thresholdPx;
        if (offset >= threshold) {
          logo.complete();
          this.dispatchEvent(new CustomEvent('fz-trigger', { bubbles: true, composed: true, detail: { edge } }));
        } else {
          logo.progress = offset / threshold;
        }
      }
    }

    _release() {
      const edge = this._edge;
      const logo = this._logos[edge];
      const gen = ++this._gen;
      this._released = true;
      if (this._hold && logo.state === 'completing') {
        // keep the gap open until the static logo is reached, then close
        this._springTo(Math.min(this._offset, this._thresholdPx));
        logo.complete().then((done) => {
          if (done && gen === this._gen) setTimeout(() => gen === this._gen && this._close(), 300);
        });
      } else {
        this._close();
      }
    }

    _close() {
      const gen = ++this._gen;
      this._springTo(0, () => gen === this._gen && this._closeNow());
    }

    _closeNow() {
      this._stopSpring();
      this._setOffset(0);
      if (this._edge) {
        this._logos[this._edge].style.opacity = '0';
        this._logos[this._edge].reset();
      }
      this._edge = null;
      this._raw = 0;
      this._released = false;
      this._gen++;
    }

    _springTo(target, done) {
      this._stopSpring();
      const from = this._offset;
      const start = performance.now();
      const w = 15; // critically damped, settles in ~0.5s
      const tick = (now) => {
        const t = (now - start) / 1000;
        const value = target + (from - target) * (1 + w * t) * Math.exp(-w * t);
        if (Math.abs(value - target) < 0.4) {
          this._springRaf = 0;
          this._setOffset(target);
          if (done) done();
          return;
        }
        this._setOffset(value);
        this._springRaf = requestAnimationFrame(tick);
      };
      this._springRaf = requestAnimationFrame(tick);
    }

    _stopSpring() {
      if (this._springRaf) cancelAnimationFrame(this._springRaf);
      this._springRaf = 0;
    }
  }

  if (!customElements.get('fever-zone-logo')) customElements.define('fever-zone-logo', FeverZoneLogo);
  if (!customElements.get('fever-zone-overscroll')) customElements.define('fever-zone-overscroll', FeverZoneOverscroll);
  window.FeverZoneLogo = FeverZoneLogo;
  window.FeverZoneOverscroll = FeverZoneOverscroll;
})();
