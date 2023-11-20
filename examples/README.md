# Examples

Here are some [`docker-compose`] examples.

## `docker-compose.simple.yml`

This runs `snappymail`, using [SQLite](https://www.sqlite.org/index.html) as the database.

Start the stack:

```sh
docker-compose -f docker-compose.simple.yml up
```

Get the Admin Panel password:

```sh
docker exec -it $( docker-compose -f docker-compose.simple.yml ps -q snappymail ) cat /var/lib/snappymail/_data_/_default_/admin_password.txt
```

Now, login to [http://localhost:8888/?admin](http://localhost:8888/?admin) with user `admin` and the admin password.

## `docker-compose.mysql.yml`

This runs `snappymail`, using [MariaDB](https://mariadb.org/) (a fork of [MYSQL](https://www.mysql.com/)) as the database.

Start `snappymail` and `mysql`:

```sh
docker-compose -f docker-compose.mysql.yml up
```

Get the Admin Panel password:

```sh
docker exec -it $( docker-compose -f docker-compose.mysql.yml ps -q snappymail ) cat /var/lib/snappymail/_data_/_default_/admin_password.txt
```

Now, login to [http://localhost:8888/?admin](http://localhost:8888/?admin) with user `admin` and the admin password.

To setup MySQL as the DB, in Admin Panel, click `Contacts`, check `Enable contacts` and , and under `Storage (PDO)` choose the following:

- Type: `MySQL`
- Data Source Name (DSN): `host=mysql;port=3306;dbname=snappymail`
- User `snappymail`
- Password `snappymail`

Click the `Test` button. If it turns green, MySQL is ready to be used for contacts.

To setup Redis for caching, in Admin Panel, click `Config`, update the following configuration options:

- `cache > enable`: yes
- `cache > fast_cache_driver`: `redis`
- `labs > fast_cache_redis_host`: `redis`
- `labs > fast_cache_redis_port`: `6379`

Redis caching is now enabled.

## `docker-compose.postgres.yml`

This runs `snappymail`, using [PostgreSQL](https://hub.docker.com/_/postgres) as the database.

Start `snappymail` and `postgres`:

```sh
docker-compose -f docker-compose.postgres.yml up
```

Get the Admin Panel password:

```sh
docker exec -it $( docker-compose -f docker-compose.postgres.yml ps -q snappymail ) cat /var/lib/snappymail/_data_/_default_/admin_password.txt
```

Now, login to [http://localhost:8888/?admin](http://localhost:8888/?admin) with user `admin` and the admin password.

To use PostgreSQL as the DB, in Admin Panel, click `Contacts`, check `Enable contacts` and , and under `Storage (PDO)` choose the following:

- Type: `PostgresSQL`
- Data Source Name (DSN): `host=postgres;port=5432;dbname=snappymail`
- User `snappymail`
- Password `snappymail`

Click the `Test` button. If it turns green, PostgreSQL is ready to be used for contacts.

To setup Redis for caching, in Admin Panel, click `Config`, update the following configuration options:

- `cache > enable`: yes
- `cache > fast_cache_driver`: `redis`
- `labs > fast_cache_redis_host`: `redis`
- `labs > fast_cache_redis_port`: `6379`

Redis caching is now enabled.

## `docker-compose.traefik.yml`

This runs `snappymail`, using [SQLite](https://www.sqlite.org/index.html) as the database, with `traefik` as the TLS reverse proxy and loadbalancer.

In this example, it is assumed the domain name is `snappymail.example.com`. It is assumed you have an [OVHcloud](https://www.ovh.com/auth/) account to obtain LetsEncrypt TLS certs via `ACME` using DNS challenge for the domain `snappymail.example.com`. If you are using another DNS provider, see [here](https://doc.traefik.io/traefik/https/acme/#providers).

To begin, edit the `OVH_*` environment variables in [`docker-compose.traefik.yml`](docker-compose.traefik.yml) accordingly:

```sh
nano docker-compose.traefik.yml
```

Start `snappymail` and `traefik`:

```sh
docker-compose -f docker-compose.traefik.yml up
```

`traefik` should now begin requesting a TLS cert for `snappymail.example.com`. The process may take a few minutes. If all goes well, https://snappymail.example.com should now be ready.

> You may still visit https://snappymail.example.com while waiting for `traefik` to be issued a TLS certificate. `traefik` simply serves a self-signed TLS cert.

Get the Admin Panel password:

```sh
docker exec -it $( docker-compose -f docker-compose.traefik.yml ps -q snappymail ) cat /var/lib/snappymail/_data_/_default_/admin_password.txt
```

Now, login to [https://snappymail.example.com/?admin](https://snappymail.example.com/?admin) with user `admin` and the admin password.
