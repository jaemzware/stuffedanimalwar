#!/bin/bash
# nginx-report.sh — traffic summary from all nginx logs
# Usage: sudo bash nginx-report.sh [output-file]
# Output defaults to stdout; pass a filename to save it too.

OUTPUT="${1:-}"
LOGDIR="/var/log/nginx"
TMPFILE=$(mktemp)

# Collect all access log lines (current + rotated gz)
zcat "$LOGDIR"/access.log.*.gz 2>/dev/null > "$TMPFILE"
cat "$LOGDIR/access.log" >> "$TMPFILE"

LINE_COUNT=$(wc -l < "$TMPFILE")

report() {
cat <<EOF
================================================================================
  NGINX TRAFFIC REPORT — $(date)
  Log lines analyzed: $LINE_COUNT
================================================================================

── TOP 20 IPs BY HIT COUNT ─────────────────────────────────────────────────────
$(awk '{print $1}' "$TMPFILE" | sort | uniq -c | sort -rn | head -20)

── COUNTRIES (GeoIP) ────────────────────────────────────────────────────────────
$(awk '{print $1}' "$TMPFILE" | sort -u | while read ip; do
    geoiplookup "$ip" 2>/dev/null
  done | grep -v "can't resolve\|not found\|IP Address not found" \
       | awk -F': ' '{print $2}' | awk -F',' '{print $1","$2}' \
       | sort | uniq -c | sort -rn | head -20)

── TOP USER AGENTS ──────────────────────────────────────────────────────────────
$(awk -F'"' '{print $6}' "$TMPFILE" | sort | uniq -c | sort -rn | head -25)

── KNOWN BOTS ───────────────────────────────────────────────────────────────────
$(awk -F'"' '{print $6}' "$TMPFILE" | grep -i "bot\|crawler\|spider\|crawl" \
  | sort | uniq -c | sort -rn | head -20)

── NO USER AGENT (raw probes) ───────────────────────────────────────────────────
$(awk -F'"' '$6 == "-"' "$TMPFILE" | awk '{print $1}' \
  | sort | uniq -c | sort -rn | head -15)

── TOP REQUESTED PATHS ──────────────────────────────────────────────────────────
$(awk '{print $7}' "$TMPFILE" | sort | uniq -c | sort -rn | head -30)

── PROBE / SCAN ATTEMPTS ────────────────────────────────────────────────────────
$(grep -iE '\.env|\.git/config|\.aws|wp-config|phpinfo|/etc/passwd|admin|shell|eval\(|base64|/cgi-bin|\.php' "$TMPFILE" \
  | awk '{print $7}' | sort | uniq -c | sort -rn | head -20)

── HTTP STATUS CODES ────────────────────────────────────────────────────────────
$(awk '{print $9}' "$TMPFILE" | sort | uniq -c | sort -rn)

── TOP 404s ─────────────────────────────────────────────────────────────────────
$(awk '$9 == "404" {print $7}' "$TMPFILE" | sort | uniq -c | sort -rn | head -20)

── TOP 444s (blocked by nginx) ──────────────────────────────────────────────────
$(awk '$9 == "444" {print $1, $7}' "$TMPFILE" | sort | uniq -c | sort -rn | head -15)

── TRAFFIC BY HOUR (today) ──────────────────────────────────────────────────────
$(grep "$(date '+%d/%b/%Y')" "$TMPFILE" \
  | awk '{print $4}' | cut -d: -f2 | sort | uniq -c)

── LARGEST RESPONSES (potential data exfil or legit big files) ──────────────────
$(awk '{print $10, $7, $1}' "$TMPFILE" | grep -v '"-"' | sort -rn | head -10)

================================================================================
EOF
}

rm -f "$TMPFILE2"

if [ -n "$OUTPUT" ]; then
    report | tee "$OUTPUT"
    echo ""
    echo "Report saved to: $OUTPUT"
else
    report
fi

rm -f "$TMPFILE"
