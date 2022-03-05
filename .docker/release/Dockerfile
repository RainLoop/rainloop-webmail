# Inspired by the original Rainloop dockerfile from youtous on GitLab
FROM php:7.4-fpm-buster

ARG FILES_ZIP
LABEL org.label-schema.description="SnappyMail webmail client image using nginx, php-fpm based on Debian Buster"

ENV UID=991 GID=991 UPLOAD_MAX_SIZE=25M LOG_TO_STDERR=true MEMORY_LIMIT=128M SECURE_COOKIES=true
ENV fpm.pool.clear_env=false

# Install dependencies such as nginx
RUN mkdir -p /usr/share/man/man1/ /usr/share/man/man3/ /usr/share/man/man7/ && \
    apt-get update -q --fix-missing && \
    apt-get -y upgrade && \
    apt-get install --no-install-recommends -y \
        apt-transport-https gnupg openssl wget curl ca-certificates nginx supervisor sudo \
        unzip libzip-dev libxml2-dev libldb-dev libldap2-dev \
        sqlite3 libsqlite3-dev libsqlite3-0 libpq-dev postgresql-client mariadb-client logrotate \
        zip mlocate libpcre3-dev libicu-dev \
        build-essential chrpath libssl-dev \
        libxft-dev libfreetype6 libfreetype6-dev \
        libpng-dev libjpeg62-turbo-dev \
        libfontconfig1 libfontconfig1-dev \
        && \
    rm -rf /var/lib/apt/lists/*

# Install PHP extensions
RUN php -m && \
    docker-php-ext-configure ldap --with-libdir=lib/x86_64-linux-gnu/ && \
    docker-php-ext-configure intl && \
    docker-php-ext-configure gd --with-freetype --with-jpeg && \
    docker-php-ext-install ldap opcache pdo_mysql pdo_pgsql zip intl gd && \
    php -m

# Install snappymail
WORKDIR /tmp
COPY ${FILES_ZIP} .
RUN mkdir /snappymail && \
    unzip -q ${FILES_ZIP} -d /snappymail && \
    find /snappymail -type d -exec chmod 755 {} \; && \
    find /snappymail -type f -exec chmod 644 {} \; && \
    rm -rf ${FILES_ZIP}

# Install other content
COPY files /
RUN chmod +x /entrypoint.sh && chmod +x /logrotate-loop.sh
VOLUME /snappymail/data
EXPOSE 8888
CMD ["/entrypoint.sh"]
