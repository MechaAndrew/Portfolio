class CubicBezier {
    // Utility: distance between two points
    static distance(p1, p2) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Utility: create point from polar coordinates
    static polar(distance, angle) {
        return {
            x: distance * Math.cos(angle),
            y: distance * Math.sin(angle)
        };
    }

    // Bézier segment approximator (with 4 control points)
    static bezierValue(p1, p2, p3, p4, t) {
        const x =
            Math.pow(1 - t, 3) * p1.x +
            3 * Math.pow(1 - t, 2) * t * p2.x +
            3 * (1 - t) * t * t * p3.x +
            t * t * t * p4.x;
        const y =
            Math.pow(1 - t, 3) * p1.y +
            3 * Math.pow(1 - t, 2) * t * p2.y +
            3 * (1 - t) * t * t * p3.y +
            t * t * t * p4.y;
        return { x, y };
    }

    // Draw a single Bézier curve with 4 points
    static drawCurve(ctx, p1, p2, p3, p4) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        for (let t = 0.01; t <= 1.01; t += 0.01) {
            const { x, y } = CubicBezier.bezierValue(p1, p2, p3, p4, t);
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    // Draw a smooth curve through multiple points
    static curveThroughPoints(ctx, points, z = 0.5, angleFactor = 0.75, moveTo = true) {
        try {
            const p = points.slice();
            const duplicates = [];

            for (let i = 1; i < p.length; i++) {
                if (p[i].x === p[i - 1].x && p[i].y === p[i - 1].y) {
                    duplicates.push(i);
                }
            }

            for (let i = duplicates.length - 1; i >= 0; i--) {
                p.splice(duplicates[i], 1);
            }

            z = Math.max(0.001, Math.min(1, z));
            angleFactor = Math.max(0, Math.min(1, angleFactor));

            if (p.length < 2) return;

            if (p.length === 2) {
                ctx.beginPath();
                ctx.moveTo(p[0].x, p[0].y);
                ctx.lineTo(p[1].x, p[1].y);
                ctx.stroke();
                return;
            }

            const closed = (p[0].x === p[p.length - 1].x && p[0].y === p[p.length - 1].y);
            const firstPt = closed ? 0 : 1;
            const lastPt = closed ? p.length : p.length - 1;
            const controlPts = [];

            for (let i = firstPt; i < lastPt; i++) {
                const p0 = (i - 1 < 0) ? p[p.length - 2] : p[i - 1];
                const p1 = p[i];
                const p2 = (i + 1 === p.length) ? p[1] : p[i + 1];

                let a = CubicBezier.distance(p0, p1);
                let b = CubicBezier.distance(p1, p2);
                let c = CubicBezier.distance(p0, p2);
                a = Math.max(a, 0.001);
                b = Math.max(b, 0.001);
                c = Math.max(c, 0.001);

                let cos = (b * b + a * a - c * c) / (2 * b * a);
                cos = Math.max(-1, Math.min(1, cos));
                const C = Math.acos(cos);

                let aPt = { x: p0.x - p1.x, y: p0.y - p1.y };
                let bPt = { x: p1.x, y: p1.y };
                let cPt = { x: p2.x - p1.x, y: p2.y - p1.y };

                const scale = Math.min(a, b);
                const normalize = (pt, d) => {
                    const len = Math.sqrt(pt.x ** 2 + pt.y ** 2) || 1;
                    pt.x *= d / len;
                    pt.y *= d / len;
                };

                if (a > b) normalize(aPt, b);
                else if (b > a) normalize(cPt, a);

                aPt.x += p1.x; aPt.y += p1.y;
                cPt.x += p1.x; cPt.y += p1.y;

                const ax = bPt.x - aPt.x;
                const ay = bPt.y - aPt.y;
                const bx = bPt.x - cPt.x;
                const by = bPt.y - cPt.y;

                let rx = ax + bx;
                let ry = ay + by;

                if (rx === 0 && ry === 0) {
                    rx = -bx;
                    ry = by;
                }

                if ((ay === 0 && by === 0)) { rx = 0; ry = 1; }
                else if ((ax === 0 && bx === 0)) { rx = 1; ry = 0; }

                const theta = Math.atan2(ry, rx);
                let controlDist = scale * z;
                const controlScaleFactor = C / Math.PI;
                controlDist *= ((1 - angleFactor) + angleFactor * controlScaleFactor);

                const controlAngle = theta + Math.PI / 2;
                const cp2 = CubicBezier.polar(controlDist, controlAngle);
                const cp1 = CubicBezier.polar(controlDist, controlAngle + Math.PI);

                cp1.x += p1.x; cp1.y += p1.y;
                cp2.x += p1.x; cp2.y += p1.y;

                if (CubicBezier.distance(cp2, p2) > CubicBezier.distance(cp1, p2)) {
                    controlPts[i] = [cp2, cp1];
                } else {
                    controlPts[i] = [cp1, cp2];
                }
            }

            ctx.beginPath();
            if (moveTo) ctx.moveTo(p[0].x, p[0].y);
            else ctx.lineTo(p[0].x, p[0].y);

            if (firstPt === 1) {
                const [cp1] = controlPts[1];
                ctx.quadraticCurveTo(cp1.x, cp1.y, p[1].x, p[1].y);
            }

            const straightLines = true;
            for (let i = firstPt; i < lastPt - 1; i++) {
                const angle1 = Math.atan2(p[i].y - p[i - 1]?.y, p[i].x - p[i - 1]?.x);
                const angle2 = Math.atan2(p[i + 1].y - p[i].y, p[i + 1].x - p[i].x);
                const isStraight = (angle1 === angle2);

                if (straightLines && isStraight) {
                    ctx.lineTo(p[i + 1].x, p[i + 1].y);
                } else {
                    for (let t = 0.01; t <= 1.01; t += 0.01) {
                        const pt = CubicBezier.bezierValue(p[i], controlPts[i][1], controlPts[i + 1][0], p[i + 1], t);
                        ctx.lineTo(pt.x, pt.y);
                    }
                }
            }

            if (lastPt === p.length - 1) {
                const [, cp2] = controlPts[lastPt - 1];
                ctx.quadraticCurveTo(cp2.x, cp2.y, p[lastPt].x, p[lastPt].y);
            }

            ctx.stroke();
        } catch (e) {
            console.error(e);
        }
    }
}
// JavaScript Document