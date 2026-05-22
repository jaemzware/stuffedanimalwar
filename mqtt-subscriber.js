// mqtt-subscriber.js
// Subscribe to MQTT temperature and emit to Socket.IO clients
// Add this to your index.js after your io Socket.IO server is initialized

const mqtt = require('mqtt');

const mqttClient = mqtt.connect('mqtt://localhost');

mqttClient.on('connect', () => {
  console.log('MQTT connected');
  mqttClient.subscribe('pi/temperature', (err) => {
    if (err) console.error('MQTT subscribe error:', err);
  });
});

mqttClient.on('message', (topic, message) => {
  if (topic === 'pi/temperature') {
    const celsius = parseFloat(message.toString());
    const fahrenheit = (celsius * 9/5) + 32;

    // Emit to all connected Socket.IO clients
    io.emit('temperature', {
      celsius: Math.round(celsius * 10) / 10,
      fahrenheit: Math.round(fahrenheit * 10) / 10,
      timestamp: new Date().toISOString()
    });
  }
});

mqttClient.on('error', (err) => {
  console.error('MQTT error:', err);
});
