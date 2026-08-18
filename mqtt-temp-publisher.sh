#!/bin/bash
# mqtt-temp-publisher.sh
# Reads Raspberry Pi CPU temperature and publishes to Mosquitto every 5 seconds

TEMP_FILE="/sys/class/thermal/thermal_zone0/temp"
MQTT_TOPIC="pi/temperature"
MQTT_BROKER="localhost"

while true; do
  if [ -f "$TEMP_FILE" ]; then
    # Read temperature in millidegrees, convert to Celsius
    TEMP_MILLIDEGREES=$(cat "$TEMP_FILE")
    TEMP_CELSIUS=$(echo "scale=1; $TEMP_MILLIDEGREES / 1000" | bc)

    # Publish to MQTT
    mosquitto_pub -h "$MQTT_BROKER" -t "$MQTT_TOPIC" -m "$TEMP_CELSIUS"
  fi
  sleep 5
done
