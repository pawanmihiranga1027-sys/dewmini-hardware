#!/usr/bin/env bash
set -e
pnpm run check
pnpm test
pnpm run build
