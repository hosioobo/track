(() => {
  const canvas = document.querySelector(".track-field");
  if (!canvas) return;

  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const particleIcons = Array.from(
    document.querySelectorAll(".motion-icon, .list-motion")
  );
  const particleIconStates = [];
  let particleIconFrame = 0;
  let particleIconLastTime = 0;
  let particleIconElapsed = 0;

  const particleHash = (value, salt = 0) => {
    const raw = Math.sin(value * 127.1 + salt * 311.7) * 43758.5453;
    return raw - Math.floor(raw);
  };

  const particleFract = (value) => value - Math.floor(value);

  const particleEase = (value) => {
    const amount = Math.max(0, Math.min(1, value));
    return amount * amount * (3 - 2 * amount);
  };

  const plotParticle = (iconContext, x, y, radius, alpha, glow = 0) => {
    iconContext.beginPath();
    iconContext.arc(x, y, radius, 0, Math.PI * 2);
    iconContext.fillStyle = `rgba(245,245,242,${alpha})`;
    if (glow) {
      iconContext.shadowColor = `rgba(255,255,255,${Math.min(alpha, 0.5)})`;
      iconContext.shadowBlur = glow;
    }
    iconContext.fill();
    iconContext.shadowBlur = 0;
  };

  const drawGoalParticles = (state, time, size) => {
    const { context: iconContext } = state;
    const rings = [
      { count: 20, phase: 0, radiusX: 0.38, radiusY: 0.13, speed: 0.17, tilt: -0.22 },
      { count: 18, phase: 0.9, radiusX: 0.31, radiusY: 0.21, speed: -0.13, tilt: 0.72 },
      { count: 16, phase: 1.7, radiusX: 0.23, radiusY: 0.31, speed: 0.1, tilt: -0.58 }
    ];

    rings.forEach((ring, ringIndex) => {
      const breathing = 1
        + Math.sin(time * (0.36 + ringIndex * 0.045) + ringIndex * 1.9) * 0.085
        + Math.sin(time * 0.14 + ringIndex * 2.7) * 0.035;
      const changingTilt = ring.tilt
        + Math.sin(time * (0.2 + ringIndex * 0.018) + ringIndex * 2.2) * 0.17;
      for (let index = 0; index < ring.count; index += 1) {
        const angle = (index / ring.count) * Math.PI * 2
          + ring.phase
          + time * (
            ring.speed
            + (particleHash(index, 31 + ringIndex) - 0.5) * 0.03
          )
          + Math.sin(time * 0.42 + index * 1.37 + ringIndex) * 0.065;
        const localPulse = 1
          + Math.sin(time * 0.31 + index * 0.83 + ringIndex * 1.6) * 0.05;
        const ellipseX = Math.cos(angle) * size * ring.radiusX * breathing * localPulse;
        const ellipseY = Math.sin(angle) * size * ring.radiusY * breathing / localPulse;
        const x = ellipseX * Math.cos(changingTilt) - ellipseY * Math.sin(changingTilt);
        const y = ellipseX * Math.sin(changingTilt) + ellipseY * Math.cos(changingTilt);
        const front = 0.5 + Math.sin(angle) * 0.5;
        plotParticle(
          iconContext,
          x,
          y,
          0.6 + ((index + ringIndex) % 3) * 0.18,
          0.2 + front * 0.58,
          front > 0.9 ? 4 : 0
        );
      }
    });

    const orbRadius = size * 0.085;
    const orbFill = iconContext.createRadialGradient(
      -orbRadius * 0.28,
      -orbRadius * 0.32,
      0,
      0,
      0,
      orbRadius
    );
    orbFill.addColorStop(0, "rgba(255,255,255,1)");
    orbFill.addColorStop(0.38, "rgba(245,245,242,0.92)");
    orbFill.addColorStop(1, "rgba(245,245,242,0.34)");
    iconContext.beginPath();
    iconContext.arc(0, 0, orbRadius, 0, Math.PI * 2);
    iconContext.fillStyle = orbFill;
    iconContext.shadowColor = "rgba(255,255,255,0.52)";
    iconContext.shadowBlur = 10;
    iconContext.fill();
    iconContext.shadowBlur = 0;

    iconContext.beginPath();
    iconContext.arc(0, 0, orbRadius * 1.34, 0, Math.PI * 2);
    iconContext.strokeStyle = "rgba(255,255,255,0.2)";
    iconContext.lineWidth = 0.7;
    iconContext.stroke();
  };

  const drawDependencyParticles = (state, time, size) => {
    const { context: iconContext } = state;
    for (let index = 0; index < 48; index += 1) {
      const lane = index % 3;
      const progress = (
        particleHash(index, 4)
        + time * (0.055 + particleHash(index, 5) * 0.025)
      ) % 1;
      const fanProgress = Math.min(1, progress / 0.24);
      const fanEase = 1 - (1 - fanProgress) ** 3;
      const x = size * (-0.36 + progress * 0.74);
      const y = size * (
        (lane - 1) * 0.18 * fanEase
        + Math.sin(time * 1.2 + index) * 0.006 * (1 - fanEase)
      );
      const nearOrigin = Math.max(0, 1 - progress * 12);
      plotParticle(
        iconContext,
        x,
        y,
        0.55 + particleHash(index, 6) * 0.65 + nearOrigin * 0.3,
        0.24 + particleHash(index, 7) * 0.46 + nearOrigin * 0.2,
        nearOrigin * 7
      );
    }

    for (let lane = 0; lane < 3; lane += 1) {
      for (let index = 0; index < 7; index += 1) {
        plotParticle(
          iconContext,
          size * (-0.08 + index * 0.07),
          size * (lane - 1) * 0.18,
          0.45,
          0.11 + (index % 3) * 0.035
        );
      }
    }

    plotParticle(iconContext, size * -0.36, 0, size * 0.045, 0.96, 8);
  };

  const drawGateParticles = (state, time, size) => {
    const { context: iconContext } = state;

    for (let index = 0; index < 27; index += 1) {
      const angle = index * 2.39996 + time * (index % 2 ? 0.15 : -0.11);
      const radius = size * (0.045 + particleHash(index, 8) * 0.155);
      const wobble = 0.78 + particleHash(index, 9) * 0.52;
      plotParticle(
        iconContext,
        size * -0.22 + Math.cos(angle) * radius,
        Math.sin(angle) * radius * wobble,
        0.5 + particleHash(index, 10) * 0.7,
        0.2 + particleHash(index, 11) * 0.5
      );
    }

    for (let index = 0; index < 18; index += 1) {
      const angle = (index / 18) * Math.PI * 2 + time * 0.16;
      const radius = size * (0.085 + (index % 3) * 0.009);
      plotParticle(
        iconContext,
        size * 0.23 + Math.cos(angle) * radius,
        Math.sin(angle) * radius * 0.84,
        0.58 + (index % 3) * 0.12,
        0.32 + (index % 4) * 0.1,
        index % 9 === 0 ? 4 : 0
      );
    }
    plotParticle(iconContext, size * 0.23, 0, size * 0.035, 0.9, 6);

    for (let index = 0; index < 18; index += 1) {
      const progress = (
        particleHash(index, 12)
        + time * (0.055 + particleHash(index, 13) * 0.025)
      ) % 1;
      const entering = Math.min(1, progress / 0.5);
      const exiting = Math.max(0, (progress - 0.5) / 0.5);
      const sourceY = (particleHash(index, 14) - 0.5) * size * 0.31;
      const targetAngle = (index / 18) * Math.PI * 2 + time * 0.16;
      const targetY = Math.sin(targetAngle) * size * 0.085 * 0.84;
      const y = progress < 0.5
        ? sourceY * (1 - entering ** 2)
        : targetY * (exiting * (2 - exiting));
      const x = size * (-0.34 + progress * 0.68);
      const crossing = Math.max(0, 1 - Math.abs(progress - 0.5) * 12);
      plotParticle(
        iconContext,
        x,
        y,
        0.5 + particleHash(index, 15) * 0.65 + crossing * 0.32,
        0.2 + particleHash(index, 16) * 0.48 + crossing * 0.2,
        crossing * 7
      );
    }

    [-0.013, 0.013].forEach((column, columnIndex) => {
      for (let index = 0; index < 9; index += 1) {
        plotParticle(
          iconContext,
          size * column,
          size * (-0.19 + index * 0.0475),
          0.92,
          0.48 + ((index + columnIndex) % 3) * 0.12,
          index === 4 ? 4 : 0
        );
      }
    });
  };

  const drawStartParticles = (state, time, size) => {
    const { context: iconContext } = state;
    const count = 58;
    const cycle = particleFract(time * 0.22);
    const ignitionEnd = 0.16;
    const travelEnd = 0.7;
    const ignition = cycle < ignitionEnd
      ? particleEase(cycle / ignitionEnd)
      : 0;
    const travel = cycle >= ignitionEnd && cycle < travelEnd
      ? particleEase((cycle - ignitionEnd) / (travelEnd - ignitionEnd))
      : 0;
    const wavePosition = cycle < ignitionEnd
      ? 0
      : cycle < travelEnd
        ? travel * 1.18
        : 1.42;
    const waveStrength = cycle < ignitionEnd ? ignition : cycle < travelEnd ? 1 : 0;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const listeningBounce = 0.5 + Math.sin(time * 2.15) * 0.5;

    for (let index = 0; index < count; index += 1) {
      const vertical = 1 - ((index + 0.5) / count) * 2;
      const ringRadius = Math.sqrt(Math.max(0, 1 - vertical * vertical));
      const angle = index * goldenAngle + time * 0.13;
      const depth = Math.sin(angle) * ringRadius;
      const baseX = Math.cos(angle) * ringRadius;
      const baseY = vertical;
      const radialDistance = Math.min(1, Math.sqrt(baseX * baseX + baseY * baseY));
      const waveDistance = Math.abs(radialDistance - wavePosition);
      const wave = Math.exp(-(waveDistance * waveDistance) / 0.018) * waveStrength;
      const bounce = 1 + wave * (0.1 + listeningBounce * 0.075);
      const radius = size * 0.31 * bounce;
      plotParticle(
        iconContext,
        baseX * radius,
        baseY * radius,
        0.42 + ((depth + 1) * 0.5) * 0.44,
        0.1 + ((depth + 1) * 0.5) * 0.18 + wave * 0.78,
        wave > 0.58 ? 5 : 0
      );
    }

    const corePulse = ignition
      + Math.exp(-(wavePosition * wavePosition) / 0.028) * waveStrength * 0.7;
    plotParticle(
      iconContext,
      0,
      0,
      size * (0.022 + corePulse * 0.012),
      0.32 + corePulse * 0.58,
      5
    );
  };

  const drawTrimParticles = (state, time, size) => {
    const { context: iconContext } = state;
    const count = 58;
    const cycle = particleFract(time * 0.2);
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    const drawTrimmingSphere = (
      sphereRadius,
      sphereAlpha,
      rotationOffset,
      glowAmount
    ) => {
      for (let index = 0; index < count; index += 1) {
        const vertical = 1 - ((index + 0.5) / count) * 2;
        const ringRadius = Math.sqrt(Math.max(0, 1 - vertical * vertical));
        const angle = index * goldenAngle + time * 0.74 + rotationOffset;
        const depth = Math.sin(angle) * ringRadius;
        const horizontal = Math.cos(angle) * ringRadius;
        plotParticle(
          iconContext,
          horizontal * sphereRadius,
          vertical * sphereRadius,
          0.44 + ((depth + 1) * 0.5) * 0.46,
          sphereAlpha * (0.42 + ((depth + 1) * 0.5) * 0.58),
          glowAmount && depth > 0.74 ? glowAmount : 0
        );
      }
    };

    const trimAmount = particleEase(Math.min(1, cycle / 0.76));
    const currentRadius = size * (0.36 - trimAmount * 0.25);
    const currentAlpha = 0.9 - trimAmount * 0.72;
    drawTrimmingSphere(
      currentRadius,
      currentAlpha,
      0,
      trimAmount < 0.18 ? 3 : 0
    );

    const incomingStart = 0.62;
    if (cycle > incomingStart) {
      const incoming = particleEase((cycle - incomingStart) / (1 - incomingStart));
      const incomingRadius = size * (0.5 - incoming * 0.14);
      const incomingAlpha = incoming * 0.9;
      drawTrimmingSphere(
        incomingRadius,
        incomingAlpha,
        Math.PI * 0.72,
        incoming > 0.74 ? 3 : 0
      );
    }

    plotParticle(
      iconContext,
      0,
      0,
      size * (0.026 - trimAmount * 0.01),
      0.62 - trimAmount * 0.4,
      4 * (1 - trimAmount)
    );
  };

  const drawHoldParticles = (state, time, size) => {
    const { context: iconContext } = state;
    const count = 58;
    const sphereRadius = size * 0.3;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    for (let index = 0; index < count; index += 1) {
      const vertical = 1 - ((index + 0.5) / count) * 2;
      const ringRadius = Math.sqrt(Math.max(0, 1 - vertical * vertical));
      const angle = index * goldenAngle + 0.64;
      const depth = Math.sin(angle) * ringRadius;
      plotParticle(
        iconContext,
        Math.cos(angle) * ringRadius * sphereRadius,
        vertical * sphereRadius,
        0.4 + ((depth + 1) * 0.5) * 0.38,
        0.16 + ((depth + 1) * 0.5) * 0.24
      );
    }

    const blink = 0.22 + (0.5 + Math.sin(time * 3.1) * 0.5) * 0.72;
    [-0.05, 0.05].forEach((column) => {
      for (let index = 0; index < 7; index += 1) {
        plotParticle(
          iconContext,
          size * column,
          size * (-0.16 + index * 0.053),
          0.82,
          blink,
          blink > 0.82 && index === 3 ? 4 : 0
        );
      }
    });
  };

  const drawParticleIcon = (state, time) => {
    const { context: iconContext, width: iconWidth, height: iconHeight } = state;
    if (!iconWidth || !iconHeight) return;

    iconContext.clearRect(0, 0, iconWidth, iconHeight);
    iconContext.save();
    iconContext.translate(iconWidth / 2, iconHeight / 2);
    iconContext.globalCompositeOperation = "lighter";

    const size = Math.min(iconWidth, iconHeight);
    const glow = iconContext.createRadialGradient(0, 0, 0, 0, 0, size * 0.5);
    glow.addColorStop(0, "rgba(255,255,255,0.055)");
    glow.addColorStop(0.55, "rgba(255,255,255,0.018)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    iconContext.fillStyle = glow;
    iconContext.fillRect(-size / 2, -size / 2, size, size);

    if (state.type === "goal") drawGoalParticles(state, time, size);
    if (state.type === "dependency") drawDependencyParticles(state, time, size);
    if (state.type === "gate") drawGateParticles(state, time, size);
    if (state.type === "start") drawStartParticles(state, time, size);
    if (state.type === "trim") drawTrimParticles(state, time, size);
    if (state.type === "hold") drawHoldParticles(state, time, size);

    iconContext.restore();
  };

  const resizeParticleIcon = (state) => {
    const bounds = state.canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    state.width = Math.max(1, bounds.width);
    state.height = Math.max(1, bounds.height);
    state.canvas.width = Math.round(state.width * ratio);
    state.canvas.height = Math.round(state.height * ratio);
    state.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawParticleIcon(state, particleIconElapsed || 4.2);
  };

  const drawParticleIcons = (time = 0) => {
    const delta = particleIconLastTime
      ? Math.min((time - particleIconLastTime) / 1000, 0.05)
      : 0;
    particleIconLastTime = time;
    particleIconElapsed += delta;
    particleIconStates.forEach((state) => {
      if (state.visible) drawParticleIcon(state, particleIconElapsed);
    });
  };

  const tickParticleIcons = (time) => {
    drawParticleIcons(time);
    if (!reduceMotion.matches && !document.hidden) {
      particleIconFrame = window.requestAnimationFrame(tickParticleIcons);
    }
  };

  const startParticleIcons = () => {
    window.cancelAnimationFrame(particleIconFrame);
    particleIconLastTime = 0;
    if (reduceMotion.matches) {
      particleIconElapsed = 4.2;
      drawParticleIcons();
      return;
    }
    if (!document.hidden) {
      particleIconFrame = window.requestAnimationFrame(tickParticleIcons);
    }
  };

  const particleIconObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const state = particleIconStates.find(({ element }) => element === entry.target);
      if (state) state.visible = entry.isIntersecting;
    });
    startParticleIcons();
  }, { rootMargin: "80px" });

  particleIcons.forEach((element) => {
    const particleCanvas = document.createElement("canvas");
    particleCanvas.className = "particle-canvas";
    particleCanvas.setAttribute("aria-hidden", "true");
    const iconContext = particleCanvas.getContext("2d", { alpha: true });
    if (!iconContext) return;

    const type = element.classList.contains("scope-motion")
      ? "gate"
      : [
      "goal",
      "dependency",
      "start",
      "trim",
      "hold"
    ].find((name) => element.classList.contains(`${name}-motion`));
    if (!type) return;

    element.classList.add("particle-ready");
    element.prepend(particleCanvas);
    const state = {
      canvas: particleCanvas,
      context: iconContext,
      element,
      height: 0,
      type,
      visible: true,
      width: 0
    };
    particleIconStates.push(state);
    const iconResizeObserver = new ResizeObserver(() => resizeParticleIcon(state));
    iconResizeObserver.observe(particleCanvas);
    particleIconObserver.observe(element);
    resizeParticleIcon(state);
  });

  reduceMotion.addEventListener("change", startParticleIcons);
  document.addEventListener("visibilitychange", startParticleIcons);
  startParticleIcons();

  const particles = Array.from({ length: 84 }, (_, index) => ({
    lane: index % 3,
    phase: (index * 0.173) % 1,
    speed: 0.022 + (index % 7) * 0.0022,
    size: 0.65 + (index % 5) * 0.27,
    drift: (index % 11) * 0.31
  }));

  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let animationFrame = 0;
  let lastTime = 0;
  let elapsed = 0;
  let isVisible = true;

  const cubic = (a, b, c, d, value) => {
    const inverse = 1 - value;
    return inverse ** 3 * a
      + 3 * inverse ** 2 * value * b
      + 3 * inverse * value ** 2 * c
      + value ** 3 * d;
  };

  const pointOnTrack = (lane, progress) => {
    const startY = height * (0.29 + lane * 0.21);
    const gateX = width * 0.7;
    const gateY = height * 0.5;

    if (progress <= 0.76) {
      const amount = progress / 0.76;
      return {
        x: cubic(width * 0.06, width * 0.3, width * 0.52, gateX, amount),
        y: cubic(startY, startY, gateY + (lane - 1) * height * 0.05, gateY, amount)
      };
    }

    const amount = (progress - 0.76) / 0.24;
    return {
      x: cubic(gateX, width * 0.79, width * 0.88, width * 0.96, amount),
      y: cubic(gateY, gateY, height * 0.47, height * 0.45, amount)
    };
  };

  const traceTrack = (lane) => {
    context.beginPath();
    for (let step = 0; step <= 90; step += 1) {
      const point = pointOnTrack(lane, step / 90);
      if (step === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    }
    context.stroke();
  };

  const draw = (time = 0) => {
    if (!width || !height) return;

    const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
    lastTime = time;
    elapsed += delta;
    context.clearRect(0, 0, width, height);

    const glow = context.createRadialGradient(
      width * 0.7,
      height * 0.5,
      0,
      width * 0.7,
      height * 0.5,
      width * 0.28
    );
    glow.addColorStop(0, "rgba(255,255,255,0.09)");
    glow.addColorStop(0.42, "rgba(255,255,255,0.025)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);

    context.save();
    context.lineWidth = Math.max(0.65, width / 1100);
    context.strokeStyle = "rgba(255,255,255,0.085)";
    context.setLineDash([1, Math.max(5, width / 90)]);
    for (let lane = 0; lane < 3; lane += 1) traceTrack(lane);
    context.restore();

    const pulse = 0.5 + Math.sin(elapsed * 1.7) * 0.5;
    const gateX = width * 0.7;
    const gateY = height * 0.5;

    context.save();
    context.translate(gateX, gateY);
    for (let ring = 0; ring < 4; ring += 1) {
      context.beginPath();
      context.arc(0, 0, width * (0.031 + ring * 0.017 + pulse * 0.002), 0, Math.PI * 2);
      context.strokeStyle = `rgba(255,255,255,${0.16 - ring * 0.027})`;
      context.lineWidth = Math.max(0.6, width / 1200);
      context.stroke();
    }

    for (let dot = 0; dot < 52; dot += 1) {
      const angle = dot * 2.39996 + elapsed * (dot % 2 ? 0.13 : -0.1);
      const radius = width * (0.018 + (dot % 13) * 0.0033);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius * 0.82;
      context.beginPath();
      context.arc(x, y, 0.55 + (dot % 4) * 0.22, 0, Math.PI * 2);
      context.fillStyle = `rgba(255,255,255,${0.25 + (dot % 5) * 0.08})`;
      context.fill();
    }
    context.restore();

    particles.forEach((particle, index) => {
      const progress = (particle.phase + elapsed * particle.speed) % 1;
      const point = pointOnTrack(particle.lane, progress);
      const drift = Math.sin(elapsed * 1.4 + particle.drift) * height * 0.004;
      const mergeBoost = 1 - Math.min(1, Math.abs(progress - 0.76) * 8);
      const alpha = 0.28 + (index % 6) * 0.075 + mergeBoost * 0.24;

      context.beginPath();
      context.arc(point.x, point.y + drift, particle.size + mergeBoost * 0.65, 0, Math.PI * 2);
      context.fillStyle = `rgba(245,245,242,${Math.min(alpha, 0.92)})`;
      context.shadowColor = "rgba(255,255,255,0.38)";
      context.shadowBlur = mergeBoost * 8;
      context.fill();
      context.shadowBlur = 0;
    });

  };

  const tick = (time) => {
    draw(time);
    if (!reduceMotion.matches && isVisible && !document.hidden) {
      animationFrame = window.requestAnimationFrame(tick);
    }
  };

  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    draw(lastTime);
  };

  const start = () => {
    window.cancelAnimationFrame(animationFrame);
    lastTime = 0;
    if (reduceMotion.matches) {
      elapsed = 5.4;
      draw();
      return;
    }
    if (isVisible && !document.hidden) {
      animationFrame = window.requestAnimationFrame(tick);
    }
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);

  const visibilityObserver = new IntersectionObserver(([entry]) => {
    isVisible = entry.isIntersecting;
    start();
  }, { rootMargin: "100px" });
  visibilityObserver.observe(canvas);

  reduceMotion.addEventListener("change", start);
  document.addEventListener("visibilitychange", start);
  resize();
  start();

  const revealTargets = document.querySelectorAll(
    ".benefit, .principle, .prompt, .map-panel, .gate-copy, .gate-list li, .install"
  );

  if (reduceMotion.matches || !("IntersectionObserver" in window)) {
    revealTargets.forEach((element) => element.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 });

    revealTargets.forEach((element, index) => {
      element.classList.add("reveal");
      element.style.transitionDelay = `${Math.min(index % 3, 2) * 80}ms`;
      revealObserver.observe(element);
    });
  }
})();
