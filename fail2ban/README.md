# Fail2ban Instructions

This modified version of RainLoop logs to the system (when syslog works in PHP).

If you use other ports then http, https & 2096, modify them in /jail.d/*.conf

## Systemd journal PHP-FPM

Upload the following to /etc/fail2ban/*

- /filter.d/snappymail-fpm-journal.conf
- /jail.d/snappymail-fpm-journal.conf

Modify your /etc/fail2ban/jail.local with:

```
[snappymail-fpm-journal]
enabled = true
```

## Default log (not recommended)

Modify `/PATH-TO-RAINLOOP-DATA/_data_/_default_/configs/application.ini`

```
[logs]
auth_logging = On
auth_logging_filename = "fail2ban/auth-fail.log"
auth_logging_format = "[{date:Y-m-d H:i:s T}] Auth failed: ip={request:ip} user={imap:login} host={imap:host} port={imap:port}"
```

Modify the path in /jail.d/snappymail-log.conf

Upload the following to /etc/fail2ban/*

- /filter.d/snappymail-log.conf
- /jail.d/snappymail-log.conf

Modify your /etc/fail2ban/jail.local with:

```
[snappymail-log]
enabled = true
```
