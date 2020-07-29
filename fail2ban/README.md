# Fail2ban Instructions

This modified version of RainLoop logs to the system (when syslog works in PHP).

If you use other ports then http, https & 2096, modify them in /filter.d/*.conf

## Systemd journal PHP-FPM

Upload the following to /etc/fail2ban/*

- /filter.d/rainloop-fpm-journal.conf
- /jail.d/rainloop-fpm-journal.conf

Modify your /etc/fail2ban/jail.local with:

<code>[rainloop-fpm-journal]<br/>
enabled = true</code>

## Default log (not recommended)

Modify /PATH-TO-RAINLOOP-DATA/_data_/_default_/configs/application.ini

<code>[logs]<br/>
auth_logging = On<br/>
auth_logging_filename = "fail2ban/auth-fail.log"<br/>
auth_logging_format = "[{date:Y-m-d H:i:s T}] Auth failed: ip={request:ip} user={imap:login} host={imap:host} port={imap:port}"
</code>

Modify the path in /jail.d/rainloop-log.conf

Upload the following to /etc/fail2ban/*

- /filter.d/rainloop-log.conf
- /jail.d/rainloop-log.conf

Modify your /etc/fail2ban/jail.local with:

<code>[rainloop-log]<br/>
enabled = true</code>
