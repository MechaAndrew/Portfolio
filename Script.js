// Scroll Logo Rotation + Horizontal Scroll Sync
let scrollLogoArea = null;
let scrollLogoInitialized = false;
const graphArea = document.querySelector('.graph-area');
let isRotating = false;
let lastY = 0;
let lastX = 0;
let currentRotation = 0;
let shakeOffset = 0;
let lastScrollLeft = 0;
let isScrollingFromRotation = false;
let introSpinRafId = null;
let isIntroSpinning = false;
let programScrollRaf = null;
let graphAreaScrollRaf = null;
let resizeRafId = null;

let logoVelocity = 0;
let isLogoMomentum = false;
const logoFriction = 0.94;
const logoDampening = 0.35;

const scrollNotify = document.getElementById('scroll-notify');
let notifyTimeout;
let currentActiveSection = null;

// Conversion factor: pixels scrolled = degrees rotated
const scrollToRotationFactor = 1; // 1 pixel scroll = 1 degree rotation

const secretLogoCode = [7, 7, 5, 5, 6, 8, 6, 8, 1, 3, 2, 4];
let secretLogoProgress = 0;

const logoButtonAudio = {
  correct: new Audio('./assets/Logo Button Correct.mp3'),
  fail: new Audio('./assets/Logo Button Fail.mp3'),
  success: new Audio('./assets/Logo Button Yay.mp3')
};

function renderScrollLogoTransform() {
  if (!scrollLogoArea) return;
  scrollLogoArea.style.transform = `translateX(${shakeOffset}px) rotate(${currentRotation}deg)`;
}

function playLogoButtonAudio(type) {
  const audio = logoButtonAudio[type];
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

function initScrollLogo() {
  if (scrollLogoInitialized) return true;
  scrollLogoArea = document.querySelector('.scroll-logo');
  if (!scrollLogoArea) return false;

  scrollLogoArea.addEventListener('mousedown', (e) => {
    if (isIntroSpinning) {
      stopInitialLogoSpin(true);
    }
    if (programScrollRaf) {
      cancelAnimationFrame(programScrollRaf);
      programScrollRaf = null;
    }

    isRotating = true;
    lastY = e.clientY;
    lastX = e.clientX;
    scrollLogoArea.style.cursor = 'grabbing';
  });

  document.querySelectorAll('[id^="special-button"]').forEach(button => {
    button.addEventListener('mousedown', (event) => {
      event.stopPropagation();
    });

    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const buttonNumber = parseInt(button.id.replace('special-button', ''), 10);
      handleSecretLogoButtonPress(buttonNumber);
    });
  });

  scrollLogoArea.style.cursor = 'grab';
  renderScrollLogoTransform();
  scrollLogoInitialized = true;
  return true;
}

function observeScrollLogoInsertion() {
  if (scrollLogoInitialized) return;
  const observer = new MutationObserver(() => {
    if (initScrollLogo()) {
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

initScrollLogo();
observeScrollLogoInsertion();

function stopInitialLogoSpin(resetRotation = false) {
  if (introSpinRafId) {
    cancelAnimationFrame(introSpinRafId);
    introSpinRafId = null;
  }

  isIntroSpinning = false;

  if (resetRotation) {
    currentRotation = 0;
    renderScrollLogoTransform();
  }
}

function runInitialLogoSpin() {
  const duration = 1450;
  const totalRotation = 720;
  const startTime = performance.now();
  isIntroSpinning = true;

  function frame(timestamp) {
    const progress = Math.min((timestamp - startTime) / duration, 1);
    const easedProgress = 1 - Math.pow(1 - progress, 3);
    currentRotation = totalRotation * easedProgress;
    renderScrollLogoTransform();

    if (progress < 1) {
      introSpinRafId = requestAnimationFrame(frame);
      return;
    }

    stopInitialLogoSpin(true);
  }

  introSpinRafId = requestAnimationFrame(frame);
}

function runLogoFailureShake() {
  const startTime = performance.now();
  const duration = 350;
  const maxOffset = 8;

  function frame(timestamp) {
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const decay = 1 - progress;
    shakeOffset = Math.sin(progress * Math.PI * 8) * maxOffset * decay;
    renderScrollLogoTransform();

    if (progress < 1) {
      requestAnimationFrame(frame);
      return;
    }

    shakeOffset = 0;
    renderScrollLogoTransform();
  }

  requestAnimationFrame(frame);
}

function handleSecretLogoButtonPress(buttonNumber) {
  const expectedButton = secretLogoCode[secretLogoProgress];

  if (buttonNumber === expectedButton) {
    playLogoButtonAudio('correct');
    secretLogoProgress += 1;

    if (secretLogoProgress === secretLogoCode.length) {
      playLogoButtonAudio('success');
      secretLogoProgress = 0;
    }

    return;
  }

  playLogoButtonAudio('fail');
  secretLogoProgress = 0;
  runLogoFailureShake();
}

document.addEventListener('mousemove', (e) => {
  if (!isRotating) return;
  
  const deltaY = e.clientY - lastY;
  currentRotation += deltaY;
  logoVelocity = deltaY * 0.7;
  
  renderScrollLogoTransform();
  
  // Scroll the page horizontally based on rotation change
  const scrollDelta = deltaY * scrollToRotationFactor;
  isScrollingFromRotation = true;
  graphArea.scrollLeft += scrollDelta;
  lastScrollLeft = graphArea.scrollLeft;
  isScrollingFromRotation = false;
  
  lastY = e.clientY;
});

document.addEventListener('mouseup', () => {
  if (isRotating) {
    isRotating = false;
    if (scrollLogoArea) scrollLogoArea.style.cursor = 'grab';

    // Start inertia momentum
    if (Math.abs(logoVelocity) > 0.1) {
      if (!isLogoMomentum) {
        isLogoMomentum = true;
        requestAnimationFrame(runLogoMomentum);
      }
    } else {
      // If almost still, do a natural snap
      snapLogoToNearest();
    }
  }
});

function snapLogoToNearest() {
  const snapAngle = 22.5;
  const snappedRotation = Math.round(currentRotation / snapAngle) * snapAngle;
  if (scrollLogoArea) scrollLogoArea.style.transition = 'transform 0.3s ease-in-out';
  currentRotation = snappedRotation;
  renderScrollLogoTransform();
  setTimeout(() => {
    if (scrollLogoArea) scrollLogoArea.style.transition = 'none';
  }, 300);
}

function runLogoMomentum() {
  if (!isLogoMomentum) return;
  logoVelocity *= logoFriction;
  if (Math.abs(logoVelocity) < 0.2) {
    isLogoMomentum = false;
    logoVelocity = 0;
    snapLogoToNearest();
    return;
  }

  currentRotation += logoVelocity;
  renderScrollLogoTransform();

  const scrollDelta = logoVelocity * scrollToRotationFactor;
  graphArea.scrollLeft += scrollDelta;
  isScrollingFromRotation = true;
  lastScrollLeft = graphArea.scrollLeft;
  isScrollingFromRotation = false;

  requestAnimationFrame(runLogoMomentum);
}

// Make mouse wheel scroll horizontally over graph area with momentum
let wheelVelocity = 0;
let isWheelMomentum = false;
const wheelDampening = 0.1;
const wheelFriction = 0.95;

function runWheelMomentum() {
  if (Math.abs(wheelVelocity) < 0.2) {
    isWheelMomentum = false;
    wheelVelocity = 0;
    return;
  }
  graphArea.scrollLeft += wheelVelocity;
  wheelVelocity *= wheelFriction;
  requestAnimationFrame(runWheelMomentum);
}

graphArea.addEventListener('wheel', (e) => {
  if (isIntroSpinning) {
    stopInitialLogoSpin(true);
  }

  if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
    e.preventDefault();
    if (programScrollRaf) {
      cancelAnimationFrame(programScrollRaf);
      programScrollRaf = null;
    }
    wheelVelocity += e.deltaY * wheelDampening;
    if (!isWheelMomentum) {
      isWheelMomentum = true;
      requestAnimationFrame(runWheelMomentum);
    }
  }
});

// Start Scroll Notify Area

function parseTitleFromSectionId(id) {
  if (!id) return '';
  const prefix = id.replace(/-section$/, '');
  return prefix.replace(/-/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
}

function showScrollNotify(message) {
  if (!scrollNotify) return;
  scrollNotify.textContent = message;
  scrollNotify.classList.add('visible');
  clearTimeout(notifyTimeout);
  notifyTimeout = setTimeout(() => {
    scrollNotify.classList.remove('visible');
  }, 2000);
}

function updateScrollNotifyOnScroll() {
  const sections = [...document.querySelectorAll('.node-group[id$="-section"]')];
  if (!sections.length) return;

  const areaRect = graphArea.getBoundingClientRect();
  let bestSection = null;
  let bestRatio = 0;

  sections.forEach(section => {
    const rect = section.getBoundingClientRect();
    const visibleWidth = Math.max(0, Math.min(rect.right, areaRect.right) - Math.max(rect.left, areaRect.left)*2);
    const ratio = rect.width > 0 ? visibleWidth / rect.width : 0;
    
    // Handle video playback for this section
    const video = section.querySelector('.node-video-background');
    if (video) {
      if (ratio > 0.25) {
        video.classList.add('playing');
        video.play().catch(() => {}); // Auto-play (may be blocked by browser)
      } else {
        video.classList.remove('playing');
        video.pause();
        video.currentTime = 0; // Reset to start
      }
    }
    
    if (ratio > bestRatio) {
      bestRatio = ratio;
      bestSection = section;
    }
  });

  if (bestSection && bestRatio > 0.25) {
    const sectionId = bestSection.id;
    if (sectionId !== currentActiveSection) {
      currentActiveSection = sectionId;
      const title = parseTitleFromSectionId(sectionId);
      showScrollNotify(title || 'Section');

      // Restore any hidden node-visibles in the newly active section
      bestSection.querySelectorAll('.node-visible').forEach(btn => {
        if (typeof btn._restoreVisible === 'function') btn._restoreVisible();
      });
    }
  }
}

function scheduleGraphAreaUpdate() {
  if (!graphArea) return;
  if (graphAreaScrollRaf) return;

  graphAreaScrollRaf = requestAnimationFrame(() => {
    graphAreaScrollRaf = null;
    draw();
    updateScrollNotifyOnScroll();
  });
}

function handleGraphAreaScroll() {
  const scrollDelta = graphArea.scrollLeft - lastScrollLeft;
  currentRotation += scrollDelta * scrollToRotationFactor;

  renderScrollLogoTransform();
  lastScrollLeft = graphArea.scrollLeft;

  scheduleGraphAreaUpdate();
}

// Sync rotation to horizontal scroll
graphArea.addEventListener('scroll', handleGraphAreaScroll, { passive: true });
// End Scroll Notify Area


// 
//END Scroll Logo Rotation + Horizontal Scroll Sync
// 

// Collapsible sidebar
// var coll = document.getElementsByClassName("collapsible");
// var i;
// for (i = 0; i < coll.length; i++) {
//   coll[i].addEventListener("click", function() {
//     this.classList.toggle("active");
//     var content = this.nextElementSibling;
//     if (content.style.maxHeight){
//       content.style.maxHeight = null;
// 		this.innerHTML = this.innerHTML.replace("▼", "▶");
//     } else {
//       content.style.maxHeight = content.scrollHeight + "px";
// 		this.innerHTML = this.innerHTML.replace("▶", "▼");
//     }
//   });
// }
	//Side Bar Drop Down code
	
	//Scroll Down the clicked code
function stopAllMomentum() {
  wheelVelocity = 0;
  isWheelMomentum = false;
  logoVelocity = 0;
  isLogoMomentum = false;
  if (programScrollRaf) {
    cancelAnimationFrame(programScrollRaf);
    programScrollRaf = null;
  }
}

function smoothScrollGraphTo(targetLeft, targetTop, duration = 1000) {
  const startLeft = graphArea.scrollLeft;
  const startTop = graphArea.scrollTop;
  const diffLeft = targetLeft - startLeft;
  const diffTop = targetTop - startTop;
  const startTime = performance.now();

  function step(timestamp) {
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Cubic ease-in-out
    const eased = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    graphArea.scrollLeft = startLeft + diffLeft * eased;
    graphArea.scrollTop  = startTop  + diffTop  * eased;
    if (progress < 1) {
      programScrollRaf = requestAnimationFrame(step);
    } else {
      programScrollRaf = null;
    }
  }

  programScrollRaf = requestAnimationFrame(step);
}

document.querySelectorAll('a[href^="#node-jump"], a[href^="#work_detail"]').forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault(); // prevent default anchor jump

    // Animate the connecting segment
    const anchorImg = this.querySelector('[id^="anchor"]');
    if (anchorImg) {
      const anchorNum = parseInt(anchorImg.id.replace('anchor', ''), 10);
      startSegmentAnimation(anchorNum - 1);
    }

    const targetId = this.getAttribute('href').substring(1); // remove '#'
    const target = document.getElementById(targetId);
    // const container = document.querySelector('.graph-area');
    const container = graphArea;

    if (target && container) {
      const areaRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();

      const nextScrollLeft = container.scrollLeft + (targetRect.left - areaRect.left);
      const nextScrollTop = container.scrollTop + (targetRect.top - areaRect.top);

      stopAllMomentum();
      smoothScrollGraphTo(nextScrollLeft, nextScrollTop);
    }
  });
});

	//Scroll Down the clicked code end


	//Play Video when hovered
function fitNodeInfoDetailsText() {
  document.querySelectorAll('.node-info-details').forEach(label => {
    if (!label || !label.parentElement) return;

    label.style.fontSize = '';
    label.style.whiteSpace = 'normal';
    label.style.overflow = 'hidden';
    label.style.display = 'flex';
    label.style.alignItems = 'center';
    label.style.justifyContent = 'center';

    let size = parseFloat(getComputedStyle(label).fontSize) || 24;
    while (size > 10) {
      label.style.fontSize = `${size}px`;
      if (label.scrollHeight <= label.clientHeight && label.scrollWidth <= label.clientWidth) {
        break;
      }
      size -= 1;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  fitNodeInfoDetailsText();
  const containers = document.querySelectorAll(".video-container");

  containers.forEach(container => {
    const media = container.querySelector(".node-video");
    const overlay = container.querySelector('.play-overlay');

    if (!media) return;

    // If it's a <video>, set up autoplay on hover and reset on leave
    if (media.tagName && media.tagName.toLowerCase() === 'video') {
      try { media.pause(); } catch (e) {}
      if (overlay) overlay.style.opacity = '1';

      container.addEventListener('mouseenter', () => {
        if (overlay) overlay.style.opacity = '0';
        media.play().catch(() => {});
      });

      container.addEventListener('mouseleave', () => {
        try { media.pause(); } catch (e) {}
        try { media.currentTime = 0; } catch (e) {}
        if (overlay) overlay.style.opacity = '1';
      });
    } else if (media.tagName && media.tagName.toLowerCase() === 'img') {
      // For images, add a subtle hover scale so it feels interactive
      container.addEventListener('mouseenter', () => { media.style.transform = 'scale(1.03)'; });
      container.addEventListener('mouseleave', () => { media.style.transform = ''; });
    }
  });

  const previewLinks = document.querySelectorAll('a.info-preview');
  let activeFullscreenClone = null;
  let activePreviewOriginal = null;

  const getViewportPreviewSize = () => ({
    width: Math.min(window.innerWidth, document.documentElement.clientWidth),
    height: Math.min(window.innerHeight, document.documentElement.clientHeight)
  });

  const closeFullscreenPreview = () => {
    if (!activeFullscreenClone || !activePreviewOriginal) return;

    const targetRect = activePreviewOriginal.getBoundingClientRect();
    activeFullscreenClone.classList.remove('info-preview-clone--expanded');
    activeFullscreenClone.style.top = `${targetRect.top}px`;
    activeFullscreenClone.style.left = `${targetRect.left}px`;
    activeFullscreenClone.style.width = `${targetRect.width}px`;
    activeFullscreenClone.style.height = `${targetRect.height}px`;

    activeFullscreenClone.addEventListener('transitionend', () => {
      if (activeFullscreenClone) {
        activeFullscreenClone.remove();
        activeFullscreenClone = null;
        activePreviewOriginal = null;
        document.body.style.overflow = '';
      }
    }, { once: true });
  };

  previewLinks.forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();

      if (activeFullscreenClone) {
        closeFullscreenPreview();
        return;
      }

      activePreviewOriginal = link;
      const rect = link.getBoundingClientRect();
      const clone = link.cloneNode(true);
      clone.classList.add('info-preview-clone');
      clone.style.top = `${rect.top}px`;
      clone.style.left = `${rect.left}px`;
      clone.style.width = `${rect.width}px`;
      clone.style.height = `${rect.height}px`;
      clone.style.margin = '0';
      clone.style.transform = 'none';
      clone.style.pointerEvents = 'auto';
      clone.style.transition = 'all 300ms ease';
      document.body.appendChild(clone);
      document.body.style.overflow = 'hidden';

      const viewport = getViewportPreviewSize();
      requestAnimationFrame(() => {
        clone.classList.add('info-preview-clone--expanded');
        clone.style.top = '0px';
        clone.style.left = '0px';
        clone.style.width = `${viewport.width}px`;
        clone.style.height = `${viewport.height}px`;
        clone.style.borderRadius = '0';
      });

      const media = clone.querySelector('video');
      if (media) {
        try {
          media.currentTime = 0;
        } catch (err) {}
        media.play().catch(() => {});
      }

      setTimeout(() => {
        document.addEventListener('click', closeFullscreenPreview, { once: true });
      }, 0);

      activeFullscreenClone = clone;
    });
  });

  window.addEventListener('resize', fitNodeInfoDetailsText);
});
// Play video when hovered


// ------------------------------------------------------------------------------------------------
	//Curve Code
// ------------------------------------------------------------------------------------------------
	class CubicBezier {
     static distance(a, b) {
       const dx = b.x - a.x;
       const dy = b.y - a.y;
       return Math.sqrt(dx * dx + dy * dy);
     }

     static polar(a, b) {
       return Math.atan2(b.y - a.y, b.x - a.x);
     }

     static drawCurve(ctx, a, b, c1, c2) {
       ctx.beginPath();
       ctx.moveTo(a.x, a.y);
       ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, b.x, b.y);
       ctx.stroke();
     }

     static curveThroughPoints(ctx, points, z = 0.5, angleFactor = 2, horizontalThreshold = 1) {
 if (points.length < 2) return;

 for (let i = 0; i < points.length - 1; i++) {
   const p0 = points[i - 1] || points[i];
   const p1 = points[i];
   const p2 = points[i + 1];
   const p3 = points[i + 2] || p2;

   // If p1 and p2 are horizontally aligned (within threshold), draw straight line
   if (Math.abs(p1.y - p2.y) <= horizontalThreshold) {
     ctx.beginPath();
     ctx.moveTo(p1.x, p1.y);
     ctx.lineTo(p2.x, p2.y);
     ctx.stroke();
     continue;
   }

   const angleA = CubicBezier.polar(p0, p2);
   const angleB = CubicBezier.polar(p1, p3);
   const lenA = CubicBezier.distance(p0, p1) * z;
   const lenB = CubicBezier.distance(p1, p2) * z;

   const c1 = {
     x: p1.x + Math.cos(angleA) * lenA * angleFactor,
     y: p1.y + Math.sin(angleA) * lenA * angleFactor
   };

   const c2 = {
     x: p2.x - Math.cos(angleB) * lenB * angleFactor,
     y: p2.y - Math.sin(angleB) * lenB * angleFactor
   };

   CubicBezier.drawCurve(ctx, p1, p2, c1, c2);
 }
}


     static getElementCenter(id, canvas) {
       const el = document.getElementById(id);
       if (!el) return null;

       const elRect = el.getBoundingClientRect();
       const canvasRect = canvas.getBoundingClientRect();

       return {
         x: elRect.left + elRect.width / 2 - canvasRect.left,
         y: elRect.top + elRect.height / 2 - canvasRect.top
       };
     }

     static curveThroughElementIDs(ctx, canvas, ids, z = 0.5, angleFactor = 1.2) {
       const points = ids.map(id => CubicBezier.getElementCenter(id, canvas)).filter(Boolean);
       CubicBezier.curveThroughPoints(ctx, points, z, angleFactor);
     }
   }

   //// Main

// Setup canvas inside .graph-area
// const graphArea = document.querySelector('.graph-area');
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// Helper to resize canvas to fit graph-area
function resizeCanvasToGraphArea() {
  if (!graphArea || !canvas) return;

  const width = graphArea.scrollWidth;
  const height = graphArea.scrollHeight;

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.style.left = 0;
  canvas.style.top = 0;
}
resizeCanvasToGraphArea();

// Get all dynamic anchors (cache on resize)
let anchorElements = [];
function updateAnchorElements(prefix = "anchor") {
  anchorElements = [...document.querySelectorAll(`[id^="${prefix}"]`)];
  anchorElements.sort((a, b) => {
    const numA = parseInt(a.id.replace(prefix, ""), 10);
    const numB = parseInt(b.id.replace(prefix, ""), 10);
    return numA - numB;
  });
}
updateAnchorElements();

// Get anchor center points relative to graph-area/canvas
function getAnchorPoints() {
  const scrollLeft = graphArea.scrollLeft;
  const scrollTop = graphArea.scrollTop;
  return anchorElements
    .map(el => {
      const elRect = el.getBoundingClientRect();
      const areaRect = graphArea.getBoundingClientRect();
      return {
        x: elRect.left + elRect.width / 2 - areaRect.left + scrollLeft,
        y: elRect.top + elRect.height / 2 - areaRect.top + scrollTop
      };
    })
    .filter(Boolean);
}

// Segment animation state
let animatingSegment = null;
let animRafId = null;

function lerpColor(c1, c2, t) {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t)
  ];
}

function getAnimatedSegmentStyle(progress) {
  const white  = [255, 255, 255];
  const orange = [255, 140,   0];
  const yellow = [255, 255,   0];
  let rgb;
  if (progress < 0.3)       rgb = lerpColor(white,  orange, progress / 0.3);
  else if (progress < 0.6)  rgb = lerpColor(orange, yellow, (progress - 0.3) / 0.3);
  else if (progress < 0.9)  rgb = lerpColor(yellow, orange, (progress - 0.6) / 0.3);
  else                      rgb = lerpColor(orange, white,  (progress - 0.9) / 0.1);
  const lineWidth = 10 * (1 + Math.sin(progress * Math.PI * 10) * 0.1);
  return { color: `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`, lineWidth };
}

function startSegmentAnimation(segmentIndex) {
  animatingSegment = { index: segmentIndex, startTime: performance.now(), duration: 2000, progress: 0 };
  if (animRafId) cancelAnimationFrame(animRafId);
  function frame(timestamp) {
    animatingSegment.progress = Math.min((timestamp - animatingSegment.startTime) / animatingSegment.duration, 1);
    draw();
    if (animatingSegment.progress < 1) {
      animRafId = requestAnimationFrame(frame);
    } else {
      animatingSegment = null;
      animRafId = null;
      draw();
    }
  }
  animRafId = requestAnimationFrame(frame);
}

function drawSingleSegment(points, segIdx, z, angleFactor, horizontalThreshold) {
  const p0 = points[segIdx - 1] || points[segIdx];
  const p1 = points[segIdx];
  const p2 = points[segIdx + 1];
  const p3 = points[segIdx + 2] || p2;
  if (Math.abs(p1.y - p2.y) <= horizontalThreshold) {
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    return;
  }
  const angleA = CubicBezier.polar(p0, p2);
  const angleB = CubicBezier.polar(p1, p3);
  const lenA   = CubicBezier.distance(p0, p1) * z;
  const lenB   = CubicBezier.distance(p1, p2) * z;
  const c1x = p1.x + Math.cos(angleA) * lenA * angleFactor;
  const c1y = p1.y + Math.sin(angleA) * lenA * angleFactor;
  const c2x = p2.x - Math.cos(angleB) * lenB * angleFactor;
  const c2y = p2.y - Math.sin(angleB) * lenB * angleFactor;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p2.x, p2.y);
  ctx.stroke();
}

// Main draw function
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const anchorPoints = getAnchorPoints();
  if (anchorPoints.length < 2) return;

  const z = 0.15, angleFactor = 2.5, horizontalThreshold = 1;

  for (let i = 0; i < anchorPoints.length - 1; i++) {
    // Check if either endpoint of this segment is inside a faded node
    const elA = anchorElements[i];
    const elB = anchorElements[i + 1];
    const aFaded = elA && elA.closest('.node--faded');
    const bFaded = elB && elB.closest('.node--faded');
    const segmentFaded = aFaded || bFaded;

    ctx.globalAlpha = segmentFaded ? 0 : 1;

    if (animatingSegment && animatingSegment.index === i) {
      const style = getAnimatedSegmentStyle(animatingSegment.progress);
      ctx.lineWidth = style.lineWidth;
      ctx.strokeStyle = style.color;
    } else {
      ctx.lineWidth = 10;
      ctx.strokeStyle = "#FFFFFF";
    }
    drawSingleSegment(anchorPoints, i, z, angleFactor, horizontalThreshold);
  }

  ctx.globalAlpha = 1;
}

let drawScheduled = false;
function scheduleDraw() {
  if (!drawScheduled) {
    drawScheduled = true;
    requestAnimationFrame(() => {
      draw();
      drawScheduled = false;
    });
  }
}

function clampGraphAreaScrollLeft() {
  if (!graphArea) return;
  const maxScrollLeft = Math.max(0, graphArea.scrollWidth - graphArea.clientWidth);
  graphArea.scrollLeft = Math.min(graphArea.scrollLeft, maxScrollLeft);
  graphArea.scrollLeft = Math.max(0, graphArea.scrollLeft);
  lastScrollLeft = graphArea.scrollLeft;
}

function refreshGraphLayout() {
  resizeCanvasToGraphArea();
  updateAnchorElements();
  clampGraphAreaScrollLeft();
  scheduleDraw();
  updateScrollNotifyOnScroll();
}

function resetGraphScroll() {
  if (!graphArea) return;
  graphArea.scrollLeft = 0;
  graphArea.scrollTop = 0;
  lastScrollLeft = 0;
  currentRotation = 0;
  renderScrollLogoTransform();
}

// Initial draw and resize after layout is complete
window.addEventListener("load", () => {
  refreshGraphLayout();
  requestAnimationFrame(() => {
    resetGraphScroll();
    refreshGraphLayout();
  });
  runInitialLogoSpin();
});

function scheduleRefreshGraphLayout() {
  if (resizeRafId) return;

  resizeRafId = requestAnimationFrame(() => {
    resizeRafId = null;
    refreshGraphLayout();
  });
}

// Handle resize
window.addEventListener("resize", scheduleRefreshGraphLayout);

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', scheduleRefreshGraphLayout);
}

// Redraw on content changes (MutationObserver for dynamic content)
const observer = new MutationObserver(scheduleDraw);
observer.observe(graphArea, { childList: true, subtree: true });

// Initial draw and resize
resizeCanvasToGraphArea();
draw();

// Node visibility toggle (hover to preview-hide, click to pin-hide, click outside to restore)
document.querySelectorAll('.node-visible').forEach(btn => {
  const node = btn.closest('.node');
  if (!node) return;

  let isPinned = false;
  const img = btn.querySelector('img');
  const openSrc   = 'assets/Node-Visible-Open.png';
  const hiddenSrc = 'assets/Node-Visible-Hidden.png';
  const header = node.querySelector('.node-header');
  // Capture the original header background once (inline or computed)
  const originalHeaderBg = header ? (header.style.backgroundColor || getComputedStyle(header).backgroundColor) : '';

  function fadeOut() {
    // Save and clear any inline background-color on the header so CSS can hide it
    if (header) {
      header.style.backgroundColor = 'transparent';
    }
    node.classList.add('node--faded');
    img.src = hiddenSrc;
    draw();
  }

  function fadeIn() {
    node.classList.remove('node--faded');
    // Restore the saved inline background-color
    if (header) {
      header.style.backgroundColor = originalHeaderBg || '';
    }
    img.src = openSrc;
    draw();
  }

  // Expose restore function so scroll handler can call it
  btn._restoreVisible = () => {
    if (isPinned || node.classList.contains('node--faded')) {
      isPinned = false;
      fadeIn();
    }
  };

  // Only preview-hide on hover when not pinned
  btn.addEventListener('mouseenter', () => {
    if (!isPinned) fadeOut();
  });

  btn.addEventListener('mouseleave', () => {
    if (!isPinned) fadeIn();
  });

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    isPinned = !isPinned;
    if (isPinned) {
      fadeOut();
    } else {
      fadeIn();
    }
  });

  document.addEventListener('click', (e) => {
    if (isPinned && !btn.contains(e.target)) {
      isPinned = false;
      fadeIn();
    }
  });
});

function setupSidebar() {
  var coll = document.getElementsByClassName("collapsible");
  for (var i = 0; i < coll.length; i++) {
    coll[i].addEventListener("click", function() {
      this.classList.toggle("active");
      var content = this.nextElementSibling;
      if (content.style.maxHeight){
        content.style.maxHeight = null;
        this.innerHTML = this.innerHTML.replace("▼", "▶");
      } else {
        content.style.maxHeight = content.scrollHeight + "px";
        this.innerHTML = this.innerHTML.replace("▶", "▼");
      }
    });
  }
}
