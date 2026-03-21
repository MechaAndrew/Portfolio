// Scroll Logo Rotation + Horizontal Scroll Sync
const scrollLogoArea = document.querySelector('.scroll-logo');
const graphArea = document.querySelector('.graph-area');
let isRotating = false;
let lastY = 0;
let lastX = 0;
let currentRotation = 0;
let shakeOffset = 0;
let lastScrollLeft = 0;
let isScrollingFromRotation = false;

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
  scrollLogoArea.style.transform = `translateX(${shakeOffset}px) rotate(${currentRotation}deg)`;
}

function playLogoButtonAudio(type) {
  const audio = logoButtonAudio[type];
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch(() => {});
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

scrollLogoArea.addEventListener('mousedown', (e) => {
  isRotating = true;
  lastY = e.clientY;
  lastX = e.clientX;
  scrollLogoArea.style.cursor = 'grabbing';
});

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
    scrollLogoArea.style.cursor = 'grab';

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
  scrollLogoArea.style.transition = 'transform 0.3s ease-in-out';
  currentRotation = snappedRotation;
  renderScrollLogoTransform();
  setTimeout(() => {
    scrollLogoArea.style.transition = 'none';
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

scrollLogoArea.style.cursor = 'grab';
renderScrollLogoTransform();

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
  if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
    e.preventDefault();
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
    }
  }
}

// Sync rotation to horizontal scroll
graphArea.addEventListener('scroll', (e) => {
  const scrollDelta = graphArea.scrollLeft - lastScrollLeft;
  currentRotation += scrollDelta * scrollToRotationFactor;
  
  renderScrollLogoTransform();
  lastScrollLeft = graphArea.scrollLeft;

  updateScrollNotifyOnScroll();
});
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

      container.scrollTo({ left: nextScrollLeft, top: nextScrollTop, behavior: 'smooth' });
    }
  });
});

	//Scroll Down the clicked code end


	//Play Video when hovered
document.addEventListener("DOMContentLoaded", () => {
  const containers = document.querySelectorAll(".video-container");

  containers.forEach(container => {
    const video = container.querySelector(".node-video");
    const overlay = container.querySelector(".play-overlay");

    // Start paused
    video.pause();
    overlay.style.opacity = "1";

    container.addEventListener("mouseenter", () => {
      overlay.style.opacity = "0";
      video.play();
    });

    container.addEventListener("mouseleave", () => {
      video.pause();
		video.currentTime = '0';
      overlay.style.opacity = "1";
    });
  });
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
  // Set canvas size to match the FULL scrollable area, not just visible area
  canvas.width = graphArea.scrollWidth;
  canvas.height = graphArea.scrollHeight;
  canvas.style.width = graphArea.scrollWidth + "px";
  canvas.style.height = graphArea.scrollHeight + "px";
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

// Initial draw and resize after layout is complete
window.addEventListener("load", () => {
  resizeCanvasToGraphArea();
  updateAnchorElements();
  draw();
  updateScrollNotifyOnScroll();
});

// Handle resize
window.addEventListener("resize", () => {
  resizeCanvasToGraphArea();
  updateAnchorElements();
  scheduleDraw();
  updateScrollNotifyOnScroll();
});

// Redraw on graph-area scroll (not window scroll)
graphArea.addEventListener("scroll", () => {
  draw(); // Draw immediately on every scroll for smooth updates
});

// Redraw on content changes (MutationObserver for dynamic content)
const observer = new MutationObserver(scheduleDraw);
observer.observe(graphArea, { childList: true, subtree: true });

// Initial draw and resize
resizeCanvasToGraphArea();
draw();

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
