// Scroll Logo Rotation + Horizontal Scroll Sync
const scrollLogoArea = document.querySelector('.scroll-logo');
const graphArea = document.querySelector('.graph-area');
let isRotating = false;
let lastY = 0;
let lastX = 0;
let currentRotation = 0;
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
  
  scrollLogoArea.style.transform = `rotate(${currentRotation}deg)`;
  
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
  scrollLogoArea.style.transform = `rotate(${snappedRotation}deg)`;
  currentRotation = snappedRotation;
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
  scrollLogoArea.style.transform = `rotate(${currentRotation}deg)`;

  const scrollDelta = logoVelocity * scrollToRotationFactor;
  graphArea.scrollLeft += scrollDelta;
  isScrollingFromRotation = true;
  lastScrollLeft = graphArea.scrollLeft;
  isScrollingFromRotation = false;

  requestAnimationFrame(runLogoMomentum);
}

scrollLogoArea.style.cursor = 'grab';

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
  
  scrollLogoArea.style.transform = `rotate(${currentRotation}deg)`;
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

// Main draw function (throttled)
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineWidth = 10;
  ctx.strokeStyle = "#FFFFFF";

  const anchorPoints = getAnchorPoints();
  if (anchorPoints.length > 1) {
    CubicBezier.curveThroughPoints(ctx, anchorPoints, 0.15, 2.5);
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
