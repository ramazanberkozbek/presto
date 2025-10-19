/**
 * MonthlyPeakDay component (line-chart style)
 * Renders a 7-point line chart (Mon-Sun) using the same visual language as PeakFocusTime.
 * Input: { totalsByWeekday: number[7], peakDayIndex: number, peakValue: number }
 */
export class MonthlyPeakDay {
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
  }

  render(result) {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const raw = (result && result.totalsByWeekday) || [];
    const values = Array.from({ length: 7 }, (_, i) => (raw[i] == null ? 0 : raw[i]));
    const peakDay = (result && Number.isFinite(result.peakDayIndex)) ? result.peakDayIndex : 0;
    const peakValue = (result && Number.isFinite(result.peakValue)) ? result.peakValue : 0;

    container.innerHTML = '';

    // Header
    const title = document.createElement('h3');
    title.textContent = 'Haftanın En Odaklanılan Günü';
    title.style.color = '#FFFFFF';
    title.style.fontSize = '18px';
    title.style.margin = '0 0 6px 0';
    container.appendChild(title);

    const sub = document.createElement('div');
    sub.className = 'trend-comparison-text';
    sub.innerHTML = `Genellikle ay içinde en odaklanılan gün <span class="peak-time">${this.weekdayLabel(peakDay)}</span>`;
    container.appendChild(sub);

    // SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
    svg.style.display = 'block';
    svg.style.overflow = 'visible';

    const innerW = this.width - this.padding.left - this.padding.right;
    const innerH = this.height - this.padding.top - this.padding.bottom;

    const maxVal = Math.max(...values, 0);

    // Dynamic ticks and yMax (no hard cap at 60)
    let ticks = [];
    let yMax = 1;

    if (maxVal === 0) {
      // No data: show a small, tight scale so chart doesn't look empty with a large top
      ticks = [0, 5, 10, 15];
      yMax = 15;
    } else if (maxVal <= 15) {
      // Small values (<=15): keep top close so 10 -> 15, etc.
      ticks = [0, 5, 10, 15];
      yMax = 15;
    } else {
      const tickCount = 5; // including zero
      let step = Math.ceil(maxVal / (tickCount - 1));
      step = Math.max(5, Math.ceil(step / 5) * 5);
      yMax = step * (tickCount - 1);
      ticks = Array.from({ length: tickCount }, (_, i) => i * step);
    }

  // add a small horizontal inset so the first/last points aren't flush to the edges
  const horizontalInset = Math.max(12, innerW * 0.03);
  const x = (i) => this.padding.left + horizontalInset + (i / 6) * (innerW - horizontalInset * 2); // 7 points => indices 0..6
    const y = (v) => this.padding.top + innerH - (v / yMax) * innerH;

    // gridlines and labels
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

      const ty = document.createElementNS(svg.namespaceURI, 'text');
      ty.setAttribute('x', this.padding.left - 8);
      ty.setAttribute('y', yy + 4);
      ty.setAttribute('text-anchor', 'end');
      ty.setAttribute('fill', '#FFFFFF');
      ty.setAttribute('font-size', '11');
      ty.textContent = `${t}`;
      svg.appendChild(ty);
    }

  // remove y unit label per design request (keep space for it if needed in future)

    // path
    const d = this.buildPathData(values, x, y);
    const path = document.createElementNS(svg.namespaceURI, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', this.colors.line);
    path.setAttribute('stroke-width', '2.5');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('stroke-linecap', 'round');
    svg.appendChild(path);

    // vertical dashed line at peak
    if (peakValue > 0 && peakDay >= 0 && peakDay <= 6) {
      const peakX = x(peakDay);
      const vline = document.createElementNS(svg.namespaceURI, 'line');
      vline.setAttribute('x1', peakX);
      vline.setAttribute('x2', peakX);
      vline.setAttribute('y1', this.padding.top);
      vline.setAttribute('y2', this.height - this.padding.bottom);
      vline.setAttribute('stroke', '#CCCCCC');
      vline.setAttribute('stroke-width', '1.5');
      vline.setAttribute('stroke-dasharray', '6 4');
      svg.appendChild(vline);
    }

    // dots, labels and hit areas
    const dots = [];
    const labels = [];
    const dayLabels = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
    for (let i = 0; i < 7; i++) {
      const val = values[i] || 0;
      const cx = x(i);
      const cy = y(val);

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
      dots.push(dot);

      const txt = document.createElementNS(svg.namespaceURI, 'text');
      txt.setAttribute('x', cx);
      txt.setAttribute('y', cy - 14);
      txt.setAttribute('text-anchor', 'middle');
      txt.setAttribute('fill', '#FFFFFF');
      txt.setAttribute('font-size', '13');
      txt.setAttribute('font-weight', '600');
      txt.setAttribute('opacity', '0');
      txt.setAttribute('pointer-events', 'none');
      svg.appendChild(txt);
      labels.push(txt);

      const hitW = innerW / 7;
      const hit = document.createElementNS(svg.namespaceURI, 'rect');
      hit.setAttribute('x', cx - hitW/2);
      hit.setAttribute('y', this.padding.top);
      hit.setAttribute('width', hitW);
      hit.setAttribute('height', innerH);
      hit.setAttribute('fill', 'transparent');
      hit.style.cursor = 'pointer';
      hit.setAttribute('tabindex', '0');
      hit.setAttribute('role', 'button');
      hit.setAttribute('aria-label', `${dayLabels[i]} — ${Math.round(val)} dakika`);

      hit.addEventListener('mouseenter', (e) => {
        dots.forEach((d, idx) => d.setAttribute('opacity', idx === i ? '1' : '0'));
        labels.forEach((lbl, idx) => {
          if (idx === i) {
            lbl.textContent = `${Math.round(val)} D`;
            lbl.setAttribute('opacity', '1');
          } else lbl.setAttribute('opacity', '0');
        });
      });
      hit.addEventListener('mousemove', (e) => {
        // no DOM tooltip, labels used
      });
      hit.addEventListener('mouseleave', () => {
        dots.forEach(d => d.setAttribute('opacity', '0'));
        labels.forEach(lbl => lbl.setAttribute('opacity', '0'));
      });
      hit.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          dots.forEach((d, idx) => d.setAttribute('opacity', idx === i ? '1' : '0'));
          labels.forEach((lbl, idx) => {
            if (idx === i) {
              lbl.textContent = `${Math.round(val)} D`;
              lbl.setAttribute('opacity', '1');
            } else lbl.setAttribute('opacity', '0');
          });
        }
      });

      svg.appendChild(hit);
    }

    // peak marker
    if (peakValue > 0 && peakDay >= 0 && peakDay <= 6) {
      const val = values[peakDay] || 0;
      const cx = x(peakDay);
      const cy = y(val);

      const g = document.createElementNS(svg.namespaceURI, 'g');
      g.setAttribute('data-day', peakDay);

      const circle = document.createElementNS(svg.namespaceURI, 'circle');
      circle.setAttribute('cx', cx);
      circle.setAttribute('cy', cy);
      circle.setAttribute('r', 7);
      circle.setAttribute('fill', '#FFFFFF');
      circle.setAttribute('stroke', this.colors.pointBorder);
      circle.setAttribute('stroke-width', '3');
      g.appendChild(circle);

      const hit = document.createElementNS(svg.namespaceURI, 'rect');
      hit.setAttribute('x', cx - 18);
      hit.setAttribute('y', this.padding.top);
      hit.setAttribute('width', 36);
      hit.setAttribute('height', innerH);
      hit.setAttribute('fill', 'transparent');
      hit.style.cursor = 'pointer';
      hit.setAttribute('tabindex', '0');
      hit.setAttribute('role', 'button');
      hit.setAttribute('aria-label', `${this.weekdayLabel(peakDay)} — ${Math.round(val)} dakika (zirve)`);

      hit.addEventListener('mouseenter', () => {
        dots.forEach((d, idx) => d.setAttribute('opacity', idx === peakDay ? '1' : '0'));
        labels.forEach((lbl, idx) => {
          if (idx === peakDay) {
            lbl.textContent = `${Math.round(val)} D`;
            lbl.setAttribute('opacity', '1');
          } else lbl.setAttribute('opacity', '0');
        });
      });
      hit.addEventListener('mouseleave', () => {
        dots.forEach(d => d.setAttribute('opacity', '0'));
        labels.forEach(lbl => lbl.setAttribute('opacity', '0'));
      });

      g.appendChild(hit);
      svg.appendChild(g);
    }

    // X-axis labels
    dayLabels.forEach((lab, i) => {
      const lx = x(i);
      const tx = document.createElementNS(svg.namespaceURI, 'text');
      tx.setAttribute('x', lx);
      tx.setAttribute('y', this.height - 8);
      tx.setAttribute('text-anchor', 'middle');
      tx.setAttribute('fill', '#FFFFFF');
      tx.setAttribute('font-size', '12');
      tx.textContent = lab;
      svg.appendChild(tx);
    });

    container.appendChild(svg);

    const style = document.createElement('style');
    style.textContent = `#${this.containerId} .trend-comparison-text { margin-bottom: 8px; } #${this.containerId} .peak-time { color: #999999; font-weight:600; }`;
    container.appendChild(style);
  }

  buildPathData(values, x, y) {
    if (!values || values.length === 0) return '';
    const points = values.map((v, i) => ({ x: x(i), y: y(v) }));
    let d = '';
    points.forEach((p, i) => {
      if (i === 0) d += `M ${p.x} ${p.y}`;
      else {
        const p0 = points[i - 1];
        const midX = (p0.x + p.x) / 2;
        d += ` Q ${p0.x} ${p0.y} ${midX} ${(p0.y + p.y) / 2}`;
        d += ` T ${p.x} ${p.y}`;
      }
    });
    return d;
  }

  weekdayLabel(i) {
    const names = ['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'];
    return names[i] || '';
  }
}
