#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME="${CORTEXPILOT_DOCKER_RUNTIME_IMAGE:-cortexpilot-ci-core:local}"
DESKTOP_NATIVE_IMAGE_NAME="${CORTEXPILOT_DOCKER_DESKTOP_NATIVE_IMAGE:-cortexpilot-ci-desktop-native:local}"
VOLUME_PREFIX="${CORTEXPILOT_DOCKER_VOLUME_PREFIX:-cortexpilot}"

usage() {
  cat <<'EOF'
Usage:
  bash scripts/prune_docker_runtime.sh --dry-run
  bash scripts/prune_docker_runtime.sh --rebuildable
  bash scripts/prune_docker_runtime.sh --aggressive [--include-image] [--include-volumes]

Modes:
  --dry-run         Audit Docker runtime surfaces without deleting anything.
  --rebuildable     Remove stopped repo-image containers only.
  --aggressive      Expand rebuildable cleanup to canonical image and repo-related named volumes.
  --include-image   Only valid with --aggressive; remove the canonical local CI image.
  --include-volumes Only valid with --aggressive; remove repo-related named volumes by prefix.
EOF
}

dry_run=0
mode=""
include_image=0
include_volumes=0
aggressive_requested=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      dry_run=1
      ;;
    --rebuildable)
      mode="rebuildable"
      ;;
    --aggressive)
      mode="aggressive"
      aggressive_requested=1
      ;;
    --include-image)
      include_image=1
      ;;
    --include-volumes)
      include_volumes=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
  shift
done

if [[ -z "$mode" ]]; then
  if (( dry_run == 1 )); then
    mode="dry-run"
  else
    mode="aggressive"
    dry_run=1
  fi
fi

if (( aggressive_requested == 0 )) && (( include_image == 1 || include_volumes == 1 )); then
  echo "--include-image/--include-volumes require --aggressive" >&2
  exit 2
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "[docker-runtime] docker command not found"
  exit 0
fi

if ! docker info >/dev/null 2>&1; then
  echo "[docker-runtime] docker daemon unavailable"
  exit 0
fi

image_line="$(docker images --format '{{.Repository}}:{{.Tag}}\t{{.ID}}\t{{.Size}}' | awk -F'\t' -v image="$IMAGE_NAME" '$1 == image { print $0; exit }')"
desktop_image_line="$(docker images --format '{{.Repository}}:{{.Tag}}\t{{.ID}}\t{{.Size}}' | awk -F'\t' -v image="$DESKTOP_NATIVE_IMAGE_NAME" '$1 == image { print $0; exit }')"
stopped_containers="$(docker ps -aq --filter "ancestor=${IMAGE_NAME}" --filter status=created --filter status=exited --filter status=dead)"
desktop_stopped_containers="$(docker ps -aq --filter "ancestor=${DESKTOP_NATIVE_IMAGE_NAME}" --filter status=created --filter status=exited --filter status=dead)"
volume_candidates="$(docker volume ls --format '{{.Name}}' | awk -v prefix="$VOLUME_PREFIX" 'index($0, prefix) == 1 { print }')"

echo "[docker-runtime] mode=${mode}"
echo "[docker-runtime] dry_run=${dry_run}"
echo "[docker-runtime] image=${IMAGE_NAME}"
if [[ -n "$image_line" ]]; then
  echo "[docker-runtime] canonical-image=${image_line}"
else
  echo "[docker-runtime] canonical-image=missing"
fi
echo "[docker-runtime] desktop-native-image=${DESKTOP_NATIVE_IMAGE_NAME}"
if [[ -n "$desktop_image_line" ]]; then
  echo "[docker-runtime] desktop-native-image-line=${desktop_image_line}"
else
  echo "[docker-runtime] desktop-native-image-line=missing"
fi

echo "[docker-runtime] stopped-containers:"
if [[ -n "$stopped_containers" ]]; then
  printf '%s\n' "$stopped_containers"
else
  echo "(none)"
fi
echo "[docker-runtime] desktop-stopped-containers:"
if [[ -n "$desktop_stopped_containers" ]]; then
  printf '%s\n' "$desktop_stopped_containers"
else
  echo "(none)"
fi

echo "[docker-runtime] repo-related-volumes:"
if [[ -n "$volume_candidates" ]]; then
  printf '%s\n' "$volume_candidates"
else
  echo "(none)"
fi

echo "[docker-runtime] workstation-global docker summary (observation only)"
docker system df

if (( dry_run == 1 )); then
  if [[ -n "$stopped_containers" ]]; then
    echo "[docker-runtime][dry-run] would remove stopped containers for ${IMAGE_NAME}"
  fi
  if [[ -n "$desktop_stopped_containers" ]]; then
    echo "[docker-runtime][dry-run] would remove stopped containers for ${DESKTOP_NATIVE_IMAGE_NAME}"
  fi
  if (( include_image == 1 )) && [[ -n "$image_line" ]]; then
    echo "[docker-runtime][dry-run] would remove image ${IMAGE_NAME}"
  fi
  if (( include_image == 1 )) && [[ -n "$desktop_image_line" ]]; then
    echo "[docker-runtime][dry-run] would remove image ${DESKTOP_NATIVE_IMAGE_NAME}"
  fi
  if (( include_volumes == 1 )) && [[ -n "$volume_candidates" ]]; then
    echo "[docker-runtime][dry-run] would remove repo-related named volumes matching ^${VOLUME_PREFIX}"
  fi
  exit 0
fi

if [[ -n "$stopped_containers" ]]; then
  docker rm -f $stopped_containers
fi
if [[ -n "$desktop_stopped_containers" ]]; then
  docker rm -f $desktop_stopped_containers
fi

if [[ "$mode" == "aggressive" ]] && (( include_image == 1 )) && [[ -n "$image_line" ]]; then
  if docker ps -q --filter "ancestor=${IMAGE_NAME}" | grep -q .; then
    echo "[docker-runtime] skip removing ${IMAGE_NAME}: image backs a running container"
  else
    docker image rm -f "$IMAGE_NAME" || true
  fi
fi
if [[ "$mode" == "aggressive" ]] && (( include_image == 1 )) && [[ -n "$desktop_image_line" ]]; then
  if docker ps -q --filter "ancestor=${DESKTOP_NATIVE_IMAGE_NAME}" | grep -q .; then
    echo "[docker-runtime] skip removing ${DESKTOP_NATIVE_IMAGE_NAME}: image backs a running container"
  else
    docker image rm -f "$DESKTOP_NATIVE_IMAGE_NAME" || true
  fi
fi

if [[ "$mode" == "aggressive" ]] && (( include_volumes == 1 )) && [[ -n "$volume_candidates" ]]; then
  while IFS= read -r volume_name; do
    [[ -n "$volume_name" ]] || continue
    docker volume rm -f "$volume_name" || true
  done <<< "$volume_candidates"
fi

echo "[docker-runtime] completed"
