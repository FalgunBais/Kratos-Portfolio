document.addEventListener("DOMContentLoaded", () => {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const phrases = [
    "B.Tech CS Student in Vice City",
    "AWS Certified Heist Architect",
    "AI & Cloud Exploits Specialist",
    "Cybersecurity wanted star level 5",
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

        playerSpriteContainer.style.transform = `translate3d(${screenX}px, ${screenY}px, 0)`;
      }

      if (hpFill) {
        hpFill.style.width = `${scrollPercent}%`;
      }

      // Decrement armor slightly as progress increases to give a dynamic survival feeling
      if (armorFill) {
        armorFill.style.width = `${Math.max(75 - scrollPercent * 0.4, 15)}%`;
      }

      // Calculate wanted level stars
      const wantedContainer = document.getElementById("hudWanted");
      if (wantedContainer) {
        const starCount = Math.min(Math.floor(progress * 5) + 1, 5);
        wantedContainer.setAttribute("aria-label", `Wanted level: ${starCount} stars`);

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

    const question = "> WHAT BRINGS YOU HERE GAMER? ";
    let charIdx = 0;

    const typeDialogue = () => {
      if (charIdx < question.length) {
        terminalDialogue.textContent += question.charAt(charIdx);
        charIdx++;
        setTimeout(typeDialogue, 60);
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
        userLine.textContent = `visitor@falgun_net:~$ ${val}`;
        terminalBody.appendChild(userLine);
        terminalBody.scrollTop = terminalBody.scrollHeight;

        // Print decryption progress
        setTimeout(() => {
          const decryptLine = document.createElement("div");
          decryptLine.className = "terminal-line";
          decryptLine.textContent = "> DE-ENCRYPTING DATA: [████████████████████] 100%";
          terminalBody.appendChild(decryptLine);
          terminalBody.scrollTop = terminalBody.scrollHeight;

          // Print access granted sat-link
          setTimeout(() => {
            const satLine = document.createElement("div");
            satLine.className = "terminal-line";
            satLine.textContent = "> SAT-LINK ESTABLISHED. REDIRECTING...";
            terminalBody.appendChild(satLine);
            terminalBody.scrollTop = terminalBody.scrollHeight;

            // Fade out terminal gate, fade in GTA loading splash
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
                    if (pct === 50 && splashLoadingText) {
                      splashLoadingText.textContent = "SYNCHRONIZING HEISTS...";
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
});
