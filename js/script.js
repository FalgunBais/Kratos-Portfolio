document.addEventListener("DOMContentLoaded", () => {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const phrases = [
    "Aviation Enthusiast & Pilot",
    "B.Tech CS Student in Flight Control",
    "AWS Certified Cloud Navigator",
    "AI & Flight Deck Engineer",
  ];

  const typewriterEl = document.getElementById("typewriter");

  if (typewriterEl) {
    if (prefersReducedMotion) {
      typewriterEl.textContent = phrases[0];
    } else {
      let phraseIndex = 0;
      let charIndex = 0;
      let isDeleting = false;

      const tick = () => {
        const current = phrases[phraseIndex];

        if (!isDeleting) {
          charIndex++;
          typewriterEl.textContent = current.substring(0, charIndex);

          if (charIndex === current.length) {
            isDeleting = true;
            setTimeout(tick, 2000);
            return;
          }
          setTimeout(tick, 100);
        } else {
          charIndex--;
          typewriterEl.textContent = current.substring(0, charIndex);

          if (charIndex === 0) {
            isDeleting = false;
            phraseIndex = (phraseIndex + 1) % phrases.length;
            setTimeout(tick, 500);
            return;
          }
          setTimeout(tick, 50);
        }
      };

      tick();
    }
  }

  const sections = document.querySelectorAll(".section");
  const heroSection = document.querySelector(".hero-section");

  if (heroSection) {
    heroSection.classList.add("is-visible");
  }

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  sections.forEach((section) => revealObserver.observe(section));

  const playerSprite = document.getElementById("playerSprite");
  const playerSpriteContainer = document.getElementById("playerSpriteContainer");
  const levelPathSVG = document.getElementById("levelPath");
  const mainPath = document.getElementById("mainPath");

  const SVG_WIDTH = 880;

  // Cached layout dimensions to eliminate scroll-time DOM queries
  let cachedTotalLength = 0;
  let cachedScaleX = 1;
  let cachedScaleY = 1;
  let cachedSvgPageX = 0;
  let cachedSvgPageY = 0;
  let cachedDocHeight = 0;

  // Cached coordinate points for pre-sampled path lookups
  let cachedPoints = [];
  const NUM_SAMPLES = 500;

  const precomputePoints = () => {
    cachedPoints = [];
    if (!mainPath || !cachedTotalLength) return;
    for (let i = 0; i <= NUM_SAMPLES; i++) {
      const p = i / NUM_SAMPLES;
      const point = mainPath.getPointAtLength(p * cachedTotalLength);
      cachedPoints.push({ x: point.x, y: point.y });
    }
  };

  const generatePath = (docHeight) => {
    const nodes = [
      { x: 440, y: 0 },
      { x: 100, y: docHeight * 0.25 },
      { x: 780, y: docHeight * 0.4 },
      { x: 100, y: docHeight * 0.55 },
      { x: 780, y: docHeight * 0.7 },
      { x: 100, y: docHeight * 0.85 },
      { x: 440, y: docHeight },
    ];

    let d = `M ${nodes[0].x} ${nodes[0].y}`;

    for (let i = 1; i < nodes.length; i++) {
      const prev = nodes[i - 1];
      const curr = nodes[i];
      const midY = (prev.y + curr.y) / 2;
      d += ` C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`;
    }

    return d;
  };

  const updatePathLayout = () => {
    if (!levelPathSVG || !mainPath) return;

    const docHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );

    levelPathSVG.setAttribute("viewBox", `0 0 ${SVG_WIDTH} ${docHeight}`);
    mainPath.setAttribute("d", generatePath(docHeight));

    // Cache computations to avoid layout thrashing
    cachedTotalLength = mainPath.getTotalLength();
    
    const svgRect = levelPathSVG.getBoundingClientRect();
    const viewBox = levelPathSVG.viewBox.baseVal;
    
    cachedScaleX = svgRect.width / viewBox.width;
    cachedScaleY = svgRect.height / viewBox.height;
    
    cachedSvgPageX = svgRect.left + window.scrollX;
    cachedSvgPageY = svgRect.top + window.scrollY;
    
    cachedDocHeight = docHeight - window.innerHeight;

    // Pre-sample points along the newly calculated path
    precomputePoints();
  };

  updatePathLayout();

  const hpFill = document.getElementById("hpFill");
  const armorFill = document.getElementById("armorFill");
  const altTelemetry = document.getElementById("altTelemetry");
  const spdTelemetry = document.getElementById("spdTelemetry");

  let ticking = false;

  const onScroll = () => {
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(() => {
      const scrollTop =
        document.documentElement.scrollTop || document.body.scrollTop;

      const progress = cachedDocHeight > 0 ? Math.min(scrollTop / cachedDocHeight, 1) : 0;
      const scrollPercent = progress * 100;

      if (cachedPoints.length > 0 && playerSpriteContainer) {
        const sampleIndex = Math.round(progress * NUM_SAMPLES);
        const point = cachedPoints[Math.min(sampleIndex, NUM_SAMPLES)] || cachedPoints[0];

        const screenX = cachedSvgPageX + point.x * cachedScaleX;
        const screenY = cachedSvgPageY + point.y * cachedScaleY;

        // Calculate heading angle (banking)
        const nextSampleIndex = Math.min(sampleIndex + 5, NUM_SAMPLES);
        const nextPoint = cachedPoints[nextSampleIndex] || point;
        const dx = nextPoint.x - point.x;
        const dy = nextPoint.y - point.y;
        let angle = 0;
        if (dx !== 0 || dy !== 0) {
          angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
        }

        // Apply translate and rotation/banking
        playerSpriteContainer.style.transform = `translate3d(${screenX}px, ${screenY}px, 0) translate(-50%, -50%) rotate(${angle}deg)`;
      }

      if (hpFill) {
        hpFill.style.width = `${scrollPercent}%`;
      }

      // Calculate altitude: 0 to 35,000 FT
      if (altTelemetry) {
        const altVal = Math.floor(progress * 35000);
        altTelemetry.textContent = altVal.toLocaleString() + " FT";
      }

      // Calculate airspeed: accelerate from 140 KTS (takeoff) to 540 KTS (cruise)
      const speedVal = Math.floor(140 + progress * 400);
      if (spdTelemetry) {
        spdTelemetry.textContent = speedVal.toLocaleString() + " KTS";
      }
      if (armorFill) {
        armorFill.style.width = `${(speedVal / 540) * 100}%`;
      }

      // Calculate navigation fixes
      const wantedContainer = document.getElementById("hudWanted");
      if (wantedContainer) {
        const starCount = Math.min(Math.floor(progress * 5) + 1, 5);
        wantedContainer.setAttribute("aria-label", `Flight fixes: ${starCount}`);

        const stars = wantedContainer.querySelectorAll(".star");
        stars.forEach((star, index) => {
          if (index < starCount) {
            star.classList.add("active");
            if (index === starCount - 1) {
              star.classList.add("blink");
            } else {
              star.classList.remove("blink");
            }
          } else {
            star.classList.remove("active", "blink");
          }
        });
      }

      // A380 3D wireframe color transition based on scroll position
      if (window.a380Material) {
        if (progress < 0.2) {
          // Top: Light background - transition to deep indigo/black for contrast
          window.a380Material.color.setHex(0x12072b);
          window.a380Material.opacity = 0.12;
        } else if (progress < 0.55) {
          // Mid: Blue background - transition to clean white
          window.a380Material.color.setHex(0xffffff);
          window.a380Material.opacity = 0.15;
        } else {
          // Bottom: Deep space background - transition to glowing cyan
          window.a380Material.color.setHex(0x00f0ff);
          window.a380Material.opacity = 0.20;
        }
      }

      ticking = false;
    });
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("load", () => {
    updatePathLayout();
    onScroll();
  });
  onScroll();

  let resizeTimer;

  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      updatePathLayout();
      onScroll();
    }, 200);
  };

  window.addEventListener("resize", onResize);

  const bossCards = document.querySelectorAll(".boss-card");

  bossCards.forEach((card) => {
    card.addEventListener("click", () => {
      card.classList.toggle("is-flipped");
    });

    card.addEventListener("keydown", (e) => {
      if (e.code === "Enter" || e.code === "Space") {
        e.preventDefault();
        card.classList.toggle("is-flipped");
      }
    });
  });

  const konamiSequence = [
    "ArrowUp",
    "ArrowUp",
    "ArrowDown",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ArrowLeft",
    "ArrowRight",
    "KeyB",
    "KeyA",
  ];
  let konamiIndex = 0;

  document.addEventListener("keydown", (e) => {
    if (e.code === konamiSequence[konamiIndex]) {
      konamiIndex++;
      if (konamiIndex === konamiSequence.length) {
        document.body.classList.add("konami-active");
        setTimeout(() => {
          document.body.classList.remove("konami-active");
        }, 3000);
        konamiIndex = 0;
      }
    } else {
      konamiIndex = e.code === konamiSequence[0] ? 1 : 0;
    }
  });

  // Profile Views counter logic using localStorage
  const viewsCountEl = document.getElementById("viewsCount");
  if (viewsCountEl) {
    let views = parseInt(localStorage.getItem("profile_views") || "1337", 10);
    views++;
    localStorage.setItem("profile_views", views);
    viewsCountEl.textContent = views.toString().padStart(4, "0");
  }

  // "biryani" Keyboard Easter Egg logic
  let typedBuffer = "";
  const easterEggTarget = "biryani";

  document.addEventListener("keydown", (e) => {
    if (e.key && e.key.length === 1) {
      typedBuffer += e.key.toLowerCase();
      if (typedBuffer.length > easterEggTarget.length) {
        typedBuffer = typedBuffer.substring(typedBuffer.length - easterEggTarget.length);
      }
      if (typedBuffer === easterEggTarget) {
        const dialog = document.getElementById("bhaiEasterEggDialog");
        if (dialog) {
          dialog.style.display = "flex";
        }
        typedBuffer = "";
      }
    }
  });

  const closeBhaiDialogBtn = document.getElementById("closeBhaiDialogBtn");
  if (closeBhaiDialogBtn) {
    closeBhaiDialogBtn.addEventListener("click", () => {
      const dialog = document.getElementById("bhaiEasterEggDialog");
      if (dialog) {
        dialog.style.display = "none";
      }
    });
  }

  // Hacker Terminal Intro Gate logic
  const terminalGate = document.getElementById("terminalGate");
  const terminalDialogue = document.getElementById("terminalDialogue");
  const terminalInputLine = document.getElementById("terminalInputLine");
  const terminalInput = document.getElementById("terminalInput");
  const terminalBody = document.getElementById("terminalBody");

  if (terminalGate && terminalDialogue && terminalInputLine && terminalInput) {
    terminalGate.addEventListener("click", () => {
      terminalInput.focus();
    });

    const question = "> ENTER FLIGHT DESTINATION TO INITIALIZE FLIGHT PLAN... ";
    let charIdx = 0;

    const typeDialogue = () => {
      if (charIdx < question.length) {
        terminalDialogue.textContent += question.charAt(charIdx);
        charIdx++;
        setTimeout(typeDialogue, 40);
      } else {
        terminalInputLine.style.display = "flex";
        terminalInput.focus();
      }
    };

    setTimeout(typeDialogue, 800);

    terminalInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const val = terminalInput.value.trim();
        if (!val) return;

        terminalInputLine.style.display = "none";

        const userLine = document.createElement("div");
        userLine.className = "terminal-line user-entered";
        userLine.textContent = `captain@falgun_air:~$ ${val}`;
        terminalBody.appendChild(userLine);
        terminalBody.scrollTop = terminalBody.scrollHeight;

        // Print decryption progress
        setTimeout(() => {
          const decryptLine = document.createElement("div");
          decryptLine.className = "terminal-line";
          decryptLine.textContent = "> ASSIGNING FLIGHT COORDINATES... [OK]";
          terminalBody.appendChild(decryptLine);
          terminalBody.scrollTop = terminalBody.scrollHeight;

          // Print access granted sat-link
          setTimeout(() => {
            const satLine = document.createElement("div");
            satLine.className = "terminal-line";
            satLine.textContent = "> IGNITING ENGINES... THRUST 100%";
            terminalBody.appendChild(satLine);
            terminalBody.scrollTop = terminalBody.scrollHeight;

            // Fade out terminal gate, fade in flight loading splash
            setTimeout(() => {
              terminalGate.classList.add("fade-out");
              
              const gtaSplash = document.getElementById("gtaSplash");
              const splashBarFill = document.getElementById("splashBarFill");
              const splashLoadingText = document.getElementById("splashLoadingText");

              if (gtaSplash && splashBarFill) {
                gtaSplash.style.display = "flex";
                
                let pct = 0;
                const fillInterval = setInterval(() => {
                  pct += 2;
                  if (pct <= 100) {
                    splashBarFill.style.width = `${pct}%`;
                    if (pct === 40 && splashLoadingText) {
                      splashLoadingText.textContent = "CALCULATING WAKE TURBULENCE...";
                    }
                    if (pct === 80 && splashLoadingText) {
                      splashLoadingText.textContent = "TAKE-OFF GRANTED!";
                    }
                  } else {
                    clearInterval(fillInterval);
                    // Dismiss Loading Screen
                    setTimeout(() => {
                      gtaSplash.classList.add("slide-up");
                      setTimeout(() => {
                        gtaSplash.style.display = "none";
                        terminalGate.style.display = "none";
                      }, 800);
                    }, 400);
                  }
                }, 40);
              } else {
                // Fallback in case of missing DOM elements
                setTimeout(() => {
                  terminalGate.style.display = "none";
                }, 800);
              }
            }, 800);
          }, 600);
        }, 500);
      }
    });
  }

  // 3D Three.js Airbus A380 Background Integration
  const init3DAirplane = () => {
    const canvas = document.getElementById("a380Canvas");
    if (!canvas) return;

    if (typeof THREE === "undefined") {
      console.warn("Three.js not loaded. WebGL A380 rendering skipped.");
      return;
    }

    // Scene setup
    const scene = new THREE.Scene();

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 30);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true, // Transparent context to let sunset/sky gradients show
      antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Root Group
    const airplaneGroup = new THREE.Group();
    scene.add(airplaneGroup);

    // Global wireframe material
    const baseColor = new THREE.Color(0x12072b);
    const airplaneMaterial = new THREE.MeshBasicMaterial({
      color: baseColor,
      wireframe: true,
      transparent: true,
      opacity: 0.12
    });

    // --- Constructing A380 Procedural Geometry ---
    
    // Fuselage (Stretched Cylinder)
    const bodyGeom = new THREE.CylinderGeometry(1.5, 1.5, 18, 16);
    bodyGeom.rotateX(Math.PI / 2); // Align along Z (front-to-back)
    const bodyMesh = new THREE.Mesh(bodyGeom, airplaneMaterial);
    airplaneGroup.add(bodyMesh);

    // Nose Cone
    const noseGeom = new THREE.ConeGeometry(1.5, 3.5, 16);
    noseGeom.rotateX(-Math.PI / 2);
    noseGeom.translate(0, 0, 10.75);
    const noseMesh = new THREE.Mesh(noseGeom, airplaneMaterial);
    airplaneGroup.add(noseMesh);

    // Tail Cone
    const tailGeom = new THREE.ConeGeometry(1.5, 4.5, 16);
    tailGeom.rotateX(Math.PI / 2);
    tailGeom.translate(0, 0, -11.25);
    const tailMesh = new THREE.Mesh(tailGeom, airplaneMaterial);
    airplaneGroup.add(tailMesh);

    // Left Main Wing
    const leftWingGeom = new THREE.BoxGeometry(16, 0.1, 2.5);
    leftWingGeom.translate(-8, 0, 0); // Pivot at wing root
    const leftWingMesh = new THREE.Mesh(leftWingGeom, airplaneMaterial);
    leftWingMesh.position.set(-0.8, 0, -1);
    leftWingMesh.rotation.y = -Math.PI / 6; // Sweep back angle
    leftWingMesh.rotation.z = Math.PI / 24;  // Dihedral angle (tilt up)
    airplaneGroup.add(leftWingMesh);

    // Right Main Wing
    const rightWingGeom = new THREE.BoxGeometry(16, 0.1, 2.5);
    rightWingGeom.translate(8, 0, 0); // Pivot at wing root
    const rightWingMesh = new THREE.Mesh(rightWingGeom, airplaneMaterial);
    rightWingMesh.position.set(0.8, 0, -1);
    rightWingMesh.rotation.y = Math.PI / 6;  // Sweep back angle
    rightWingMesh.rotation.z = -Math.PI / 24; // Dihedral angle (tilt up)
    airplaneGroup.add(rightWingMesh);

    // Vertical Stabilizer (Tail Fin)
    const finGeom = new THREE.BoxGeometry(0.1, 5, 3);
    finGeom.translate(0, 2.5, -1.2);
    const finMesh = new THREE.Mesh(finGeom, airplaneMaterial);
    finMesh.position.set(0, 1, -9);
    finMesh.rotation.x = -Math.PI / 10;
    airplaneGroup.add(finMesh);

    // Horizontal Stabilizers
    const stabLeftGeom = new THREE.BoxGeometry(5, 0.08, 1.5);
    stabLeftGeom.translate(-2.5, 0, 0);
    const stabLeftMesh = new THREE.Mesh(stabLeftGeom, airplaneMaterial);
    stabLeftMesh.position.set(-0.5, 0.1, -10);
    stabLeftMesh.rotation.y = -Math.PI / 8;
    airplaneGroup.add(stabLeftMesh);

    const stabRightGeom = new THREE.BoxGeometry(5, 0.08, 1.5);
    stabRightGeom.translate(2.5, 0, 0);
    const stabRightMesh = new THREE.Mesh(stabRightGeom, airplaneMaterial);
    stabRightMesh.position.set(0.5, 0.1, -10);
    stabRightMesh.rotation.y = Math.PI / 8;
    airplaneGroup.add(stabRightMesh);

    // Quad Turbofans (A380 Signature Engines)
    const createEngine = (x, y, z) => {
      const engineGeom = new THREE.CylinderGeometry(0.6, 0.6, 2.2, 8);
      engineGeom.rotateX(Math.PI / 2);
      const engineMesh = new THREE.Mesh(engineGeom, airplaneMaterial);
      engineMesh.position.set(x, y, z);
      airplaneGroup.add(engineMesh);
    };

    createEngine(-3.5, -0.4, 0.8);
    createEngine(3.5, -0.4, 0.8);
    createEngine(-7, -0.2, 1.7);
    createEngine(7, -0.2, 1.7);

    // Initial 3D Tilt perspective position
    airplaneGroup.rotation.set(0.2, -0.6, 0.15);

    // Expose to window context for scroll manipulation
    window.a380Material = airplaneMaterial;

    // --- Interactive Mouse Drag Rotations ---
    let isDragging = false;
    let previousPointerPos = { x: 0, y: 0 };

    const onPointerDown = (e) => {
      const tag = e.target.tagName;
      if (tag !== 'A' && tag !== 'BUTTON' && tag !== 'INPUT' && !e.target.closest('.contact-links') && !e.target.closest('.boss-card')) {
        isDragging = true;
        const pageX = e.pageX || (e.touches && e.touches[0].pageX);
        const pageY = e.pageY || (e.touches && e.touches[0].pageY);
        previousPointerPos = { x: pageX, y: pageY };
      }
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const pageX = e.pageX || (e.touches && e.touches[0].pageX);
      const pageY = e.pageY || (e.touches && e.touches[0].pageY);

      const deltaMove = {
        x: pageX - previousPointerPos.x,
        y: pageY - previousPointerPos.y
      };

      airplaneGroup.rotation.y += deltaMove.x * 0.005;
      airplaneGroup.rotation.x += deltaMove.y * 0.005;

      previousPointerPos = { x: pageX, y: pageY };
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    document.addEventListener("mousedown", onPointerDown, { passive: true });
    document.addEventListener("mousemove", onPointerMove, { passive: true });
    document.addEventListener("mouseup", onPointerUp, { passive: true });

    document.addEventListener("touchstart", onPointerDown, { passive: true });
    document.addEventListener("touchmove", onPointerMove, { passive: true });
    document.addEventListener("touchend", onPointerUp, { passive: true });

    // Handle Window Resizing
    window.addEventListener("resize", () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Animation Rendering Loop
    const renderLoop = () => {
      requestAnimationFrame(renderLoop);

      // Auto-rotation around the vertical axis when not dragged
      if (!isDragging) {
        airplaneGroup.rotation.y += 0.0015;
        // Keep pitch tilt within comfortable cockpit sightlines
        airplaneGroup.rotation.x = Math.max(-0.4, Math.min(0.4, airplaneGroup.rotation.x));
      }

      renderer.render(scene, camera);
    };

    renderLoop();
  };

  init3DAirplane();
});
