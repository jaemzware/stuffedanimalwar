const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'output.log');
const STATS_INTERVAL = 60 * 1000; // Log stats every 60 seconds

class StatsLogger {
    constructor() {
        // events/endpoints[].events are per-interval (written to output.log, reset every minute)
        // totals/endpoints[].totalEvents are cumulative since the service started
        this.stats = {
            events: {},
            totals: {},
            endpoints: {},
            startTime: new Date()
        };
        this.startLogging();
    }

    recordEvent(eventType, endpoint) {
        this.stats.events[eventType] = (this.stats.events[eventType] || 0) + 1;
        this.stats.totals[eventType] = (this.stats.totals[eventType] || 0) + 1;
        if (endpoint) {
            if (!this.stats.endpoints[endpoint]) {
                this.stats.endpoints[endpoint] = { connections: 0, events: 0, totalEvents: 0 };
            }
            this.stats.endpoints[endpoint].events++;
            this.stats.endpoints[endpoint].totalEvents++;
        }
    }

    updateEndpoints(pageCounters) {
        // Update connection counts in place so event counts survive connects/disconnects
        for (const [endpoint, count] of Object.entries(pageCounters)) {
            if (!this.stats.endpoints[endpoint]) {
                if (count <= 0) continue;
                this.stats.endpoints[endpoint] = { connections: 0, events: 0, totalEvents: 0 };
            }
            this.stats.endpoints[endpoint].connections = Math.max(count, 0);
        }
    }

    getSnapshot() {
        return {
            events: { ...this.stats.events },
            totals: { ...this.stats.totals },
            endpoints: JSON.parse(JSON.stringify(this.stats.endpoints)),
            startTime: this.stats.startTime
        };
    }

    reset() {
        this.stats.events = {};
        for (const endpoint in this.stats.endpoints) {
            this.stats.endpoints[endpoint].events = 0;
        }
    }

    startLogging() {
        setInterval(() => {
            // Total active connections
            const totalConnections = Object.values(this.stats.endpoints).reduce(
                (sum, ep) => sum + ep.connections, 0
            );

            // Only log if there's activity
            if (totalConnections === 0) {
                this.reset();
                return;
            }

            const now = new Date();
            const pstTime = now.toLocaleString("en-US", {
                timeZone: "America/Los_Angeles",
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });

            let logMessage = `[${pstTime}] Connections: ${totalConnections}`;

            // Active rooms/endpoints
            const activeEndpoints = Object.keys(this.stats.endpoints)
                .filter(ep => this.stats.endpoints[ep].connections > 0)
                .sort();

            if (activeEndpoints.length > 0) {
                logMessage += ' | Rooms: ';
                logMessage += activeEndpoints
                    .map(endpoint => {
                        const ep = this.stats.endpoints[endpoint];
                        return `${endpoint}(${ep.connections}u,${ep.events}e)`;
                    })
                    .join(', ');
            }

            logMessage += '\n';

            // Append to log file
            fs.appendFileSync(LOG_FILE, logMessage);

            // Reset event counters for next interval
            this.reset();
        }, STATS_INTERVAL);
    }
}

module.exports = new StatsLogger();
