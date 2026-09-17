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

    getSnapshot() {
        return {
            events: { ...this.stats.events },
            endpoints: JSON.parse(JSON.stringify(this.stats.endpoints)),
            startTime: this.stats.startTime
        };
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
