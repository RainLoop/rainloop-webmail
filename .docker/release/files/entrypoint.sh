#!/bin/sh
set -eu

DEBUG=${DEBUG:-}
if [ "$DEBUG" = 'true' ]; then
    set -x
fi
UPLOAD_MAX_SIZE=${UPLOAD_MAX_SIZE:-25M}
MEMORY_LIMIT=${MEMORY_LIMIT:-128M}
SECURE_COOKIES=${SECURE_COOKIES:-true}

# Set attachment size limit
sed -i "s/<UPLOAD_MAX_SIZE>/$UPLOAD_MAX_SIZE/g" /usr/local/etc/php-fpm.d/php-fpm.conf /etc/nginx/nginx.conf
sed -i "s/<MEMORY_LIMIT>/$MEMORY_LIMIT/g" /usr/local/etc/php-fpm.d/php-fpm.conf

# Secure cookies
if [ "${SECURE_COOKIES}" = 'true' ]; then
    echo "[INFO] Secure cookies activated"
        {
        	echo 'session.cookie_httponly = On';
        	echo 'session.cookie_secure = On';
        	echo 'session.use_only_cookies = On';
        } > /usr/local/etc/php/conf.d/cookies.ini;
fi

echo "[INFO] Snappymail version: $( ls /snappymail/snappymail/v )"

# Set permissions on snappymail data
echo "[INFO] Setting permissions on /var/lib/snappymail"
chown -R www-data:www-data /var/lib/snappymail/
chmod 550 /var/lib/snappymail/
find /var/lib/snappymail/ -type d -exec chmod 750 {} \;

# Create snappymail default config if absent
SNAPPYMAIL_CONFIG_FILE=/var/lib/snappymail/_data_/_default_/configs/application.ini
if [ ! -f "$SNAPPYMAIL_CONFIG_FILE" ]; then
    echo "[INFO] Creating default Snappymail configuration: $SNAPPYMAIL_CONFIG_FILE"
    # Run snappymail and exit. This populates the snappymail data directory and generates the config file
    # On error, print php exception and exit
    EXITCODE=
    su - www-data -s /bin/sh -c 'php /snappymail/index.php' > /tmp/out || EXITCODE=$?
    if [ -n "$EXITCODE" ]; then
        cat /tmp/out
        exit "$EXITCODE"
    fi
fi

echo "[INFO] Overriding values in snappymail configuration: $SNAPPYMAIL_CONFIG_FILE"
# Enable output of snappymail logs
sed '/^\; Enable logging/{
N
s/enable = Off/enable = On/
}' -i $SNAPPYMAIL_CONFIG_FILE
# Redirect snappymail logs to stderr /stdout
sed 's/^filename = .*/filename = "stderr"/' -i $SNAPPYMAIL_CONFIG_FILE
sed 's/^write_on_error_only = .*/write_on_error_only = Off/' -i $SNAPPYMAIL_CONFIG_FILE
sed 's/^write_on_php_error_only = .*/write_on_php_error_only = On/' -i $SNAPPYMAIL_CONFIG_FILE
# Always enable snappymail Auth logging
sed 's/^auth_logging = .*/auth_logging = On/' -i $SNAPPYMAIL_CONFIG_FILE
sed 's/^auth_logging_filename = .*/auth_logging_filename = "auth.log"/' -i $SNAPPYMAIL_CONFIG_FILE
sed 's/^auth_logging_format = .*/auth_logging_format = "[{date:Y-m-d H:i:s}] Auth failed: ip={request:ip} user={imap:login} host={imap:host} port={imap:port}"/' -i $SNAPPYMAIL_CONFIG_FILE
sed 's/^auth_syslog = .*/auth_syslog = Off/' -i $SNAPPYMAIL_CONFIG_FILE

(
    while ! nc -vz -w 1 127.0.0.1 8888 > /dev/null 2>&1; do echo "[INFO] Checking whether nginx is alive"; sleep 1; done
    while ! nc -vz -w 1 127.0.0.1 9000 > /dev/null 2>&1; do echo "[INFO] Checking whether php-fpm is alive"; sleep 1; done
    # Create snappymail admin password if absent
    SNAPPYMAIL_ADMIN_PASSWORD_FILE=/var/lib/snappymail/_data_/_default_/admin_password.txt
    if [ ! -f "$SNAPPYMAIL_ADMIN_PASSWORD_FILE" ]; then
        echo "[INFO] Creating Snappymail admin password file: $SNAPPYMAIL_ADMIN_PASSWORD_FILE"
        wget -T 1 -qO- 'http://127.0.0.1:8888/?/AdminAppData/0/12345/' > /dev/null
        echo "[INFO] Snappymail Admin Panel ready at http://localhost:8888/?admin. Login using password in $SNAPPYMAIL_ADMIN_PASSWORD_FILE"
    fi

    wget -T 1 -qO- 'http://127.0.0.1:8888/' > /dev/null
    echo "[INFO] Snappymail ready at http://localhost:8888/"
) &

# RUN !
exec /usr/bin/supervisord -c /supervisor.conf --pidfile /run/supervisord.pid
