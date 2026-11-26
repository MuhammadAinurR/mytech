#!/usr/bin/env bash
# Runs Silo (https://github.com/pgsty/silo) for dev, tests and CI on
# http://127.0.0.1:9000 with silo-dev/silo-dev-secret. Production runs the same
# release. Never swap in MinIO: see ADR 0011.
#
#   scripts/silo.sh            # foreground, data in .silo/data
#   scripts/silo.sh --detach   # background (CI); waits until it is healthy
#
# The release is pinned and its archive checked against the SHA-256 published
# with it. To upgrade: change SILO_RELEASE and the four sums below, taken from
# that release's silo_<version>_checksums.txt.
set -euo pipefail

SILO_RELEASE=RELEASE.2026-11-12T00-00-00Z
SILO_VERSION=20261112000000.0.0
# A case, not an associative array: macOS still ships bash 3.2.
sha256_for() {
  case "$1" in
    darwin_amd64) echo fce2cba6d04b1bdde301f6fc790270a714bd69ab43ada6510227db3bce757c37 ;;
    darwin_arm64) echo 867a6cdf5521aaab34e87ed3f66df241e0d6e3dc11606721a15b7ed9e1da83c5 ;;
    linux_amd64) echo 378adce81515d31d48d8ac9b79effc62980e964c470fb06cc3ee8984786c2f4d ;;
    linux_arm64) echo ae4b1aec3481751fb50980b8074773bcc64e2ce388eb150fa10336ad808a62f3 ;;
  esac
}

cd "$(dirname "$0")/.."
root=.silo
os=$(uname -s | tr '[:upper:]' '[:lower:]')
case "$(uname -m)" in
  x86_64 | amd64) arch=amd64 ;;
  arm64 | aarch64) arch=arm64 ;;
  *) echo "Unsupported CPU: $(uname -m)" >&2 && exit 1 ;;
esac
platform="${os}_${arch}"
expected=$(sha256_for "$platform")
[ -n "$expected" ] || { echo "No Silo build for $platform" >&2; exit 1; }

bin="$root/$SILO_VERSION/silo"
if [ ! -x "$bin" ]; then
  archive="silo_${SILO_VERSION}_${platform}.tar.gz"
  mkdir -p "$root/$SILO_VERSION"
  curl -fsSL -o "$root/$archive" \
    "https://github.com/pgsty/silo/releases/download/$SILO_RELEASE/$archive"
  actual=$( (sha256sum "$root/$archive" 2>/dev/null || shasum -a 256 "$root/$archive") | cut -d' ' -f1)
  if [ "$actual" != "$expected" ]; then
    rm -f "$root/$archive"
    echo "Checksum mismatch for $archive" >&2
    exit 1
  fi
  tar -xzf "$root/$archive" -C "$root/$SILO_VERSION" silo
  rm -f "$root/$archive"
fi

mkdir -p "$root/data"
# Silo still reads MinIO's variable names and serves /minio/health/live;
# those are its interface, not a MinIO install.
export MINIO_ROOT_USER=silo-dev MINIO_ROOT_PASSWORD=silo-dev-secret
run=("$bin" server "$root/data" --address 127.0.0.1:9000 --console-address 127.0.0.1:9001)

if [ "${1:-}" = --detach ]; then
  nohup "${run[@]}" > "$root/silo.log" 2>&1 &
  for _ in $(seq 1 30); do
    curl -sf http://127.0.0.1:9000/minio/health/live && exit 0
    sleep 1
  done
  cat "$root/silo.log"
  exit 1
fi
exec "${run[@]}"
