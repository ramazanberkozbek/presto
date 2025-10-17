/**
 * Reusable Bar Chart Component
 * Used for daily/weekly/monthly/yearly focus time distribution
 */

export class BarChart {
    constructor(config) {
        this.config = {
            containerId: config.containerId,           // Main container ID
            barsContainerId: config.barsContainerId,   // Bars container ID
            yAxisId: config.yAxisId,                   // Y-axis container ID
            gridId: config.gridId,                     // Grid container ID
            totalDisplayId: config.totalDisplayId,     // Total time display ID
            
            // Data and scale
            maxValue: config.maxValue || 60,           // Max value for Y-axis (60 for daily, dynamic for weekly)
            yAxisLabel: config.yAxisLabel || 'dk',     // Y-axis label
            useFixedMax: config.useFixedMax || false,  // Whether to use fixed max (true for daily)
            minScale: config.minScale || 20,           // Minimum scale to show
            
            // Bar styling
            barMaxWidth: config.barMaxWidth || 50,     // Max bar width in pixels
            barMinHeight: config.barMinHeight || 1,    // Min bar height percentage for visibility
            
            // X-axis
            xAxisLabels: config.xAxisLabels || [],     // Array of X-axis labels
            
            // Formatting
            tooltipFormat: config.tooltipFormat || this.defaultTooltipFormat.bind(this),
            totalFormat: config.totalFormat || this.defaultTotalFormat.bind(this),
            
            // Callbacks
            onNoData: config.onNoData || null,
        };
    }

    /**
     * Default tooltip format: "43 D" or "1 S 43 D"
     */
    defaultTooltipFormat(minutes) {
        if (minutes >= 60) {
            const hours = Math.floor(minutes / 60);
            const mins = Math.round(minutes % 60);
            if (mins === 0) {
                return `${hours} S`;
            }
            return `${hours} S ${mins} D`;
        }
        return `${Math.round(minutes)} D`;
    }

    /**
     * Default total format: "8 saat 11 dk"
     */
    defaultTotalFormat(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        if (hours > 0) {
            return `${hours} saat ${mins} dk`;
        }
        return `${Math.round(minutes)} dakika`;
    }

    /**
     * Render the complete bar chart
     * @param {Array} data - Array of {label, value, isActive} objects
     */
    render(data) {
        const container = document.getElementById(this.config.containerId);
        const barsContainer = document.getElementById(this.config.barsContainerId);
        const yAxisContainer = document.getElementById(this.config.yAxisId);
        const gridContainer = document.getElementById(this.config.gridId);
        const totalDisplay = document.getElementById(this.config.totalDisplayId);

        if (!barsContainer) return;

        // Check if data is empty
        if (!data || data.length === 0 || data.every(d => d.value === 0)) {
            this.showNoData(barsContainer);
            if (yAxisContainer) this.renderYAxis(yAxisContainer, 0);
            if (gridContainer) this.renderGrid(gridContainer);
            if (totalDisplay) totalDisplay.textContent = '0 saat 0 dk';
            return;
        }

        // Calculate total and max
        const total = data.reduce((sum, d) => sum + d.value, 0);
        const maxDataValue = Math.max(...data.map(d => d.value), 1);
        
        // Determine scale max
        let scaleMax;
        if (this.config.useFixedMax) {
            scaleMax = this.config.maxValue; // Fixed max (e.g., 60 for daily)
        } else {
            // Dynamic max with headroom
            if (maxDataValue === 0) {
                scaleMax = this.config.minScale;
            } else if (maxDataValue <= 50) {
                scaleMax = Math.ceil(maxDataValue / 10) * 10;
                scaleMax = Math.max(scaleMax, this.config.minScale);
            } else {
                scaleMax = Math.ceil(maxDataValue / 20) * 20;
            }
            // Add 20% headroom
            scaleMax = Math.ceil(scaleMax * 1.2 / 10) * 10;
        }

        // Update total display
        if (totalDisplay) {
            totalDisplay.textContent = this.config.totalFormat(total);
        }

        // Render components
        if (yAxisContainer) this.renderYAxis(yAxisContainer, scaleMax);
        if (gridContainer) this.renderGrid(gridContainer);
        this.renderBars(barsContainer, data, scaleMax);
    }

    /**
     * Show "no data" message
     */
    showNoData(container) {
        // Render an empty placeholder (no text) so grid lines remain visible.
        container.innerHTML = '';
    }

    /**
     * Render Y-axis labels
     */
    renderYAxis(container, maxValue) {
        if (!container) return;

        let stepValue;
        let niceMax = maxValue;

        // Determine step size
        if (this.config.useFixedMax) {
            // Fixed scale (for daily: 0-60)
            if (maxValue >= 25) {
                stepValue = 10;
                niceMax = 60;
            } else {
                stepValue = 5;
                niceMax = 25;
            }
        } else {
            // Dynamic scale (for weekly/monthly)
            stepValue = niceMax / 5;
        }

        // Create labels from max to 0 (top to bottom)
        const labels = [];
        for (let i = 5; i >= 0; i--) {
            labels.push(Math.round(i * stepValue));
        }

        container.innerHTML = labels.map(value => {
            if (value === 0) {
                return `<span>0 ${this.config.yAxisLabel}</span>`;
            }
            return `<span>${value}</span>`;
        }).join('');

        // Store max value for bar scaling
        container.dataset.maxValue = niceMax;
    }

    /**
     * Render grid lines
     */
    renderGrid(container) {
        if (!container) return;

        // Create 6 horizontal grid lines
        // Determine grid line class based on container ID
        const gridLineClass = container.id.includes('timeline') ? 'timeline-grid-line' :
                             container.id.includes('monthly') ? 'monthly-grid-line' :
                             container.id.includes('yearly') ? 'yearly-grid-line' :
                             'weekly-grid-line';
        
        const lines = Array.from({ length: 6 }, () => 
            `<div class="${gridLineClass}"></div>`
        ).join('');

        container.innerHTML = lines;
    }

    /**
     * Render bars
     */
    renderBars(container, data, scaleMax) {
        if (!container) return;

        // Get actual max from Y-axis if available
        const yAxis = document.getElementById(this.config.yAxisId);
        const actualMax = yAxis && yAxis.dataset.maxValue ? 
            parseFloat(yAxis.dataset.maxValue) : scaleMax;

        // Determine bar class based on container ID
        const barClass = container.id.includes('timeline') ? 'timeline-bar' :
                        container.id.includes('monthly') ? 'monthly-bar' :
                        container.id.includes('yearly') ? 'yearly-bar' :
                        'weekly-bar';
        
        const indicatorClass = barClass + '-indicator';
        const tooltipClass = barClass + '-tooltip';

        container.innerHTML = '';

        data.forEach((item, index) => {
            const bar = document.createElement('div');
            bar.className = barClass;

            if (item.isActive) {
                // Use 'current' class for yearly, 'today' for others
                bar.classList.add(container.id.includes('yearly') ? 'current' : 'today');
            }

            // Calculate height as percentage
            const heightPercent = item.value > 0 ? (item.value / actualMax) * 100 : 0;
            bar.style.height = `${Math.max(heightPercent, this.config.barMinHeight)}%`;

            // Set max width if provided
            if (this.config.barMaxWidth) {
                bar.style.maxWidth = `${this.config.barMaxWidth}px`;
            }

            // Add hover indicator circle
            const indicator = document.createElement('div');
            indicator.className = indicatorClass;
            bar.appendChild(indicator);

            // Add tooltip
            const tooltip = document.createElement('div');
            tooltip.className = tooltipClass;
            tooltip.textContent = this.config.tooltipFormat(item.value);
            bar.appendChild(tooltip);

            container.appendChild(bar);
        });
    }
}