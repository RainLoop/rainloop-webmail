# syntax=docker/dockerfile:1

FROM alpine:3.15 AS builder
RUN apk add --no-cache php83 php83-json php-phar php-zip
RUN apk add --no-cache npm
RUN npm install -g gulp yarn
WORKDIR /source
COPY package.json yarn.lock ./
RUN yarn install
COPY . .
# Patch release.php with hotfix from: https://github.com/xgbstar1/snappymail-docker/blob/main/Dockerfile, so that release.php doesn't fail with error
RUN sed -i 's_^if.*rename.*snappymail.v.0.0.0.*$_if (!!system("mv snappymail/v/0.0.0 snappymail/v/{$package->version}")) {_' cli/release.php  || true
RUN php release.php
RUN set -eux; \
    VERSION=$( ls build/dist/releases/webmail ); \
    ls -al build/dist/releases/webmail/$VERSION/snappymail-$VERSION.tar.gz; \
    mkdir -p /snappymail; \
    tar -zxvf build/dist/releases/webmail/$VERSION/snappymail-$VERSION.tar.gz -C /snappymail; \
    find /snappymail -type d -exec chmod 550 {} \; ; \
    find /snappymail -type f -exec chmod 440 {} \; ; \
    find /snappymail/data -type d -exec chmod 750 {} \; ; \
    # Remove unneeded files
    rm -v /snappymail/README.md /snappymail/_include.php

# Inspired by the original Rainloop dockerfile from youtous on GitLab
FROM php:8.3-fpm-alpine AS final

LABEL org.label-schema.description="SnappyMail webmail client image using nginx, php-fpm on Alpine"

# Install dependencies such as nginx
RUN apk add --no-cache ca-certificates nginx supervisor bash

# Install PHP extensions
# apcu
RUN set -eux; \
    apk add --no-cache --virtual .build-dependencies $PHPIZE_DEPS; \
    pecl install apcu; \
    docker-php-ext-enable apcu; \
    docker-php-source delete; \
    apk del .build-dependencies;

# gd
RUN set -eux; \
    apk add --no-cache freetype libjpeg-turbo libpng; \
    apk add --no-cache --virtual .deps freetype-dev libjpeg-turbo-dev libpng-dev; \
    docker-php-ext-configure gd --with-freetype --with-jpeg; \
    docker-php-ext-install gd; \
    apk del .deps

# gmagick
# RUN set -eux; \
#     apk add --no-cache graphicsmagick libgomp; \
#     apk add --no-cache --virtual .deps graphicsmagick-dev libtool; \
#     apk add --no-cache --virtual .build-dependencies $PHPIZE_DEPS; \
#     pecl install gmagick-2.0.6RC1; \
#     docker-php-ext-enable gmagick; \
#     docker-php-source delete; \
#     apk del .build-dependencies; \
#     apk del .deps

# gnupg
RUN set -eux; \
    apk add --no-cache gnupg gpgme; \
    apk add --no-cache --virtual .deps gpgme-dev; \
    apk add --no-cache --virtual .build-dependencies $PHPIZE_DEPS; \
    pecl install gnupg; \
    docker-php-ext-enable gnupg; \
    docker-php-source delete; \
    apk del .build-dependencies; \
    apk del .deps

# imagick
RUN set -eux; \
    apk add --no-cache imagemagick libgomp; \
    apk add --no-cache --virtual .deps imagemagick-dev; \
    apk add --no-cache --virtual .build-dependencies $PHPIZE_DEPS; \
    echo | pecl install imagick; \
    docker-php-ext-enable imagick; \
    docker-php-source delete; \
    apk del .build-dependencies; \
    apk del .deps

# intl
RUN set -eux; \
    apk add --no-cache icu-libs; \
    apk add --no-cache --virtual .deps icu-dev; \
    docker-php-ext-configure intl; \
    docker-php-ext-install intl; \
    apk del .deps

# ldap
RUN set -eux; \
    apk add --no-cache libldap; \
    apk add --no-cache --virtual .deps openldap-dev; \
    docker-php-ext-configure ldap; \
    docker-php-ext-install ldap; \
    apk del .deps

# mysql
RUN docker-php-ext-install pdo_mysql

# opcache
RUN docker-php-ext-install opcache

# postgres
RUN set -eux; \
    apk add --no-cache postgresql-libs; \
    apk add --no-cache --virtual .deps postgresql-dev; \
    docker-php-ext-install pdo_pgsql; \
    apk del .deps

# redis
RUN set -eux; \
    apk add --no-cache liblzf zstd-libs; \
    apk add --no-cache --virtual .deps zstd-dev; \
    apk add --no-cache --virtual .build-dependencies $PHPIZE_DEPS; \
    pecl install igbinary; \
    docker-php-ext-enable igbinary; \
    pecl install --configureoptions 'enable-redis-igbinary="yes" enable-redis-lzf="yes" enable-redis-zstd="yes"' redis; \
    docker-php-ext-enable redis; \
    docker-php-source delete; \
    apk del .build-dependencies; \
    apk del .deps

# tidy
RUN set -eux; \
    apk add --no-cache tidyhtml; \
    apk add --no-cache --virtual .deps tidyhtml-dev; \
    docker-php-ext-install tidy; \
    apk del .deps

# uuid
RUN set -eux; \
    apk add --no-cache libuuid; \
    apk add --no-cache --virtual .deps util-linux-dev; \
    apk add --no-cache --virtual .build-dependencies $PHPIZE_DEPS; \
    pecl install uuid; \
    docker-php-ext-enable uuid; \
    docker-php-source delete; \
    apk del .build-dependencies; \
    apk del .deps

# xxtea - Manually install php8 compatible version from https://github.com/xxtea/xxtea-pecl master branch
RUN set -eux; \
    apk add --no-cache --virtual .build-dependencies $PHPIZE_DEPS; \
    wget -q https://github.com/xxtea/xxtea-pecl/tarball/3f5888a29045e12301254151737c5dab4523a1c1 -O xxtea.tar; \
    echo '9cbfd9c27255767deb26ddedf69e738d401d88ac9762d82c8510f9768842ca18  xxtea.tar' | sha256sum -c -; \
    tar -C /usr/src -xvf xxtea.tar; \
    cd /usr/src/xxtea-xxtea-pecl-3f5888a; \
    phpize; \
    ./configure --with-php-config=/usr/local/bin/php-config --enable-xxtea=yes; \
    make install; \
    docker-php-ext-enable xxtea; \
    cd -; \
    rm -fv xxtea.tar; \
    rm -rfv /usr/src/xxtea*; \
    apk del .build-dependencies;

# zip
RUN set -eux; \
    apk add --no-cache libzip; \
    apk add --no-cache --virtual .deps libzip-dev; \
    docker-php-ext-install zip; \
    apk del .deps

# Install snappymail
# The 'www-data' user/group in alpine is 82:82. The 'nginx' user/group in alpine is 101:101, and is part of www-data group
COPY --chown=www-data:www-data --from=builder /snappymail /snappymail
# Use a custom snappymail data folder
RUN mv -v /snappymail/data /var/lib/snappymail;
# Setup configs
COPY --chown=root:root .docker/release/files /
RUN set -eux; \
    chown www-data:www-data /snappymail/include.php; \
    chmod 440 /snappymail/include.php; \
    chmod +x /entrypoint.sh; \
    # Disable the built-in php-fpm configs, since we're using our own config
    mv -v /usr/local/etc/php-fpm.d/docker.conf /usr/local/etc/php-fpm.d/docker.conf.disabled; \
    mv -v /usr/local/etc/php-fpm.d/www.conf /usr/local/etc/php-fpm.d/www.conf.disabled; \
    mv -v /usr/local/etc/php-fpm.d/zz-docker.conf /usr/local/etc/php-fpm.d/zz-docker.conf.disabled;

USER root
WORKDIR /snappymail
VOLUME /var/lib/snappymail
EXPOSE 8888
EXPOSE 9000
ENTRYPOINT []
CMD ["/entrypoint.sh"]
