#!make

rebuild: _down
	docker compose build --no-cache

up: _up status
_up:
	docker compose up -d

stop: _stop status
_stop:
	docker compose stop

down: _down status
_down:
	docker compose down

restart: _stop _up status

status:
	@docker compose ps

tx:
	@docker compose run --no-deps --rm tx tx pull -a -s -f -d

console-node:
	@docker compose run --no-deps --rm node sh
console-tx:
	@docker compose run --no-deps --rm tx sh
console-php:
	@docker compose exec php sh
console: console-node

logs:
	@docker compose logs --tail=100 -f
logs-db:
	@docker compose logs --tail=100 -f db
logs-php:
	@docker compose logs --tail=100 -f php
logs-node:
	@docker compose logs --tail=100 -f node
logs-nginx:
	@docker compose logs --tail=100 -f nginx
logs-mail:
	@docker compose logs --tail=100 -f mail
logs-tx:
	@docker compose logs --tail=100 -f tx

rl-lint:
	@docker compose run --no-deps --rm node gulp lint
rl-dev:
	@docker compose run --no-deps --rm node npm run watch-js
rl-compile:
	@docker compose run --no-deps --rm node gulp build
rl-compile-with-source:
	@docker compose run --no-deps --rm node gulp build --source
rl-watch-css:
	@docker compose run --no-deps --rm node npm run watch-css
rl-watch-js:
	@docker compose run --no-deps --rm node npm run watch-js

rl-build:
	@docker compose run --no-deps --rm node gulp all
rl-build-pro:
	@docker compose run --no-deps --rm node gulp all --pro

yarn-install:
	@docker compose run --no-deps --rm node yarn install
yarn-outdated:
	@docker compose run --no-deps --rm node yarn outdated
yarn-upgrade:
	@docker compose run --no-deps --rm node yarn upgrade-interactive --exact --latest

gpg:
	docker run -it --rm -w=/var/www \
		-v $(shell pwd)/.docker/.cache/.gnupg:/root/.gnupg \
		-v $(shell pwd):/var/www \
		ubuntu:16.04 bash
