#!/bin/sh

# Create not root user
groupadd --gid "$GID" php-cli -f
adduser --uid "$UID" --disabled-password --gid "$GID" --shell /bin/bash --home /home/php-cli php-cli --force --gecos ""


# Set attachment size limit
sed -i "s/<UPLOAD_MAX_SIZE>/$UPLOAD_MAX_SIZE/g" /usr/local/etc/php-fpm.d/php-fpm.conf /etc/nginx/nginx.conf
sed -i "s/<MEMORY_LIMIT>/$MEMORY_LIMIT/g" /usr/local/etc/php-fpm.d/php-fpm.conf

# Set log output to STDERR if wanted (LOG_TO_STDERR=true)
if [ "$LOG_TO_STDERR" = true ]; then
  echo "[INFO] Logging to stderr activated"
  sed -i "s/.*error_log.*$/error_log \/dev\/stderr warn;/" /etc/nginx/nginx.conf
  sed -i "s/.*error_log.*$/php_admin_value[error_log] = \/dev\/stderr/" /usr/local/etc/php-fpm.d/php-fpm.conf
fi

# Secure cookies
if [ "${SECURE_COOKIES}" = true ]; then
    echo "[INFO] Secure cookies activated"
        {
        	echo 'session.cookie_httponly = On';
        	echo 'session.cookie_secure = On';
        	echo 'session.use_only_cookies = On';
        } > /usr/local/etc/php/conf.d/cookies.ini;
fi

# Copy snappymail default config if absent
SNAPPYMAIL_CONFIG_FILE=/snappymail/data/_data_/_default_/configs/application.ini
if [ ! -f "$SNAPPYMAIL_CONFIG_FILE" ]; then
    echo "[INFO] Creating default Snappymail configuration"
    mkdir -p $(dirname $SNAPPYMAIL_CONFIG_FILE)
    cp /usr/local/include/application.ini $SNAPPYMAIL_CONFIG_FILE
fi

# Enable output of snappymail logs
if [ "${LOG_TO_STDERR}" = true ]; then
  sed -z 's/\; Enable logging\nenable = Off/\; Enable logging\nenable = On/' -i $SNAPPYMAIL_CONFIG_FILE
  sed 's/^filename = .*/filename = "errors.log"/' -i $SNAPPYMAIL_CONFIG_FILE
  sed 's/^write_on_error_only = .*/write_on_error_only = Off/' -i $SNAPPYMAIL_CONFIG_FILE
  sed 's/^write_on_php_error_only = .*/write_on_php_error_only = On/' -i $SNAPPYMAIL_CONFIG_FILE
else
    sed -z 's/\; Enable logging\nenable = On/\; Enable logging\nenable = Off/' -i $SNAPPYMAIL_CONFIG_FILE
fi
# Always enable snappymail Auth logging
sed 's/^auth_logging = .*/auth_logging = On/' -i $SNAPPYMAIL_CONFIG_FILE
sed 's/^auth_logging_filename = .*/auth_logging_filename = "auth.log"/' -i $SNAPPYMAIL_CONFIG_FILE
sed 's/^auth_logging_format = .*/auth_logging_format = "[{date:Y-m-d H:i:s}] Auth failed: ip={request:ip} user={imap:login} host={imap:host} port={imap:port}"/' -i $SNAPPYMAIL_CONFIG_FILE
# Redirect snappymail logs to stderr /stdout
mkdir -p /snappymail/data/_data_/_default_/logs/
# empty logs
cp /dev/null /snappymail/data/_data_/_default_/logs/errors.log
cp /dev/null /snappymail/data/_data_/_default_/logs/auth.log
chown -R php-cli:php-cli /snappymail/data/

# Fix permissions
chown -R $UID:$GID /snappymail/data /var/log /var/lib/nginx
chmod o+w /dev/stdout
chmod o+w /dev/stderr


# Touch supervisord PID file in order to fix permissions
touch /run/supervisord.pid
chown php-cli:php-cli /run/supervisord.pid

# RUN !
exec sudo -u php-cli -g php-cli /usr/bin/supervisord -c '/supervisor.conf' --pidfile '/run/supervisord.pid'
