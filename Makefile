#!make

rebuild: stop
	docker-compose build --no-cache

up:
	docker-compose up -d
	@$(MAKE) status

stop:
	docker-compose stop
	@$(MAKE) status

down:
	docker-compose down

restart:
	@$(MAKE) stop
	@$(MAKE) up

status:
	@docker-compose ps

tx:
	@docker-compose run --no-deps --rm tx tx pull -a

console-node:
	@docker-compose run --no-deps --rm node sh
console-tx:
	@docker-compose run --no-deps --rm tx sh
console-php:
	@docker-compose exec php sh
console:
	@$(MAKE) console-node

logs:
	@docker-compose logs --tail=100 -f
logs-db:
	@docker-compose logs --tail=100 -f db
logs-php:
	@docker-compose logs --tail=100 -f php
logs-node:
	@docker-compose logs --tail=100 -f node
logs-nginx:
	@docker-compose logs --tail=100 -f nginx
logs-mail:
	@docker-compose logs --tail=100 -f mail
logs-tx:
	@docker-compose logs --tail=100 -f tx

rl-dev:
	@docker-compose run --no-deps --rm node gulp build
rl-build:
	@docker-compose run --no-deps --rm node gulp all
rl-build-pro:
	@docker-compose run --no-deps --rm node gulp all --pro
