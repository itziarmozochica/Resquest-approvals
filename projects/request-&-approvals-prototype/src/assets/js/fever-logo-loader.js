(() => {
  // The Fever logo loader: the outline of "fever" draws letter by letter, then fills, every 4.4 s.
  // It is drawn on a canvas by a worker, so it keeps 60 fps while the app keeps the main thread
  // busy booting (a CSS-animated SVG repaints on the main thread and skips frames exactly then).
  // Loaded by index.html: it starts the splash logo, and the spinner starts its own with
  // window.startFeverLogoLoader.
  const LOGO = {
    // Path lengths feed the outline's dash, like pathLength="1" did in the SVG.
    letters: [
      {
        length: 86.046,
        d: 'M6.49981 14.282L6.49721 15.2078H10.422C11.2097 15.2078 11.8487 15.8509 11.8487 16.6437V19.3053C11.8487 20.0982 11.2097 20.7413 10.422 20.7413H6.49721V29.5529C6.49721 30.3462 5.85829 30.9889 5.07058 30.9889H1.42663C0.638553 30.9889 0 30.3462 0 29.5529V14.2017H0.00259725C0.0389588 6.91896 4.91548 0.900729 11.1942 0.0137739C12.0446 -0.106479 12.8 0.576571 12.8 1.44112V5.368C12.8 6.04993 12.3203 6.62393 11.6591 6.77107C8.72788 7.42387 6.49981 10.5433 6.49981 14.282Z',
      },
      {
        length: 134.468,
        d: 'M32.2727 16.2583C32.0681 14.0853 30.0745 11.9626 27.3651 11.9626C24.6044 11.9626 22.355 14.0347 22.0484 16.2583H32.2727ZM37.3221 26.2494C38.1313 27.0492 38.0576 28.3661 37.1676 29.0774C34.7975 30.972 31.6247 32 28.5187 32C21.1062 32 15.5341 26.9465 15.5341 19.2656C15.5341 12.4427 20.2371 6.47975 27.5987 6.47975C34.4487 6.47975 39.3055 12.1902 39.3055 19.0123C39.3055 19.1778 39.3021 19.3436 39.2956 19.5079C39.2653 20.2778 38.6163 20.8822 37.8367 20.8822H21.9753C22.3332 24.3184 25.1447 26.694 28.6724 26.694C30.6805 26.694 32.402 25.8945 33.6502 24.9772C34.429 24.4054 35.505 24.4531 36.1911 25.1314L37.3221 26.2494Z',
      },
      {
        length: 101.326,
        d: 'M58.2561 7.33445L51.8856 21.4989L45.5155 7.33445C45.2814 6.81462 44.7637 6.47975 44.1929 6.47975H40.5371C39.4799 6.47975 38.7782 7.57402 39.2201 8.53343L49.212 30.2452C49.4488 30.759 49.9631 31.0886 50.5294 31.0886H53.2418C53.8081 31.0886 54.3228 30.759 54.5592 30.2452L64.5515 8.53343C64.993 7.57402 64.2913 6.47975 63.2341 6.47975H59.5784C59.0075 6.47975 58.4898 6.81462 58.2561 7.33445Z',
      },
      {
        length: 134.864,
        d: 'M81.8815 16.2583C81.6769 14.0853 79.6833 11.9626 76.9739 11.9626C74.2132 11.9626 71.9642 14.0347 71.6572 16.2583H81.8815ZM87.2842 26.5987C87.877 27.1843 87.852 28.144 87.2284 28.697C84.8188 30.834 81.435 32 78.1279 32C70.715 32 65.1429 26.9465 65.1429 19.2656C65.1429 12.4427 69.8459 6.47975 77.2075 6.47975C84.0579 6.47975 88.9143 12.1902 88.9143 19.0123C88.9143 19.1778 88.9109 19.3436 88.9044 19.5076C88.8741 20.2778 88.2251 20.8822 87.4455 20.8822H71.5841C71.942 24.3184 74.7539 26.694 78.2812 26.694C80.4691 26.694 82.3163 25.7452 83.5824 24.7292C84.1547 24.27 84.99 24.3304 85.5111 24.8459L87.2842 26.5987Z',
      },
      {
        length: 66.078,
        d: 'M91.2031 18.7451H91.2V29.5569C91.2 30.3554 91.8653 31.0031 92.686 31.0031H96.449C97.2816 31.0031 97.9516 30.337 97.9346 29.5268L97.7059 18.7451H97.7051C97.7584 15.3181 99.9349 12.4688 102.801 11.838C103.493 11.6857 104 11.1117 104 10.4208V6.93469C104 6.05753 103.203 5.37333 102.311 5.49746C96.0877 6.36596 91.263 11.9663 91.2031 18.7451Z',
      },
    ],
  };

  // Runs in the worker. It is sent there with toString(), so it uses only what it is given.
  function paintLogoLoader(scope) {
    const LOOP_MS = 4400;
    // CSS cubic-bezier(): solve x(t) = progress by bisection, return y(t).
    const bezier = (x1, y1, x2, y2) => x => {
      const at = (a, b, t) => 3 * a * t * (1 - t) ** 2 + 3 * b * t ** 2 * (1 - t) + t ** 3;
      let low = 0;
      let high = 1;
      for (let i = 0; i < 20; i++) {
        const t = (low + high) / 2;
        if (at(x1, x2, t) < x) {
          low = t;
        } else {
          high = t;
        }
      }
      return at(y1, y2, (low + high) / 2);
    };
    const draw = bezier(0.65, 0, 0.35, 1);
    const easeInOut = bezier(0.42, 0, 0.58, 1);
    // [ms into the loop, value] keyframes, eased per segment like a CSS animation.
    const keyframes = (stops, ease) => ms => {
      const next = stops.findIndex(([stop]) => ms <= stop);
      const [p0, v0] = stops[next - 1] || stops[0];
      const [p1, v1] = stops[next] || stops[stops.length - 1];
      return p1 === p0 ? v1 : v0 + (v1 - v0) * ease((ms - p0) / (p1 - p0));
    };
    const outline = keyframes(
      [
        [0, 1.05],
        [1680, 0],
        [3400, 0],
        [4400, 1.05],
      ],
      draw,
    );
    // The full logo holds 0.4 s: longer, and it looks stuck.
    const fill = keyframes(
      [
        [0, 0],
        [1800, 0],
        [2400, 1],
        [2800, 1],
        [3300, 0],
        [4400, 0],
      ],
      easeInOut,
    );
    // Some workers have no requestAnimationFrame (Safari before 18).
    const nextFrame = scope.requestAnimationFrame
      ? callback => scope.requestAnimationFrame(callback)
      : callback => scope.setTimeout(callback, 16);

    return ({ data: { canvas, logo, color, startedAt } }) => {
      const ctx = canvas.getContext('2d');
      const letters = logo.letters.map(({ d, length }) => ({ path: new Path2D(d), length }));
      // How far, in ms, an element with this animation-delay is into its loop; 0 before its delay.
      const ms = (now, delayMs) => {
        const t = now - startedAt - delayMs;
        return t < 0 ? 0 : t % LOOP_MS;
      };
      const paint = () => {
        if (canvas.isConnected === false) {
          return;
        }
        const now = Date.now();
        const scale = canvas.width / 168;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // The SVG's viewBox="-12 -8 168 48", with "fever" moved to its centre.
        ctx.setTransform(scale, 0, 0, scale, (12 + 19.55) * scale, 8 * scale);
        ctx.fillStyle = ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.lineCap = ctx.lineJoin = 'round';
        letters.forEach(({ path, length }, i) => {
          const p = ms(now, i * 60);
          ctx.save();
          // Each outline is clipped to its letter, so only the stroke's inner half shows.
          ctx.clip(path, 'evenodd');
          ctx.setLineDash([1.05 * length, 1.05 * length]);
          ctx.lineDashOffset = outline(p) * length;
          ctx.stroke(path);
          ctx.globalAlpha = fill(p);
          ctx.fill(path, 'evenodd');
          ctx.restore();
        });
        nextFrame(paint);
      };
      paint();
    };
  }

  const WORKER_URL = URL.createObjectURL(new Blob([`onmessage = (${paintLogoLoader})(self);`], { type: 'text/javascript' }));

  // Starts the loop elapsedMs into its cycle. The canvas keeps when its loop started (data-start),
  // for the spinner to resume from (spinner.service.ts).
  function startLogoLoader(canvas, elapsedMs = 0) {
    const ratio = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.round((width || canvas.width) * ratio);
    canvas.height = Math.round((height || canvas.height) * ratio);
    const message = {
      logo: LOGO,
      color: getComputedStyle(canvas).color,
      startedAt: Date.now() - elapsedMs,
    };
    canvas.dataset.start = String(message.startedAt);
    if (!canvas.transferControlToOffscreen) {
      paintLogoLoader(window)({ data: { ...message, canvas } });
      return;
    }
    const worker = new Worker(WORKER_URL);
    const offscreen = canvas.transferControlToOffscreen();
    worker.postMessage({ ...message, canvas: offscreen }, [offscreen]);
    // The worker would keep drawing once the loader is gone.
    const stopWhenRemoved = setInterval(() => {
      if (!canvas.isConnected) {
        worker.terminate();
        clearInterval(stopWhenRemoved);
      }
    }, 1000);
  }

  window.startFeverLogoLoader = startLogoLoader;
  const splashLogo = document.querySelector('.app-splash-logo');
  if (splashLogo) {
    startLogoLoader(splashLogo);
  }
})();
