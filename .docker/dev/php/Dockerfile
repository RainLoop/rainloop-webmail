FROM php:7.4-fpm

RUN apt-get update

RUN apt-get install -y \
	git unzip wget zip curl mlocate \
	libicu-dev libpcre3-dev libicu-dev \
	build-essential chrpath libssl-dev \
	libxft-dev libfreetype6 libfreetype6-dev \
	libpng-dev libjpeg62-turbo-dev \
	libfontconfig1 libfontconfig1-dev libzip-dev libldap2-dev

RUN pecl install xxtea-1.0.11 && \
	docker-php-ext-enable xxtea

RUN docker-php-ext-configure intl && \
    docker-php-ext-configure ldap && \
	docker-php-ext-configure gd --with-freetype=/usr/include/ --with-jpeg=/usr/include/ && \
	docker-php-ext-install opcache pdo_mysql zip intl gd ldap

RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

RUN curl --location --output /usr/local/bin/phpunit https://phar.phpunit.de/phpunit.phar && chmod +x /usr/local/bin/phpunit

RUN apt-get -y autoremove && apt-get clean

RUN sed -i '/^;catch_workers_output/ccatch_workers_output = yes' '/usr/local/etc/php-fpm.d/www.conf'

EXPOSE 9000

CMD ["php-fpm"]
