var coll = document.getElementsByClassName("collapsible");
var i;

	
for (i = 0; i < coll.length; i++) {
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
	//Side Bar Drop Down code
	
	//Scroll Down the clicked code
document.querySelectorAll('a[href^="#recent_work"], a[href^="#work_detail"]').forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault(); // prevent default anchor jump

    const targetId = this.getAttribute('href').substring(1); // remove '#'
    const target = document.getElementById(targetId);
    const container = document.querySelector('.graph-area');

    if (target && container) {
      container.scrollTo({
        top: target.offsetTop - container.offsetTop,
        behavior: 'smooth'
      });
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



	//Curve Code
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
const graphArea = document.querySelector('.graph-area');
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
});

// Handle resize
window.addEventListener("resize", () => {
  resizeCanvasToGraphArea();
  updateAnchorElements();
  scheduleDraw();
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
