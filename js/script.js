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

    if (typeof THREE === "undefined" || typeof THREE.GLTFLoader === "undefined") {
      console.warn("Three.js or GLTFLoader not loaded. WebGL A380 rendering skipped.");
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

    // Enable soft shadowing
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // --- Dynamic Light Rig ---
    // Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // Directional Sun Light (key light casting soft shadows)
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(5, 15, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    // Neon Left Rim Light (Cyan)
    const cyanLight = new THREE.PointLight(0x00f0ff, 0, 80);
    cyanLight.position.set(-20, -5, 5);
    scene.add(cyanLight);

    // Neon Right Rim Light (Magenta)
    const magentaLight = new THREE.PointLight(0xff007f, 0, 80);
    magentaLight.position.set(20, 5, -5);
    scene.add(magentaLight);

    // Expose lights to window context for scroll animations
    window.a380Lights = {
      ambient: ambientLight,
      directional: dirLight,
      cyan: cyanLight,
      magenta: magentaLight
    };

    // Root Group
    const airplaneGroup = new THREE.Group();
    scene.add(airplaneGroup);

    // --- Standard Shaded Materials ---
    // Fuselage / Wings material
    const fuselageMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.35,
      metalness: 0.65,
      flatShading: false
    });

    // Windshield glass material
    const windshieldMaterial = new THREE.MeshStandardMaterial({
      color: 0x0c071e,
      roughness: 0.1,
      metalness: 0.95
    });

    // Jet Engine metal material
    const engineMaterial = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.4,
      metalness: 0.8
    });

    // Glowing exhaust plume material
    const exhaustMaterial = new THREE.MeshBasicMaterial({
      color: 0x00f0ff
    });

    // Expose materials to window context for scroll animations
    window.a380Materials = {
      fuselage: fuselageMaterial,
      windshield: windshieldMaterial,
      engine: engineMaterial
    };

    // --- GLTF Loading with Procedural Fallback ---
    const loader = new THREE.GLTFLoader();
    const modelUrl = "https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/scenegraph-layer/airplane.glb";
    let loadedMesh = null;

    // Helper to build fallback procedural shaded airplane
    const buildProceduralModel = () => {
      // Fuselage (Stretched Cylinder - double decker scale)
      const bodyGeom = new THREE.CylinderGeometry(1.5, 1.5, 17, 32);
      bodyGeom.rotateX(Math.PI / 2);
      const bodyMesh = new THREE.Mesh(bodyGeom, fuselageMaterial);
      bodyMesh.castShadow = true;
      bodyMesh.receiveShadow = true;
      airplaneGroup.add(bodyMesh);

      // Cockpit windshield (Contouring overlay mesh on nose)
      const windGeom = new THREE.SphereGeometry(1.52, 32, 16, 0, Math.PI * 2, 0.05, 0.45);
      windGeom.rotateX(-Math.PI / 7);
      windGeom.translate(0, 0.25, 8.1);
      const windMesh = new THREE.Mesh(windGeom, windshieldMaterial);
      airplaneGroup.add(windMesh);

      // Nose Cone
      const noseGeom = new THREE.ConeGeometry(1.5, 3.2, 32);
      noseGeom.rotateX(-Math.PI / 2);
      noseGeom.translate(0, 0, 10.1);
      const noseMesh = new THREE.Mesh(noseGeom, fuselageMaterial);
      noseMesh.castShadow = true;
      noseMesh.receiveShadow = true;
      airplaneGroup.add(noseMesh);

      // Tail Cone
      const tailGeom = new THREE.ConeGeometry(1.5, 4.2, 32);
      tailGeom.rotateX(Math.PI / 2);
      tailGeom.translate(0, 0, -10.6);
      const tailMesh = new THREE.Mesh(tailGeom, fuselageMaterial);
      tailMesh.castShadow = true;
      tailMesh.receiveShadow = true;
      airplaneGroup.add(tailMesh);

      // Left Main Wing (Realistic swept-back beveled ExtrudeGeometry)
      const wingShapeL = new THREE.Shape();
      wingShapeL.moveTo(0, 0);
      wingShapeL.lineTo(-14.5, -4.5); // Swept back tip
      wingShapeL.lineTo(-14.5, -5.5); // Tip width
      wingShapeL.lineTo(0, -3.6);
      wingShapeL.lineTo(0, 0);
      const leftWingGeom = new THREE.ExtrudeGeometry(wingShapeL, {
        depth: 0.15,
        bevelEnabled: true,
        bevelThickness: 0.08,
        bevelSize: 0.05,
        bevelSegments: 3
      });
      leftWingGeom.rotateX(Math.PI / 2);
      leftWingGeom.translate(-0.8, 0, 0.5);
      const leftWingMesh = new THREE.Mesh(leftWingGeom, fuselageMaterial);
      leftWingMesh.rotation.z = Math.PI / 24;  // Dihedral angle (tilt up)
      leftWingMesh.castShadow = true;
      leftWingMesh.receiveShadow = true;
      airplaneGroup.add(leftWingMesh);

      // Right Main Wing (Realistic swept-back beveled ExtrudeGeometry)
      const wingShapeR = new THREE.Shape();
      wingShapeR.moveTo(0, 0);
      wingShapeR.lineTo(14.5, -4.5); // Swept back tip
      wingShapeR.lineTo(14.5, -5.5); // Tip width
      wingShapeR.lineTo(0, -3.6);
      wingShapeR.lineTo(0, 0);
      const rightWingGeom = new THREE.ExtrudeGeometry(wingShapeR, {
        depth: 0.15,
        bevelEnabled: true,
        bevelThickness: 0.08,
        bevelSize: 0.05,
        bevelSegments: 3
      });
      rightWingGeom.rotateX(Math.PI / 2);
      rightWingGeom.translate(0.8, 0, 0.5);
      const rightWingMesh = new THREE.Mesh(rightWingGeom, fuselageMaterial);
      rightWingMesh.rotation.z = -Math.PI / 24; // Dihedral angle (tilt up)
      rightWingMesh.castShadow = true;
      rightWingMesh.receiveShadow = true;
      airplaneGroup.add(rightWingMesh);

      // Vertical Stabilizer (Tail Fin)
      const finShape = new THREE.Shape();
      finShape.moveTo(0, 0);
      finShape.lineTo(0, 4.8);
      finShape.lineTo(-2.4, 4.3);
      finShape.lineTo(-3.4, 0);
      finShape.lineTo(0, 0);
      const finGeom = new THREE.ExtrudeGeometry(finShape, {
        depth: 0.12,
        bevelEnabled: true,
        bevelThickness: 0.05,
        bevelSize: 0.04,
        bevelSegments: 2
      });
      finGeom.translate(0, 0, -8.2);
      const finMesh = new THREE.Mesh(finGeom, fuselageMaterial);
      finMesh.castShadow = true;
      finMesh.receiveShadow = true;
      airplaneGroup.add(finMesh);

      // Horizontal Stabilizers
      const stabLeftShape = new THREE.Shape();
      stabLeftShape.moveTo(0, 0);
      stabLeftShape.lineTo(-4.5, -1.8);
      stabLeftShape.lineTo(-4.5, -2.4);
      stabLeftShape.lineTo(0, -1.6);
      stabLeftShape.lineTo(0, 0);
      const stabLeftGeom = new THREE.ExtrudeGeometry(stabLeftShape, {
        depth: 0.08,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.03,
        bevelSegments: 2
      });
      stabLeftGeom.rotateX(Math.PI / 2);
      stabLeftGeom.translate(-0.5, 0.15, -9.2);
      const stabLeftMesh = new THREE.Mesh(stabLeftGeom, fuselageMaterial);
      stabLeftMesh.castShadow = true;
      stabLeftMesh.receiveShadow = true;
      airplaneGroup.add(stabLeftMesh);

      const stabRightShape = new THREE.Shape();
      stabRightShape.moveTo(0, 0);
      stabRightShape.lineTo(4.5, -1.8);
      stabRightShape.lineTo(4.5, -2.4);
      stabRightShape.lineTo(0, -1.6);
      stabRightShape.lineTo(0, 0);
      const stabRightGeom = new THREE.ExtrudeGeometry(stabRightShape, {
        depth: 0.08,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.03,
        bevelSegments: 2
      });
      stabRightGeom.rotateX(Math.PI / 2);
      stabRightGeom.translate(0.5, 0.15, -9.2);
      const stabRightMesh = new THREE.Mesh(stabRightGeom, fuselageMaterial);
      stabRightMesh.castShadow = true;
      stabRightMesh.receiveShadow = true;
      airplaneGroup.add(stabRightMesh);

      // 4 Under-wing Turbofans (Detailed Engine Groups)
      const createDetailedEngine = (x, y, z) => {
        const engGroup = new THREE.Group();
        engGroup.position.set(x, y, z);

        // Cowling
        const cowlGeom = new THREE.CylinderGeometry(0.52, 0.42, 1.8, 16);
        cowlGeom.rotateX(Math.PI / 2);
        const cowlMesh = new THREE.Mesh(cowlGeom, engineMaterial);
        cowlMesh.castShadow = true;
        cowlMesh.receiveShadow = true;
        engGroup.add(cowlMesh);

        // Fan
        const fanGeom = new THREE.CylinderGeometry(0.38, 0.38, 0.1, 16);
        fanGeom.rotateX(Math.PI / 2);
        fanGeom.translate(0, 0, 0.85);
        const fanMesh = new THREE.Mesh(fanGeom, windshieldMaterial);
        engGroup.add(fanMesh);

        // Exhaust cone
        const exGeom = new THREE.ConeGeometry(0.32, 0.6, 12);
        exGeom.rotateX(-Math.PI / 2);
        exGeom.translate(0, 0, -1.05);
        const exMesh = new THREE.Mesh(exGeom, exhaustMaterial);
        engGroup.add(exMesh);

        airplaneGroup.add(engGroup);
      };

      createDetailedEngine(-3.5, -0.4, 0.5);
      createDetailedEngine(3.5, -0.4, 0.5);
      createDetailedEngine(-7, -0.25, 1.3);
      createDetailedEngine(7, -0.25, 1.3);
    };

    // Load actual GLB aircraft model
    loader.load(
      modelUrl,
      (gltf) => {
        loadedMesh = gltf.scene;
        
        // Align and scale visgl airplane model to look like a centered A380
        loadedMesh.scale.setScalar(0.18);
        // Correct default GLB orientation: model is aligned vertically, let's lay it down Z
        loadedMesh.rotation.set(Math.PI / 2, 0, Math.PI);
        loadedMesh.position.set(0, 0, 0);

        loadedMesh.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
            node.material = fuselageMaterial;
          }
        });

        airplaneGroup.add(loadedMesh);
        window.a380Model = loadedMesh;
        console.log("3D Airbus A380 GLB model loaded successfully.");
      },
      undefined,
      (err) => {
        console.warn("Error loading GLB. Falling back to high-fidelity procedural model.", err);
        buildProceduralModel();
      }
    );

    // Initial 3D tilt coordinates
    airplaneGroup.rotation.set(0.2, -0.6, 0.15);

    // --- Interactive Mouse Cursor Rotation (±8°) ---
    let targetRotation = { x: 0.2, y: -0.6 };

    document.addEventListener("mousemove", (e) => {
      // Normalize mouse coordinates to [-1, 1] range
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;

      // ±8 degrees is ~0.14 radians
      targetRotation.y = -0.6 + nx * 0.14;
      targetRotation.x = 0.2 + ny * 0.14;
    });

    // Touch equivalent (using screen coordinate swipes)
    document.addEventListener("touchmove", (e) => {
      if (e.touches && e.touches.length > 0) {
        const nx = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
        const ny = (e.touches[0].clientY / window.innerHeight) * 2 - 1;
        targetRotation.y = -0.6 + nx * 0.14;
        targetRotation.x = 0.2 + ny * 0.14;
      }
    }, { passive: true });

    // Handle Window Resizing
    window.addEventListener("resize", () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // --- FPS-Based Quality Throttling ---
    let frameCount = 0;
    let lastTime = performance.now();
    let lowPerfMode = false;

    // Animation Rendering Loop
    const renderLoop = () => {
      requestAnimationFrame(renderLoop);

      // FPS calculation
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 2000) {
        const fps = (frameCount * 1000) / (now - lastTime);
        if (fps < 40 && !lowPerfMode) {
          console.warn("Performance warning (" + Math.round(fps) + " FPS). Disabling soft shadows and dropping pixel ratio.");
          lowPerfMode = true;
          renderer.shadowMap.enabled = false;
          renderer.setPixelRatio(1);
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

      // Smoothly interpolate rotation to target (mouse offset)
      airplaneGroup.rotation.y = THREE.MathUtils.lerp(airplaneGroup.rotation.y, targetRotation.y, 0.05);
      airplaneGroup.rotation.x = THREE.MathUtils.lerp(airplaneGroup.rotation.x, targetRotation.x, 0.05);

      // --- Scroll-Driven Vector Animation (kept in viewport) ---
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      const progress = cachedDocHeight > 0 ? Math.min(scrollTop / cachedDocHeight, 1) : 0;

      // 1. Banking / roll roll sway (simulating turns along path curves)
      const rollVal = Math.sin(progress * Math.PI * 2.5) * 0.12; 
      airplaneGroup.rotation.z = THREE.MathUtils.lerp(airplaneGroup.rotation.z, 0.15 + rollVal, 0.05);

      // 2. Altitude Scale (plane gets slightly smaller/higher as scroll goes down)
      const targetScale = 1.0 - progress * 0.25; 
      airplaneGroup.scale.setScalar(THREE.MathUtils.lerp(airplaneGroup.scale.x, targetScale, 0.05));

      // 3. Side to side drift sway
      const targetX = Math.sin(progress * Math.PI * 2) * 2.0; 
      airplaneGroup.position.x = THREE.MathUtils.lerp(airplaneGroup.position.x, targetX, 0.05);

      // 4. Up / down coordinate shift
      const targetY = -0.5 + progress * 1.5;
      airplaneGroup.position.y = THREE.MathUtils.lerp(airplaneGroup.position.y, targetY, 0.05);

      renderer.render(scene, camera);
    };

    renderLoop();
  };

  init3DAirplane();
});
