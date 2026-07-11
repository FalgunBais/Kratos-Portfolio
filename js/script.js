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

      // A380 3D shaded model lighting & color transition based on scroll position
      if (window.a380Lights && window.a380Materials) {
        const lights = window.a380Lights;
        const mats = window.a380Materials;

        if (progress < 0.2) {
          // Top Zone: Peach/Gold Sunrise Background - dark matte silhouette contrast
          lights.ambient.color.setHex(0xffb86c);
          lights.ambient.intensity = 0.55;
          
          lights.directional.color.setHex(0xfff2e6);
          lights.directional.intensity = 1.1;
          
          lights.cyan.intensity = 0.0;
          lights.magenta.intensity = 0.0;

          mats.fuselage.color.setHex(0x0a0518);
          mats.fuselage.roughness = 0.95;
          mats.fuselage.metalness = 0.05;
          mats.fuselage.emissive.setHex(0x000000);
        } else if (progress < 0.55) {
          // Mid Zone: Sky Blue Background - bright, white/light gray metallic reflections
          lights.ambient.color.setHex(0xffffff);
          lights.ambient.intensity = 0.65;
          
          lights.directional.color.setHex(0xe6f2ff);
          lights.directional.intensity = 1.3;
          
          lights.cyan.intensity = 0.45;
          lights.cyan.color.setHex(0x00f0ff);
          lights.magenta.intensity = 0.25;
          lights.magenta.color.setHex(0xff007f);

          mats.fuselage.color.setHex(0xdddddd);
          mats.fuselage.roughness = 0.25;
          mats.fuselage.metalness = 0.85;
          mats.fuselage.emissive.setHex(0x000000);
        } else {
          // Bottom Zone: Deep Space/Night Background - cyan with a subtle emissive glow
          lights.ambient.color.setHex(0x1a0d33);
          lights.ambient.intensity = 0.2;
          
          lights.directional.color.setHex(0x00f0ff);
          lights.directional.intensity = 0.4;
          
          lights.cyan.intensity = 2.2;
          lights.cyan.color.setHex(0x00f0ff);
          lights.magenta.intensity = 1.8;
          lights.magenta.color.setHex(0xff007f);

          mats.fuselage.color.setHex(0x00f0ff);
          mats.fuselage.roughness = 0.15;
          mats.fuselage.metalness = 0.9;
          mats.fuselage.emissive.setHex(0x002d3d); // Subtle cyan emissive glow
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

    if (typeof THREE === "undefined" || typeof THREE.GLTFLoader === "undefined" || typeof THREE.DRACOLoader === "undefined") {
      console.warn("Three.js libraries not fully loaded. WebGL A380 rendering skipped.");
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
      alpha: true, // Transparent context to let sky gradients show
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    // Enable soft shadows
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // --- Postprocessing UnrealBloomPass Pipeline ---
    const renderScene = new THREE.RenderPass(scene, camera);
    const bloomPass = new THREE.UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.3,   // Bloom strength target
      0.45,  // Radius
      0.85   // Threshold
    );

    const composer = new THREE.EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // --- Cinematic Lights ---
    // Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    // Hemisphere Light (Sky illumination with ground bounce reflections)
    const hemiLight = new THREE.HemisphereLight(0xe6f2ff, 0xffd8b3, 0.6);
    scene.add(hemiLight);

    // Directional Sun Light (casts shadows)
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(10, 20, 15);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 60;
    dirLight.shadow.bias = -0.0002;
    scene.add(dirLight);

    // Rim Fill Light Left (Cyan)
    const rimLightLeft = new THREE.PointLight(0x00d2ff, 0.4, 60);
    rimLightLeft.position.set(-25, 5, 5);
    scene.add(rimLightLeft);

    // Rim Fill Light Right (Pink/Magenta)
    const rimLightRight = new THREE.PointLight(0xd946ef, 0.3, 60);
    rimLightRight.position.set(25, -5, -5);
    scene.add(rimLightRight);

    // Expose lights to window context
    window.a380Lights = {
      ambient: ambientLight,
      directional: dirLight,
      cyan: rimLightLeft,
      magenta: rimLightRight
    };

    // Root Group
    const airplaneGroup = new THREE.Group();
    scene.add(airplaneGroup);

    // --- Physically Based Materials ---
    // Dynamic material interpolators
    const activeMaterialSettings = {
      color: new THREE.Color(0xffffff), // Matte white HERO default
      roughness: 0.7,
      metalness: 0.1,
      emissive: new THREE.Color(0x000000),
      bloomStrength: 0.15,
      rimLeftColor: new THREE.Color(0x00d2ff),
      rimLeftIntensity: 0.4,
      rimRightColor: new THREE.Color(0xd946ef),
      rimRightIntensity: 0.3,
      dirLightColor: new THREE.Color(0xfff2e6),
      dirLightIntensity: 1.0
    };

    const currentMaterialSettings = {
      color: new THREE.Color(0xffffff),
      roughness: 0.7,
      metalness: 0.1,
      emissive: new THREE.Color(0x000000)
    };

    // Fuselage material
    const fuselageMaterial = new THREE.MeshStandardMaterial({
      color: currentMaterialSettings.color,
      roughness: currentMaterialSettings.roughness,
      metalness: currentMaterialSettings.metalness,
      flatShading: false
    });

    // Windshield glass material
    const windshieldMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a1128,
      roughness: 0.1,
      metalness: 0.95
    });

    // Jet Engine metal alloy
    const engineMaterial = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.4,
      metalness: 0.8
    });

    // Emissive exhaust plume
    const exhaustMaterial = new THREE.MeshBasicMaterial({
      color: 0x00d2ff
    });

    window.a380Materials = {
      fuselage: fuselageMaterial,
      windshield: windshieldMaterial,
      engine: engineMaterial
    };

    const navLights = [];
    const fans = [];

    // --- Procedural Fallback Airplane Builder ---
    const buildProceduralAirplane = () => {
      const group = new THREE.Group();

      // Ensure transparent opacity for background silhouette aesthetic
      fuselageMaterial.transparent = true;
      fuselageMaterial.opacity = 0.22;
      windshieldMaterial.transparent = true;
      windshieldMaterial.opacity = 0.45;
      engineMaterial.transparent = true;
      engineMaterial.opacity = 0.25;

      // Fuselage (Cylinder)
      const fuselageGeom = new THREE.CylinderGeometry(1.2, 0.9, 14, 16);
      fuselageGeom.rotateX(Math.PI / 2);
      const fuselageMesh = new THREE.Mesh(fuselageGeom, fuselageMaterial);
      fuselageMesh.castShadow = true;
      fuselageMesh.receiveShadow = true;
      group.add(fuselageMesh);

      // Cockpit Nose (Cone)
      const noseGeom = new THREE.ConeGeometry(1.2, 3, 16);
      noseGeom.rotateX(Math.PI / 2);
      noseGeom.translate(0, 0, 8.5);
      const noseMesh = new THREE.Mesh(noseGeom, fuselageMaterial);
      noseMesh.castShadow = true;
      noseMesh.receiveShadow = true;
      group.add(noseMesh);

      // Cockpit Windshield
      const windshieldGeom = new THREE.BoxGeometry(1.3, 0.6, 1.2);
      const windshieldMesh = new THREE.Mesh(windshieldGeom, windshieldMaterial);
      windshieldMesh.position.set(0, 0.6, 7.2);
      windshieldMesh.rotation.x = -Math.PI / 6;
      group.add(windshieldMesh);

      // Tail Cone
      const tailConeGeom = new THREE.ConeGeometry(0.9, 3, 16);
      tailConeGeom.rotateX(-Math.PI / 2);
      tailConeGeom.translate(0, 0, -8.5);
      const tailConeMesh = new THREE.Mesh(tailConeGeom, fuselageMaterial);
      tailConeMesh.castShadow = true;
      tailConeMesh.receiveShadow = true;
      group.add(tailConeMesh);

      // Main Wings (Left and Right - Swept Back)
      const leftWingGeom = new THREE.BoxGeometry(8, 0.15, 3);
      leftWingGeom.translate(-4, 0, -0.5);
      const leftWing = new THREE.Mesh(leftWingGeom, fuselageMaterial);
      leftWing.position.set(0, -0.2, 0);
      leftWing.rotation.y = -Math.PI / 5;
      leftWing.rotation.z = Math.PI / 24;
      leftWing.castShadow = true;
      group.add(leftWing);

      const rightWingGeom = new THREE.BoxGeometry(8, 0.15, 3);
      rightWingGeom.translate(4, 0, -0.5);
      const rightWing = new THREE.Mesh(rightWingGeom, fuselageMaterial);
      rightWing.position.set(0, -0.2, 0);
      rightWing.rotation.y = Math.PI / 5;
      rightWing.rotation.z = -Math.PI / 24;
      rightWing.castShadow = true;
      group.add(rightWing);

      // Horizontal Stabilizers (Rear elevator fins)
      const leftStabGeom = new THREE.BoxGeometry(3, 0.1, 1.5);
      leftStabGeom.translate(-1.5, 0, -0.2);
      const leftStab = new THREE.Mesh(leftStabGeom, fuselageMaterial);
      leftStab.position.set(0, 0.2, -7.2);
      leftStab.rotation.y = -Math.PI / 6;
      leftStab.castShadow = true;
      group.add(leftStab);

      const rightStabGeom = new THREE.BoxGeometry(3, 0.1, 1.5);
      rightStabGeom.translate(1.5, 0, -0.2);
      const rightStab = new THREE.Mesh(rightStabGeom, fuselageMaterial);
      rightStab.position.set(0, 0.2, -7.2);
      rightStab.rotation.y = Math.PI / 6;
      rightStab.castShadow = true;
      group.add(rightStab);

      // Vertical Stabilizer (Tail fin)
      const finGeom = new THREE.BoxGeometry(0.15, 3.5, 2.5);
      finGeom.translate(0, 1.75, -0.5);
      const fin = new THREE.Mesh(finGeom, fuselageMaterial);
      fin.position.set(0, 0.9, -7.2);
      fin.rotation.x = Math.PI / 10;
      fin.castShadow = true;
      group.add(fin);

      // Jet Engines (Underwing)
      const leftEngineGeom = new THREE.CylinderGeometry(0.55, 0.45, 2.8, 12);
      leftEngineGeom.rotateX(Math.PI / 2);
      const leftEngine = new THREE.Mesh(leftEngineGeom, engineMaterial);
      leftEngine.position.set(-3.2, -0.8, 0.5);
      leftEngine.castShadow = true;
      group.add(leftEngine);

      const rightEngineGeom = new THREE.CylinderGeometry(0.55, 0.45, 2.8, 12);
      rightEngineGeom.rotateX(Math.PI / 2);
      const rightEngine = new THREE.Mesh(rightEngineGeom, engineMaterial);
      rightEngine.position.set(3.2, -0.8, 0.5);
      rightEngine.castShadow = true;
      group.add(rightEngine);

      // Engine Exhaust Plumes
      const exhaustGeom = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 12);
      exhaustGeom.rotateX(Math.PI / 2);
      const leftExhaust = new THREE.Mesh(exhaustGeom, exhaustMaterial);
      leftExhaust.position.set(-3.2, -0.8, -0.9);
      group.add(leftExhaust);

      const rightExhaust = new THREE.Mesh(exhaustGeom, exhaustMaterial);
      rightExhaust.position.set(3.2, -0.8, -0.9);
      group.add(rightExhaust);

      // Scale to fit nicely as a background silhouette
      group.scale.set(1.4, 1.4, 1.4);
      return group;
    };

    // --- GLTF Loading (No procedural geometry creation) ---
    const loader = new THREE.GLTFLoader();
    const dracoLoader = new THREE.DRACOLoader();
    dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.4.3/");
    loader.setDRACOLoader(dracoLoader);

    // Target the local A380 model file in the workspace root
    const modelUrl = "a380.glb";
    let loadedMesh = null;

    loader.load(
      modelUrl,
      (gltf) => {
        loadedMesh = gltf.scene;
        
        // Keynote scale & placement
        loadedMesh.scale.setScalar(0.18);
        loadedMesh.rotation.set(Math.PI / 2, 0, Math.PI);
        loadedMesh.position.set(0, 0, 0);

        // Apply realistic PBR materials, shadows, and opacity
        loadedMesh.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
            
            // Set material properties
            node.material = fuselageMaterial;
            node.material.transparent = true;
            node.material.opacity = 0.20; // 0.15–0.20 opacity as requested
          }
        });

        airplaneGroup.add(loadedMesh);
        window.a380Model = loadedMesh;
        console.log("Real Airbus A380 GLB model loaded successfully.");
      },
      undefined,
      (err) => {
        console.warn("A380 model file 'a380.glb' not found or failed to load. Using procedural jet model fallback.", err);
        const fallbackAirplane = buildProceduralAirplane();
        airplaneGroup.add(fallbackAirplane);
        window.a380Model = fallbackAirplane;
      }
    );

    // Initial 3D tilt coordinates
    airplaneGroup.rotation.set(0.1, -0.5, 0.1);

    // --- Interactive Mouse Cursor Rotation (±6°) ---
    let targetRotation = { x: 0.1, y: -0.5 };

    document.addEventListener("mousemove", (e) => {
      // Normalize cursor coordinate points to [-1, 1]
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;

      // ±6 degrees is ~0.1 radians
      targetRotation.y = -0.5 + nx * 0.1;
      targetRotation.x = 0.1 + ny * 0.1;
    });

    // Touch coordinate track
    document.addEventListener("touchmove", (e) => {
      if (e.touches && e.touches.length > 0) {
        const nx = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
        const ny = (e.touches[0].clientY / window.innerHeight) * 2 - 1;
        targetRotation.y = -0.5 + nx * 0.1;
        targetRotation.x = 0.1 + ny * 0.1;
      }
    }, { passive: true });

    // Handle Window Resizing
    window.addEventListener("resize", () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    });

    // --- IntersectionObserver for Dynamic Portfolio Sections ---
    const portfolioSections = [
      { id: "terminalGate", state: "HERO" },
      { id: "gtaSplash", state: "HERO" },
      { id: "about", state: "ABOUT" },
      { id: "skills", state: "SKILLS" },
      { id: "certifications", state: "CERTIFICATIONS" },
      { id: "projects", state: "PROJECTS" },
      { id: "experience", state: "EXPERIENCE" },
      { id: "contact", state: "CONTACT" }
    ];

    const observerOptions = {
      root: null,
      rootMargin: "-25% 0px -25% 0px",
      threshold: 0.1
    };

    let activeSectionState = "HERO";

    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const match = portfolioSections.find(s => entry.target.id === s.id);
          if (match) {
            activeSectionState = match.state;
          }
        }
      });
    };

    const sectionObserver = new IntersectionObserver(observerCallback, observerOptions);
    portfolioSections.forEach(sec => {
      const element = document.getElementById(sec.id);
      if (element) sectionObserver.observe(element);
    });

    // Also observe the inner hero container directly to trigger HERO state immediately
    const mainHeroContainer = document.querySelector(".hero-container");
    if (mainHeroContainer) {
      const heroObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) activeSectionState = "HERO";
      }, observerOptions);
      heroObserver.observe(mainHeroContainer);
    }

    // --- Tab Inactive Pause Logic ---
    let tabVisible = true;
    document.addEventListener("visibilitychange", () => {
      tabVisible = (document.visibilityState === "visible");
    });

    // --- Dynamic Scale calculator ---
    const getResponsiveScale = () => {
      const width = window.innerWidth;
      if (width > 1024) return 1.0; // Desktop
      if (width > 768) return 0.72; // Tablet
      return 0.45; // Mobile (low poly simplified render logic)
    };

    // --- FPS-Based Quality Throttling ---
    let frameCount = 0;
    let lastTime = performance.now();
    let lowPerfMode = false;

    // Animation Rendering Loop
    const renderLoop = () => {
      requestAnimationFrame(renderLoop);

      // Skip render calculations if tab is inactive (performance preservation)
      if (!tabVisible) return;

      const now = performance.now();

      // FPS Quality calculation
      frameCount++;
      if (now - lastTime >= 2000) {
        const fps = (frameCount * 1000) / (now - lastTime);
        if (fps < 40 && !lowPerfMode) {
          console.warn("Performance warning (" + Math.round(fps) + " FPS). Disabling soft shadows/bloom passes.");
          lowPerfMode = true;
          renderer.shadowMap.enabled = false;
          renderer.setPixelRatio(1);
          composer.passes.forEach(pass => {
            if (pass instanceof THREE.UnrealBloomPass) pass.strength = 0;
          });
          airplaneGroup.traverse((node) => {
            if (node.isMesh) {
              node.castShadow = false;
              node.receiveShadow = false;
            }
          });
        }
        frameCount = 0;
        lastTime = now;
      }

      // --- 1. Navigation Lights Flashing Logic ---
      const strobeOn = (Math.floor(now / 150) % 6 === 0); // Wingtip strobes rapid double flash
      const beaconIntensity = Math.max(0, Math.sin(now * 0.003)); // Beacon slow sinusoidal red pulse

      navLights.forEach(light => {
        if (light.isStrobe) {
          light.pLight.intensity = strobeOn ? light.intensity : 0;
          light.mesh.material.color.setHex(strobeOn ? 0xffffff : 0x222222);
        } else if (light.isBeacon) {
          light.pLight.intensity = beaconIntensity * light.intensity;
          // Smooth color pulse
          light.mesh.material.color.setRGB(beaconIntensity, 0.0, 0.0);
        } else {
          // Standard NAV lights (Port Red, Starboard Green) are steady on
          light.pLight.intensity = light.intensity;
        }
      });

      // --- 2. Turbofan rotation ---
      fans.forEach(fan => {
        fan.rotation.z += 0.08;
      });

      // --- 3. Keynote Idle Hover animations ---
      // Banking left/right (±3° is ~0.05 rad)
      const idleBank = Math.sin(now * 0.0006) * 0.05;
      // Pitch nose (±1° is ~0.017 rad)
      const idlePitch = Math.cos(now * 0.001) * 0.017;
      // Floating vertical translation
      const idleFloat = Math.sin(now * 0.0012) * 0.25;

      // --- 4. Mouse Rotation Interp ---
      airplaneGroup.rotation.y = THREE.MathUtils.lerp(airplaneGroup.rotation.y, targetRotation.y, 0.05);
      airplaneGroup.rotation.x = THREE.MathUtils.lerp(airplaneGroup.rotation.x, targetRotation.x + idlePitch, 0.05);
      airplaneGroup.rotation.z = THREE.MathUtils.lerp(airplaneGroup.rotation.z, 0.15 + idleBank, 0.05);

      // --- 5. Scroll-driven scaling and sway drift ---
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      const progress = cachedDocHeight > 0 ? Math.min(scrollTop / cachedDocHeight, 1) : 0;

      const responsiveBaseScale = getResponsiveScale();
      const targetScale = responsiveBaseScale * (1.0 - progress * 0.25);
      airplaneGroup.scale.setScalar(THREE.MathUtils.lerp(airplaneGroup.scale.x, targetScale, 0.05));

      // Side to side sway drift
      const targetX = Math.sin(progress * Math.PI * 2) * 2.0; 
      airplaneGroup.position.x = THREE.MathUtils.lerp(airplaneGroup.position.x, targetX, 0.05);

      // Float offset
      const targetY = -0.5 + progress * 1.5 + idleFloat;
      airplaneGroup.position.y = THREE.MathUtils.lerp(airplaneGroup.position.y, targetY, 0.05);

      // --- 6. Section-based Color & Lighting Transition Setup ---
      // Update targets based on current active portfolio section
      switch (activeSectionState) {
        case "HERO":
          activeMaterialSettings.color.setHex(0xffffff); // Matte white
          activeMaterialSettings.roughness = 0.7;
          activeMaterialSettings.metalness = 0.15;
          activeMaterialSettings.emissive.setHex(0x000000);
          activeMaterialSettings.bloomStrength = lowPerfMode ? 0.0 : 0.15;
          
          activeMaterialSettings.rimLeftColor.setHex(0x00f0ff);
          activeMaterialSettings.rimLeftIntensity = 0.2;
          activeMaterialSettings.rimRightColor.setHex(0xff00aa);
          activeMaterialSettings.rimRightIntensity = 0.1;
          
          activeMaterialSettings.dirLightColor.setHex(0xfff2e6);
          activeMaterialSettings.dirLightIntensity = 1.0;
          break;
        case "ABOUT":
          activeMaterialSettings.color.setHex(0xffffff); // Bright white
          activeMaterialSettings.roughness = 0.45;
          activeMaterialSettings.metalness = 0.35;
          activeMaterialSettings.emissive.setHex(0x000000);
          activeMaterialSettings.bloomStrength = lowPerfMode ? 0.0 : 0.2;
          
          activeMaterialSettings.rimLeftColor.setHex(0xffffff);
          activeMaterialSettings.rimLeftIntensity = 0.4;
          activeMaterialSettings.rimRightColor.setHex(0xe6f2ff);
          activeMaterialSettings.rimRightIntensity = 0.3;
          
          activeMaterialSettings.dirLightColor.setHex(0xffffff);
          activeMaterialSettings.dirLightIntensity = 1.3;
          break;
        case "SKILLS":
          activeMaterialSettings.color.setHex(0xc0c0c0); // Metallic silver
          activeMaterialSettings.roughness = 0.2;
          activeMaterialSettings.metalness = 0.9;
          activeMaterialSettings.emissive.setHex(0x001133); // Blue accents
          activeMaterialSettings.bloomStrength = lowPerfMode ? 0.0 : 0.35;
          
          activeMaterialSettings.rimLeftColor.setHex(0x00a8cc);
          activeMaterialSettings.rimLeftIntensity = 1.2;
          activeMaterialSettings.rimRightColor.setHex(0x0055ff);
          activeMaterialSettings.rimRightIntensity = 0.6;
          
          activeMaterialSettings.dirLightColor.setHex(0xe6f2ff);
          activeMaterialSettings.dirLightIntensity = 1.0;
          break;
        case "PROJECTS":
          activeMaterialSettings.color.setHex(0xffd8b3); // Sunset orange
          activeMaterialSettings.roughness = 0.3;
          activeMaterialSettings.metalness = 0.8;
          activeMaterialSettings.emissive.setHex(0x331100); 
          activeMaterialSettings.bloomStrength = lowPerfMode ? 0.0 : 0.45;
          
          activeMaterialSettings.rimLeftColor.setHex(0xff7f00);
          activeMaterialSettings.rimLeftIntensity = 1.6;
          activeMaterialSettings.rimRightColor.setHex(0xff3300);
          activeMaterialSettings.rimRightIntensity = 1.0;
          
          activeMaterialSettings.dirLightColor.setHex(0xffb86c);
          activeMaterialSettings.dirLightIntensity = 1.5;
          break;
        case "EXPERIENCE":
          activeMaterialSettings.color.setHex(0xe0f7fa); // Cool cyan
          activeMaterialSettings.roughness = 0.25;
          activeMaterialSettings.metalness = 0.8;
          activeMaterialSettings.emissive.setHex(0x002233);
          activeMaterialSettings.bloomStrength = lowPerfMode ? 0.0 : 0.3;
          
          activeMaterialSettings.rimLeftColor.setHex(0x00e5ff);
          activeMaterialSettings.rimLeftIntensity = 1.5;
          activeMaterialSettings.rimRightColor.setHex(0x00838f);
          activeMaterialSettings.rimRightIntensity = 0.8;
          
          activeMaterialSettings.dirLightColor.setHex(0xe0f7fa);
          activeMaterialSettings.dirLightIntensity = 1.1;
          break;
        case "CONTACT":
          activeMaterialSettings.color.setHex(0x0a1128); // Deep blue
          activeMaterialSettings.roughness = 0.15;
          activeMaterialSettings.metalness = 0.95;
          activeMaterialSettings.emissive.setHex(0x00a8cc); // Emissive cyan glow
          activeMaterialSettings.bloomStrength = lowPerfMode ? 0.0 : 0.95; // Stronger bloom
          
          activeMaterialSettings.rimLeftColor.setHex(0x00f0ff);
          activeMaterialSettings.rimLeftIntensity = 2.8;
          activeMaterialSettings.rimRightColor.setHex(0x005f73);
          activeMaterialSettings.rimRightIntensity = 1.4;
          
          activeMaterialSettings.dirLightColor.setHex(0x00a8cc);
          activeMaterialSettings.dirLightIntensity = 0.25;
          break;
      }

      // Smoothly interpolate PBR material properties (approx 1.0 sec transition)
      const interpFactor = 0.04;
      currentMaterialSettings.color.lerp(activeMaterialSettings.color, interpFactor);
      currentMaterialSettings.roughness = THREE.MathUtils.lerp(currentMaterialSettings.roughness, activeMaterialSettings.roughness, interpFactor);
      currentMaterialSettings.metalness = THREE.MathUtils.lerp(currentMaterialSettings.metalness, activeMaterialSettings.metalness, interpFactor);
      currentMaterialSettings.emissive.lerp(activeMaterialSettings.emissive, interpFactor);

      fuselageMaterial.color.copy(currentMaterialSettings.color);
      fuselageMaterial.roughness = currentMaterialSettings.roughness;
      fuselageMaterial.metalness = currentMaterialSettings.metalness;
      fuselageMaterial.emissive.copy(currentMaterialSettings.emissive);

      // Interpolate bloom and light attributes
      if (!lowPerfMode) {
        bloomPass.strength = THREE.MathUtils.lerp(bloomPass.strength, activeMaterialSettings.bloomStrength, interpFactor);
      }
      rimLightLeft.color.lerp(activeMaterialSettings.rimLeftColor, interpFactor);
      rimLightLeft.intensity = THREE.MathUtils.lerp(rimLightLeft.intensity, activeMaterialSettings.rimLeftIntensity, interpFactor);

      rimLightRight.color.lerp(activeMaterialSettings.rimRightColor, interpFactor);
      rimLightRight.intensity = THREE.MathUtils.lerp(rimLightRight.intensity, activeMaterialSettings.rimRightIntensity, interpFactor);

      dirLight.color.lerp(activeMaterialSettings.dirLightColor, interpFactor);
      dirLight.intensity = THREE.MathUtils.lerp(dirLight.intensity, activeMaterialSettings.dirLightIntensity, interpFactor);

      // Render scene via composer pass chain
      composer.render();
    };

    renderLoop();
  };

  // init3DAirplane(); // Disabled background 3D silhouette in favor of high-fidelity A380 hero centerpiece

  const isolateHeroA380 = () => {
    const img = document.getElementById("heroA380");
    if (!img) return;

    const processImage = () => {
      img.onload = null; // Unbind load listener immediately to prevent infinite recursive triggers

      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        // BFS visited array to track outer background pixels
        const visited = new Uint8Array(width * height);
        const queue = [];
        const threshold = 40; // Safely catches compression noise/ambient black border

        const isNearBlack = (x, y) => {
          const idx = (y * width + x) * 4;
          return data[idx] < threshold && data[idx + 1] < threshold && data[idx + 2] < threshold;
        };

        // Push all border pixels to the queue if they are near black
        for (let x = 0; x < width; x++) {
          if (isNearBlack(x, 0)) {
            const idx = 0 * width + x;
            visited[idx] = 1;
            queue.push(x, 0);
          }
          if (isNearBlack(x, height - 1)) {
            const idx = (height - 1) * width + x;
            visited[idx] = 1;
            queue.push(x, height - 1);
          }
        }
        for (let y = 0; y < height; y++) {
          if (isNearBlack(0, y)) {
            const idx = y * width + 0;
            visited[idx] = 1;
            queue.push(0, y);
          }
          if (isNearBlack(width - 1, y)) {
            const idx = y * width + (width - 1);
            visited[idx] = 1;
            queue.push(width - 1, y);
          }
        }

        // BFS traversal to map out contiguous background pixels
        let head = 0;
        const dx = [0, 0, 1, -1];
        const dy = [1, -1, 0, 0];

        while (head < queue.length) {
          const cx = queue[head++];
          const cy = queue[head++];

          for (let i = 0; i < 4; i++) {
            const nx = cx + dx[i];
            const ny = cy + dy[i];

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nidx = ny * width + nx;
              if (visited[nidx] === 0 && isNearBlack(nx, ny)) {
                visited[nidx] = 1;
                queue.push(nx, ny);
              }
            }
          }
        }

        // Apply transparency mask solely to outer background pixels (prevents engine/window holes)
        for (let idx = 0; idx < width * height; idx++) {
          if (visited[idx] === 1) {
            data[idx * 4 + 3] = 0; // Transparent
          }
        }

        ctx.putImageData(imgData, 0, 0);
        img.src = canvas.toDataURL("image/png");
      } catch (e) {
        console.warn("Canvas transparency key-filtering failed (CORS/filesystem restriction):", e);
      } finally {
        img.style.display = "block"; // Always display centerpiece after processing completes
      }
    };

    if (img.complete) {
      processImage();
    } else {
      img.onload = processImage;
    }
  };

  isolateHeroA380();

  // --- Mobile HUD Navigation Logic ---
  const initMobileNavigation = () => {
    const btn = document.getElementById("mobileHudBtn");
    const overlay = document.getElementById("mobileHudOverlay");
    const panel = document.getElementById("mobileHudPanel");
    const links = document.querySelectorAll(".mobile-hud-link");

    if (!btn || !overlay || !panel) return;

    // Toggle menu state
    const toggleMenu = (open) => {
      const isExpanded = btn.getAttribute("aria-expanded") === "true";
      const shouldOpen = open !== undefined ? open : !isExpanded;

      btn.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
      
      if (shouldOpen) {
        overlay.classList.add("is-active");
        overlay.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden"; // Disable body scrolling
        
        // Add ripple animation class
        btn.classList.add("ripple-active");
        setTimeout(() => btn.classList.remove("ripple-active"), 400);

        // Focus first link for keyboard access
        if (links.length > 0) links[0].focus();
      } else {
        overlay.classList.remove("is-active");
        overlay.setAttribute("aria-hidden", "true");
        document.body.style.overflow = ""; // Re-enable body scrolling
      }
    };

    btn.addEventListener("click", () => toggleMenu());

    // Click outside panel to close
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        toggleMenu(false);
      }
    });

    // Close on links selection and smoothly scroll
    links.forEach(link => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const targetId = link.getAttribute("href");
        const targetElement = document.querySelector(targetId);
        
        toggleMenu(false);

        if (targetElement) {
          targetElement.scrollIntoView({ behavior: "smooth" });
        }
      });
    });

    // Close on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("is-active")) {
        toggleMenu(false);
        btn.focus();
      }
    });

    // High-performance Active Section Scroll Tracking
    const sectionsToTrack = ["home", "about", "skills", "certifications", "projects", "experience", "resume", "contact"];
    const sectionElements = sectionsToTrack.map(id => document.getElementById(id)).filter(el => el !== null);

    const onScrollActiveNav = () => {
      let activeId = "home";
      const scrollPos = window.scrollY + window.innerHeight / 3;

      sectionElements.forEach(el => {
        if (scrollPos >= el.offsetTop) {
          activeId = el.id;
        }
      });

      links.forEach(link => {
        const href = link.getAttribute("href");
        if (href === `#${activeId}`) {
          link.classList.add("is-active");
        } else {
          link.classList.remove("is-active");
        }
      });
    };

    window.addEventListener("scroll", onScrollActiveNav, { passive: true });
    onScrollActiveNav(); // Run initially
  };

  initMobileNavigation();

  // --- Desktop Navigation Control Panel & Scrollspy ---
  const initDesktopNavigation = () => {
    const slider = document.querySelector(".hud-nav-slider");
    const navList = document.querySelector(".hud-nav-list");

    const updateNavSlider = () => {
      const activeLink = document.querySelector(".hud-nav-link.active");
      if (!activeLink || !slider || !navList) return;

      const activeRect = activeLink.getBoundingClientRect();
      const parentRect = navList.getBoundingClientRect();

      // Position relative to parent container
      const relativeLeft = activeRect.left - parentRect.left;
      
      slider.style.width = `${activeRect.width}px`;
      slider.style.transform = `translateX(${relativeLeft}px)`;
      slider.style.opacity = "1";
    };

    // Custom GPU-friendly 800ms Ease-In-Out Smooth Scroll
    const smoothScrollTo = (targetSelector, duration = 800) => {
      const target = document.querySelector(targetSelector);
      if (!target) return;
      
      const targetPosition = target.getBoundingClientRect().top + window.scrollY;
      const startPosition = window.scrollY;
      const distance = targetPosition - startPosition;
      let startTime = null;

      const easeInOutQuad = (t, b, c, d) => {
        t /= d / 2;
        if (t < 1) return (c / 2) * t * t + b;
        t--;
        return (-c / 2) * (t * (t - 2) - 1) + b;
      };

      const animation = (currentTime) => {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const run = easeInOutQuad(timeElapsed, startPosition, distance, duration);
        window.scrollTo(0, run);
        if (timeElapsed < duration) {
          requestAnimationFrame(animation);
        } else {
          window.scrollTo(0, targetPosition); // Guarantee final position precision
        }
      };

      requestAnimationFrame(animation);
    };

    const navLinks = document.querySelectorAll(".hud-nav-link, .progress-dot, .hud-brand");
    navLinks.forEach(link => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const targetId = link.getAttribute("href");
        
        // If clicked from navbar, update immediately for feedback
        if (link.classList.contains("hud-nav-link")) {
          document.querySelectorAll(".hud-nav-link").forEach(l => l.classList.remove("active"));
          link.classList.add("active");
          updateNavSlider();
        }

        smoothScrollTo(targetId, 800);
      });
    });

    // Scrollspy section active highlight
    const activeSections = ["home", "about", "skills", "certifications", "projects", "experience", "contact"];
    const sectionElements = activeSections.map(id => document.getElementById(id)).filter(el => el !== null);
    const desktopLinks = document.querySelectorAll(".hud-nav-link");
    const progressDots = document.querySelectorAll(".progress-dot");

    const onScrollspy = () => {
      let currentSectionId = "home";
      const scrollPos = window.scrollY + window.innerHeight / 3;

      sectionElements.forEach(el => {
        if (scrollPos >= el.offsetTop) {
          currentSectionId = el.id;
        }
      });

      // Highlight active link in header navbar
      let activeChanged = false;
      desktopLinks.forEach(link => {
        const href = link.getAttribute("href");
        const hasActive = link.classList.contains("active");
        if (href === `#${currentSectionId}`) {
          if (!hasActive) {
            link.classList.add("active");
            activeChanged = true;
          }
        } else {
          if (hasActive) {
            link.classList.remove("active");
            activeChanged = true;
          }
        }
      });

      // Highlight active dot in vertical stage indicator
      progressDots.forEach(dot => {
        const href = dot.getAttribute("href");
        if (href === `#${currentSectionId}`) {
          dot.classList.add("active");
        } else {
          dot.classList.remove("active");
        }
      });

      if (activeChanged) {
        updateNavSlider();
      }
    };

    // Correctly highlight section on refresh / hash routing / forward-back navigation
    const checkInitialHash = () => {
      const hash = window.location.hash;
      if (hash) {
        const targetLink = document.querySelector(`.hud-nav-link[href="${hash}"]`);
        if (targetLink) {
          document.querySelectorAll(".hud-nav-link").forEach(l => l.classList.remove("active"));
          targetLink.classList.add("active");
          
          const targetSection = document.querySelector(hash);
          if (targetSection) {
            targetSection.scrollIntoView({ behavior: "auto" });
          }
          
          setTimeout(updateNavSlider, 100);
        }
      } else {
        updateNavSlider();
      }
    };

    window.addEventListener("hashchange", () => {
      const hash = window.location.hash;
      if (hash) {
        const targetLink = document.querySelector(`.hud-nav-link[href="${hash}"]`);
        if (targetLink) {
          document.querySelectorAll(".hud-nav-link").forEach(l => l.classList.remove("active"));
          targetLink.classList.add("active");
          updateNavSlider();
        }
      }
    });

    window.addEventListener("scroll", onScrollspy, { passive: true });
    window.addEventListener("resize", updateNavSlider);
    window.addEventListener("load", checkInitialHash);
    
    // Run initially
    onScrollspy();
    checkInitialHash();
  };

  initDesktopNavigation();
});
