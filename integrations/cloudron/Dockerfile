FROM cloudron/base:3.0.0@sha256:455c70428723e3a823198c57472785437eb6eab082e79b3ff04ea584faf46e92

RUN mkdir -p /app/code
WORKDIR /app/code

# If you change the extraction below, be sure to test on scaleway
VERSION=2.35.2
RUN wget https://github.com/the-djmaze/snappymail/releases/download/v${VERSION}/snappymail-${VERSION}.zip -O /tmp/snappymail.zip && \
    unzip /tmp/snappymail.zip -d /app/code && \
    rm /tmp/snappymail.zip && \
    find /app/code/snappymail -type d -exec chmod 755 {} \; && \
    find /app/code/snappymail -type f -exec chmod 644 {} \; && \
    rm -rf /app/code/data && ln -s /app/data /app/code/data && \
    chown -R www-data:www-data /app/code/snappymail

# configure apache
RUN rm /etc/apache2/sites-enabled/*
RUN sed -e 's,^ErrorLog.*,ErrorLog "|/bin/cat",' -i /etc/apache2/apache2.conf
COPY apache/mpm_prefork.conf /etc/apache2/mods-available/mpm_prefork.conf

RUN a2disconf other-vhosts-access-log
ADD apache/snappymail.conf /etc/apache2/sites-enabled/snappymail.conf
RUN echo "Listen 8000" > /etc/apache2/ports.conf

# mod_php config
RUN a2enmod rewrite
RUN crudini --set /etc/php/7.4/apache2/php.ini PHP upload_max_filesize 25M && \
    crudini --set /etc/php/7.4/apache2/php.ini PHP post_max_size 25M && \
    crudini --set /etc/php/7.4/apache2/php.ini Session session.save_path /run/snappymail/sessions && \
    crudini --set /etc/php/7.4/apache2/php.ini Session session.gc_probability 1 && \
    crudini --set /etc/php/7.4/apache2/php.ini Session session.gc_divisor 100

RUN ln -s /app/data/php.ini /etc/php/7.4/apache2/conf.d/99-cloudron.ini && \
    ln -s /app/data/php.ini /etc/php/7.4/cli/conf.d/99-cloudron.ini

ADD start.sh /app/code/start.sh

CMD [ "/app/code/start.sh" ]
