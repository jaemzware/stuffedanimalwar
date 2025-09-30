#!/usr/bin/env bash
lsof -t -i:55556 | xargs -r kill