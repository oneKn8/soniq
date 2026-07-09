#!/usr/bin/env bash
# Add swap to the Hetzner host.
#
# Why: the box (2 vCPU / ~8 GB RAM) already runs Coolify + Traefik + GlitchTip +
# the LiveKit stack, leaving little headroom. It currently has NO swap, so any
# memory spike (a build, a burst of calls) risks the OOM killer. A few GB of
# swap is cheap insurance against hard OOM while we keep container memory limits
# as the real bound.
#
# Safe to re-run: it no-ops if /swapfile already exists.
# Run as root on the host:  sudo bash deploy/setup-swap.sh [SIZE_GB]
set -euo pipefail

SIZE_GB="${1:-4}"
SWAPFILE="/swapfile"

if [[ $EUID -ne 0 ]]; then
  echo "Run as root (sudo bash deploy/setup-swap.sh)" >&2
  exit 1
fi

if swapon --show | grep -q "$SWAPFILE"; then
  echo "Swap already active at $SWAPFILE - nothing to do."
  swapon --show
  exit 0
fi

echo "Creating ${SIZE_GB}G swap at $SWAPFILE ..."
fallocate -l "${SIZE_GB}G" "$SWAPFILE" || dd if=/dev/zero of="$SWAPFILE" bs=1M count=$((SIZE_GB * 1024))
chmod 600 "$SWAPFILE"
mkswap "$SWAPFILE"
swapon "$SWAPFILE"

# Persist across reboots.
if ! grep -q "^$SWAPFILE " /etc/fstab; then
  echo "$SWAPFILE none swap sw 0 0" >> /etc/fstab
fi

# Tune for a server that should prefer RAM but use swap under pressure.
sysctl -w vm.swappiness=10
grep -q "^vm.swappiness" /etc/sysctl.conf && sed -i 's/^vm.swappiness.*/vm.swappiness=10/' /etc/sysctl.conf || echo "vm.swappiness=10" >> /etc/sysctl.conf

echo "Done."
free -h
