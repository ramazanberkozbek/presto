/**
 * Reusable Focus Trend Component
 * Shows comparison of focus time across different periods (daily/weekly)
 */

export class FocusTrend {
    constructor(config) {
        this.config = {
            containerId: config.containerId,           // Main container ID
            type: config.type || 'daily',              // 'daily' or 'weekly'
            title: config.title || 'Odaklanma Trendi',
            comparisonTextId: config.comparisonTextId,
            
            // Period configurations
            periods: config.periods || [],             // Array of period configs
            
            // Callbacks
            onPeriodClick: config.onPeriodClick || null,
        };
    }

    /**
     * Render the focus trend card
     * @param {Array} data - Array of period data objects
     * Format: [{label, time, date, value, comparisonValue, isActive}]
     */
    render(data) {
        const container = document.getElementById(this.config.containerId);
        if (!container) return;

        // Clear container
        container.innerHTML = '';

        // Add title
        const title = document.createElement('h3');
        title.textContent = this.config.title;
        container.appendChild(title);

        // Add comparison text
        const comparisonText = document.createElement('div');
        comparisonText.className = 'trend-comparison-text';
        comparisonText.id = this.config.comparisonTextId;
        comparisonText.textContent = data.length === 0 ? 'Analiz edilecek veri yok' : this.generateComparisonText(data);
        container.appendChild(comparisonText);

        // Add periods container
        const periodsContainer = document.createElement('div');
        periodsContainer.className = 'trend-days-container';

        data.forEach((period, index) => {
            const periodEl = this.createPeriodElement(period, index);
            periodsContainer.appendChild(periodEl);
        });

        container.appendChild(periodsContainer);
    }

    /**
     * Create a single period element
     */
    createPeriodElement(period, index) {
        const periodDiv = document.createElement('div');
        periodDiv.className = 'trend-day';

        // Header
        const header = document.createElement('div');
        header.className = 'trend-day-header';

        const label = document.createElement('div');
        label.className = 'trend-day-label';
        label.textContent = period.label;

        const meta = document.createElement('div');
        meta.className = 'trend-day-meta';

        const time = document.createElement('span');
        time.className = 'trend-day-time';
        time.textContent = period.time;

        // Removed date label from bar
        meta.appendChild(time);
        header.appendChild(label);
        header.appendChild(meta);

        // Bar
        const barWrapper = document.createElement('div');
        barWrapper.className = 'trend-bar-wrapper';

        const barBg = document.createElement('div');
        barBg.className = 'trend-bar-bg';

        const barFill = document.createElement('div');
        barFill.className = `trend-bar-fill ${this.getBarClass(index)}`;
        barFill.style.width = `${period.percentage || 0}%`;
        barBg.appendChild(barFill);

        // Add comparison dot if not the first period
        if (index > 0 && period.comparisonPercentage !== undefined) {
            const dot = document.createElement('div');
            dot.className = 'trend-comparison-dot';
            // Dot inside bar: position absolute, center vertically and horizontally within barFill
            dot.style.position = 'absolute';
            dot.style.top = '50%';
            dot.style.left = `${period.comparisonPercentage}%`;
            dot.style.transform = 'translate(-50%, -50%)';
            dot.style.display = 'block';
            // Enlarge hover area
            dot.style.width = '22px';
            dot.style.height = '22px';
            dot.style.pointerEvents = 'auto';
            dot.style.zIndex = '4';

            // Inner dot
            const innerDot = document.createElement('div');
            innerDot.style.width = '10px';
            innerDot.style.height = '10px';
            innerDot.style.background = '#FFFFFF';
            innerDot.style.borderRadius = '50%';
            innerDot.style.position = 'absolute';
            innerDot.style.top = '50%';
            innerDot.style.left = '50%';
            innerDot.style.transform = 'translate(-50%, -50%)';
            innerDot.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.15), 0 0 0 2px rgba(72, 201, 168, 0.3)';
            innerDot.style.pointerEvents = 'none';

            dot.appendChild(innerDot);

            const tooltip = document.createElement('div');
            tooltip.className = 'dot-tooltip';
            tooltip.textContent = period.comparisonTooltip || '';

            dot.appendChild(tooltip);
            // Append dot to the background container so left:% is relative to full bar width
            barBg.appendChild(dot);
        }

        barWrapper.appendChild(barBg);

        periodDiv.appendChild(header);
        periodDiv.appendChild(barWrapper);

        return periodDiv;
    }

    /**
     * Get bar fill class based on index
     */
    getBarClass(index) {
        const classes = ['trend-current', 'trend-previous', 'trend-older'];
        return classes[index] || 'trend-older';
    }

    /**
     * Generate comparison text
     */
    generateComparisonText(data) {
        if (!data || data.length < 2) return 'Analiz edilecek veri yok';

        const current = data[0];
        const previous = data[1];

        if (!current.value || !previous.value) {
            return 'Karşılaştırma için yeterli veri yok';
        }

        const diff = current.value - previous.value;
        const percentChange = previous.value > 0 
            ? Math.abs((diff / previous.value) * 100).toFixed(0)
            : 0;

        if (diff > 0) {
            return `${this.config.type === 'daily' ? 'Dün' : 'Geçen hafta'}e göre %${percentChange} daha fazla odaklandın 🎉`;
        } else if (diff < 0) {
            return `${this.config.type === 'daily' ? 'Dün' : 'Geçen hafta'}e göre %${percentChange} daha az odaklandın`;
        } else {
            return `${this.config.type === 'daily' ? 'Dün' : 'Geçen hafta'} ile aynı süre odaklandın`;
        }
    }

    /**
     * Format minutes to readable string
     */
    formatTime(minutes) {
        if (minutes === 0) return '0 S';
        
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        
        if (hours > 0 && mins > 0) {
            return `${hours} S ${mins} D`;
        } else if (hours > 0) {
            return `${hours} S`;
        } else {
            return `${mins} D`;
        }
    }
}
