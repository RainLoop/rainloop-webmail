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

console-node:
	@docker-compose run --no-deps --rm node sh
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

rl-build:
	@docker-compose run --no-deps --rm node gulp all
rl-build-pro:
	@docker-compose run --no-deps --rm node gulp all --pro
