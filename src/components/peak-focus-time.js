/**
 * PeakFocusTime component
 * Renders a 24-point line chart showing average minutes focused per hour (average over 7 days)
 */
export class PeakFocusTime {
    constructor(config) {
        this.containerId = config.containerId;
        this.width = config.width || 680;
        this.height = config.height || 200;
        this.padding = { top: 36, right: 24, bottom: 36, left: 40 };
        this.colors = {
            line: '#4A9B7F',
            pointBorder: '#4A9B7F',
            peakFill: '#5FE6C9'
        };
        this.tooltip = null;
    }

    render(result) {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // result: { averages: number[24], peakHour: number, peakValue: number }
        const averages = (result && result.averages) || new Array(24).fill(0);
        const peakHour = result ? result.peakHour : 0;
        const peakValue = result ? result.peakValue : 0;

        container.innerHTML = '';

    // Header (use white text to match dark weekly card)
    const title = document.createElement('h3');
    title.textContent = 'Günün En Odaklanılan Zamanı';
    title.style.color = '#FFFFFF';
    title.style.fontSize = '18px';
    title.style.margin = '0 0 6px 0';
    container.appendChild(title);

    const sub = document.createElement('div');
    // reuse the same style as FocusTrend comparison text
    sub.className = 'trend-comparison-text';
    sub.innerHTML = `Genellikle günün en odaklanılan zamanı <span class="peak-time">${this.formatHour(peakHour)}</span>`;
    container.appendChild(sub);

        // SVG setup
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
        svg.style.display = 'block';
        svg.style.overflow = 'visible';

        const innerW = this.width - this.padding.left - this.padding.right;
        const innerH = this.height - this.padding.top - this.padding.bottom;

        // compute max for y-axis and build dynamic ticks (no hard cap at 60)
        const maxVal = Math.max(...averages, 1);

        let ticks = [];
        let yMax = 1;

        // Small values: keep fine-grained ticks up to 25
        if (maxVal === 0) {
            // No data: show tight scale
            ticks = [0, 5, 10, 15];
            yMax = 15;
        } else if (maxVal <= 15) {
            // Small values (<=15): keep top close so 10 -> 15
            ticks = [0, 5, 10, 15];
            yMax = 15;
        } else if (maxVal <= 25) {
            ticks = [0, 5, 10, 15, 20, 25];
            yMax = 25;
        } else {
            // For larger maxima, build ~5 ticks (including zero) with a 'nice' step (multiple of 5)
            const tickCount = 5; // including zero
            let step = Math.ceil(maxVal / (tickCount - 1));
            // round step up to nearest multiple of 5 for nicer labels
            step = Math.max(5, Math.ceil(step / 5) * 5);
            yMax = step * (tickCount - 1);
            ticks = Array.from({ length: tickCount }, (_, i) => i * step);
        }

        // scales
    // add a small horizontal inset so first/last points don't sit flush to edges
    const horizontalInset = Math.max(12, innerW * 0.03);
    const x = (i) => this.padding.left + horizontalInset + (i / 23) * (innerW - horizontalInset * 2);
    const y = (v) => this.padding.top + innerH - (v / yMax) * innerH;

        // gridlines and left-side labels according to ticks (render from top -> bottom)
        for (let i = ticks.length - 1; i >= 0; i--) {
            const t = ticks[i];
            const yy = y(t);
            const line = document.createElementNS(svg.namespaceURI, 'line');
            line.setAttribute('x1', this.padding.left);
            line.setAttribute('x2', this.width - this.padding.right);
            line.setAttribute('y1', yy);
            line.setAttribute('y2', yy);
            line.setAttribute('stroke', 'rgba(255,255,255,0.06)');
            line.setAttribute('stroke-width', '1');
            svg.appendChild(line);

            // left label for tick (minutes)
            const lx = this.padding.left - 8;
            const ty = document.createElementNS(svg.namespaceURI, 'text');
            ty.setAttribute('x', lx);
            ty.setAttribute('y', yy + 4); // adjust for baseline
            ty.setAttribute('text-anchor', 'end');
            ty.setAttribute('fill', '#FFFFFF');
            ty.setAttribute('font-size', '11');
            ty.textContent = `${t}`;
            svg.appendChild(ty);
        }

    // unit label removed per design; keep method if needed later

        // path (smooth cubic bezier)
        const d = this.buildPathData(averages, x, y);
        const path = document.createElementNS(svg.namespaceURI, 'path');
        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', this.colors.line);
        path.setAttribute('stroke-width', '2.5');
        path.setAttribute('stroke-linejoin', 'round');
        path.setAttribute('stroke-linecap', 'round');
        svg.appendChild(path);

        // Previously we showed a translucent spotlight under the peak; removed to avoid
        // unwanted shadow artifacts. The peak is now indicated only by the dashed guide and point.
        const peakStartIndex = Math.max(0, peakHour - 1);
        const peakEndIndex = Math.min(23, peakHour + 1);

        // vertical dashed line at peak (only when there's a meaningful peak)
        if (peakValue > 0) {
            const peakX = x(peakHour);
            const vline = document.createElementNS(svg.namespaceURI, 'line');
            vline.setAttribute('x1', peakX);
            vline.setAttribute('x2', peakX);
            // extend dashed line from top of inner chart to baseline so it goes both up and down
            vline.setAttribute('y1', this.padding.top);
            vline.setAttribute('y2', this.height - this.padding.bottom);
            vline.setAttribute('stroke', '#CCCCCC');
            vline.setAttribute('stroke-width', '1.5');
            vline.setAttribute('stroke-dasharray', '6 4');
            svg.appendChild(vline);
        }

        // Hover interactivity: create small hidden dots and labels for each hour and hit areas
        const hourDots = [];
        const hourLabels = [];
        for (let i = 0; i < 24; i++) {
            const val = averages[i] || 0;
            const cx = x(i);
            const cy = y(val);

            // small dot (hidden by default)
            const dot = document.createElementNS(svg.namespaceURI, 'circle');
            dot.setAttribute('cx', cx);
            dot.setAttribute('cy', cy);
            dot.setAttribute('r', 4);
            dot.setAttribute('fill', '#FFFFFF');
            dot.setAttribute('stroke', this.colors.pointBorder);
            dot.setAttribute('stroke-width', '1.5');
            dot.setAttribute('opacity', '0');
            dot.setAttribute('pointer-events', 'none');
            svg.appendChild(dot);
            hourDots.push(dot);

            // small label above dot (hidden by default) — slightly larger and higher for clarity
            const label = document.createElementNS(svg.namespaceURI, 'text');
            label.setAttribute('x', cx);
            label.setAttribute('y', cy - 14);
            label.setAttribute('text-anchor', 'middle');
            label.setAttribute('fill', '#FFFFFF');
            label.setAttribute('font-size', '13');
            label.setAttribute('font-weight', '600');
            label.setAttribute('opacity', '0');
            label.setAttribute('pointer-events', 'none');
            svg.appendChild(label);
            hourLabels.push(label);

            // hit area (tall transparent rect) to capture hover across the column
            const hitWidth = innerW / 23; // approximate column width
            const hit = document.createElementNS(svg.namespaceURI, 'rect');
            hit.setAttribute('x', cx - hitWidth / 2);
            hit.setAttribute('y', this.padding.top);
            hit.setAttribute('width', hitWidth);
            hit.setAttribute('height', innerH);
            hit.setAttribute('fill', 'transparent');
            hit.style.cursor = 'pointer';

            // mouse handlers
            hit.addEventListener('mouseenter', (e) => {
                // show dot for this hour and label
                hourDots.forEach((d, idx) => d.setAttribute('opacity', idx === i ? '1' : '0'));
                hourLabels.forEach((lbl, idx) => {
                    if (idx === i) {
                        lbl.textContent = `${Math.round(val)} D`;
                        lbl.setAttribute('opacity', '1');
                    } else {
                        lbl.setAttribute('opacity', '0');
                    }
                });
                // show tooltip with minutes
                this.showTooltip(e, i, val, container);
            });
            hit.addEventListener('mousemove', (e) => {
                // move tooltip as mouse moves
                if (this.tooltip) {
                    this.tooltip.style.left = `${e.clientX + 8}px`;
                    this.tooltip.style.top = `${e.clientY - 28}px`;
                }
            });
            hit.addEventListener('mouseleave', () => {
                hourDots.forEach(d => d.setAttribute('opacity', '0'));
                hourLabels.forEach(lbl => lbl.setAttribute('opacity', '0'));
                this.hideTooltip();
            });

            svg.appendChild(hit);
        }

        // Only draw a visible dot at the peak hour (remove other dots as requested)
        // If peakValue is 0, there is no meaningful peak to show.
        if (peakValue > 0 && peakHour >= 0 && peakHour <= 23) {
            const val = averages[peakHour];
            const cx = x(peakHour);
            const cy = y(val);

            const group = document.createElementNS(svg.namespaceURI, 'g');
            group.setAttribute('data-hour', peakHour);

            // outer circle (border) - emphasize the peak
            const circle = document.createElementNS(svg.namespaceURI, 'circle');
            circle.setAttribute('cx', cx);
            circle.setAttribute('cy', cy);
            circle.setAttribute('r', 7);
            circle.setAttribute('fill', '#FFFFFF');
            circle.setAttribute('stroke', this.colors.pointBorder);
            circle.setAttribute('stroke-width', '3');
            group.appendChild(circle);

            // interaction rect (bigger hit area) only for peak
            const hit = document.createElementNS(svg.namespaceURI, 'rect');
            hit.setAttribute('x', cx - 18);
            hit.setAttribute('y', this.padding.top);
            hit.setAttribute('width', 36);
            hit.setAttribute('height', innerH);
            hit.setAttribute('fill', 'transparent');
            hit.style.cursor = 'pointer';
            hit.addEventListener('mouseenter', (e) => {
                // show the hover dot and label for the peak hour
                if (hourDots && hourLabels) {
                    hourDots.forEach((d, idx) => d.setAttribute('opacity', idx === peakHour ? '1' : '0'));
                    hourLabels.forEach((lbl, idx) => {
                        if (idx === peakHour) {
                            lbl.textContent = `${Math.round(val)} D`;
                            lbl.setAttribute('opacity', '1');
                        } else {
                            lbl.setAttribute('opacity', '0');
                        }
                    });
                }
            });
            hit.addEventListener('mouseleave', () => {
                if (hourDots && hourLabels) {
                    hourDots.forEach(d => d.setAttribute('opacity', '0'));
                    hourLabels.forEach(lbl => lbl.setAttribute('opacity', '0'));
                }
            });
            group.appendChild(hit);

            svg.appendChild(group);
        }

        // X-axis labels (major ticks every 6 hours)
        const labels = [0, 6, 12, 18, 23];
        labels.forEach(h => {
            const lx = x(h);
            const tx = document.createElementNS(svg.namespaceURI, 'text');
            tx.setAttribute('x', lx);
            tx.setAttribute('y', this.height - 8);
            tx.setAttribute('text-anchor', 'middle');
            // use white text for labels to be visible on dark card
            tx.setAttribute('fill', '#FFFFFF');
            tx.setAttribute('font-size', '12');
            tx.textContent = this.formatHour(h);
            svg.appendChild(tx);
        });

        container.appendChild(svg);

        // basic styles for subheader
        const style = document.createElement('style');
        style.textContent = `
            #${this.containerId} .trend-comparison-text { margin-bottom: 8px; }
            /* Reduce brightness of the peak time label to match comparison text */
            #${this.containerId} .trend-comparison-text .peak-time { color: #999999; font-weight: 600; }
        `;
        container.appendChild(style);
    }

    buildPathData(values, x, y) {
        if (!values || values.length === 0) return '';
        // Use simple Catmull-Rom to Bezier conversion for smooth curve
        const points = values.map((v, i) => ({ x: x(i), y: y(v) }));
        let d = '';
        points.forEach((p, i) => {
            if (i === 0) {
                d += `M ${p.x} ${p.y}`;
            } else {
                const p0 = points[i - 1];
                const midX = (p0.x + p.x) / 2;
                d += ` Q ${p0.x} ${p0.y} ${midX} ${ (p0.y + p.y) / 2 }`;
                d += ` T ${p.x} ${p.y}`;
            }
        });
        return d;
    }

    buildAreaPath(values, x, y, startIndex, endIndex, yMax, innerH) {
        if (startIndex > endIndex) return null;
        let d = '';
        for (let i = startIndex; i <= endIndex; i++) {
            const px = x(i);
            const py = y(values[i]);
            if (i === startIndex) d += `M ${px} ${this.height - this.padding.bottom} L ${px} ${py}`;
            else d += ` L ${px} ${py}`;
        }
        // close to baseline on the right
        const rightX = x(endIndex);
        d += ` L ${rightX} ${this.height - this.padding.bottom} Z`;
        return d;
    }

    formatHour(h) {
        const hh = h.toString().padStart(2, '0');
        return `${hh}:00`;
    }

    showTooltip(evt, hour, value, container) {
        // Tooltip DOM removed: we now use SVG in-chart labels above dots.
        // Method kept intentionally for compatibility but does nothing.
    }

    hideTooltip() {
        // No-op: DOM tooltip was removed. Keep method for compatibility.
        this.tooltip = null;
    }
}
