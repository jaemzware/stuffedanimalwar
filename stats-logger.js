const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'output.log');
const STATS_INTERVAL = 60 * 1000; // Log stats every 60 seconds

class StatsLogger {
    constructor() {
        this.stats = {
            events: {
                chat: 0,
                tap: 0,
                path: 0,
                presentImage: 0,
                audioControl: 0,
                videoControl: 0,
                voiceOffer: 0,
                voiceAnswer: 0,
                voiceIceCandidate: 0
            },
            endpoints: {},
            startTime: new Date()
        };
        this.startLogging();
    }

    recordEvent(eventType, endpoint) {
        if (this.stats.events[eventType]) {
            this.stats.events[eventType]++;
        }
        if (endpoint) {
            if (!this.stats.endpoints[endpoint]) {
                this.stats.endpoints[endpoint] = { connections: 0, events: 0 };
            }
            this.stats.endpoints[endpoint].events++;
        }
    }

    updateEndpoints(pageCounters) {
        this.stats.endpoints = {};
        for (const [endpoint, count] of Object.entries(pageCounters)) {
            if (count > 0) {
                this.stats.endpoints[endpoint] = {
                    connections: count,
                    events: this.stats.endpoints[endpoint]?.events || 0
                };
            }
        }
    }

    reset() {
        for (const key in this.stats.events) {
            this.stats.events[key] = 0;
        }
        for (const endpoint in this.stats.endpoints) {
            if (this.stats.endpoints[endpoint]) {
                this.stats.endpoints[endpoint].events = 0;
            }
        }
    }

    startLogging() {
        setInterval(() => {
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

            let logMessage = `\n========== [${pstTime}] STATS ==========\n`;

            // Total active connections
            const totalConnections = Object.values(this.stats.endpoints).reduce(
                (sum, ep) => sum + ep.connections, 0
            );
            logMessage += `Total Connections: ${totalConnections}\n`;

            // Active rooms/endpoints
            const activeEndpoints = Object.keys(this.stats.endpoints)
                .filter(ep => this.stats.endpoints[ep].connections > 0);

            if (activeEndpoints.length > 0) {
                logMessage += `\nActive Rooms:\n`;
                activeEndpoints.forEach(endpoint => {
                    const ep = this.stats.endpoints[endpoint];
                    logMessage += `  ${endpoint}: ${ep.connections} user(s), ${ep.events} event(s)\n`;
                });
            } else {
                logMessage += `\nActive Rooms: None\n`;
            }

            // Event breakdown
            const totalEvents = Object.values(this.stats.events).reduce((a, b) => a + b, 0);
            if (totalEvents > 0) {
                logMessage += `\nEvents (last 60s): ${totalEvents} total\n`;
                Object.entries(this.stats.events).forEach(([type, count]) => {
                    if (count > 0) {
                        logMessage += `  ${type}: ${count}\n`;
                    }
                });
            }

            logMessage += `==========================================\n`;

            // Append to log file
            fs.appendFileSync(LOG_FILE, logMessage);
            console.log(`[STATS] Logged to output.log - ${totalConnections} connections, ${totalEvents} events`);

            // Reset event counters for next interval
            this.reset();
        }, STATS_INTERVAL);
    }
}

module.exports = new StatsLogger();
