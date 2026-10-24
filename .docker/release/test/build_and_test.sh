#!/bin/sh
# This script uses docker buildx to build a docker image, and loads it into the docker daemon. Then it executes ./test.sh to test the docker image
# It is useful for testing release builds in development
set -eu
IMAGE=snappymail/snappymail:test
DOCKER_BUILDX=1 docker build -t "$IMAGE" -f .docker/release/Dockerfile .
.docker/release/test/test.sh "$IMAGE"
