#!/bin/sh
# This script tests a given docker image using https://github.com/GoogleContainerTools/container-structure-test
set -eu
SCRIPT_DIR=$( cd "$(dirname "$0")" && pwd )
IMAGE=${1:-}
echo "Testing image: $IMAGE"
docker run --rm -i \
    -v /var/run/docker.sock:/var/run/docker.sock:ro \
    -v "$SCRIPT_DIR/config.yaml:/config.yaml:ro" \
    gcr.io/gcp-runtimes/container-structure-test:latest test --image "$IMAGE" --config config.yaml
