# SnappyMail Proxy Auth

This plugin allows to authenticate a user through the remote user header, effectively allowing single-sign on.
This is achieved through "master user"-like functionality.

## Example Configuration

The exact setup depends on your mailserver, reverse proxy, authentication solution, etc.
The following example is for Traefik with Authelia and Dovecot as mailserver.

### SnappyMail

The following steps are require in SnappyMail:

- To open SnappyMail through a reverse proxy server (with redirect of authentication system), make sure to enable the correct secfetch policies: ```mode=navigate,dest=document,site=cross-site,user=true;mode=navigate,dest=document,site=same-site,user=true``` in the admin panel -> Config -> Security -> secfetch_allow.
- Activate plugin in admin panel -> Extensions
- Configure the plugin with the required data:
   - Master User Separator is dependent on Dovecot config (see below)
   - Master User is dependent on Dovecot config (see below)
   - Master User Password is dependent on Dovecot config (see below)
   - Header Name is dependent on authentication solution. This is the header containing the name of currently logged in user. In case of Authelia, this is "Remote-User".
   - Automatic Login: Automatically logs in the user of user header is present (see below)

> **Security note**
>
> This plugin trusts the configured request header as proof of identity. Anyone who can reach the SnappyMail container directly and set that header can log in as any user. You **must** ensure that SnappyMail is only reachable through your reverse proxy / SSO chain (e.g. via the docker network, a firewall, or by binding SnappyMail to a non-public interface) and that the upstream proxy strips any client-supplied value of the header before forwarding. The plugin itself does no source-IP validation — earlier versions had a `check_proxy` option, but it inspected the forwarded client IP (the end user's IP) and therefore did not actually verify that the request came from the proxy. It has been removed; gate access at the network layer instead.

This concludes the setup of SnappyMail.

### Dovecot

In Dovecot, you need to enable Master User.
Enable ```!include auth-master.conf.ext``` in /etc/dovecot/conf.d/10-auth.conf.
In Dovecot 2.3, the file /etc/dovecot/conf.d/auth-master.conf.ext should contain:
```
passdb {
  driver = passwd-file
  master = yes
  args = /etc/dovecot/master-users
  pass = yes
}
```

In Dovecot 2.4, the file /etc/dovecot/conf.d/auth-master.conf.ext should contain:
```
passdb passwd-file {
  master = yes
  passwd_file_path = /etc/dovecot/master-users
  result_success = continue
}
```

You then need to create a master user in /etc/dovecot/master-users:
```
admin:PASSWORD::::::allow_nets=local,172.17.0.0/16
```
where the encrypted password ```PASSWORD``` can be created from a cleartext password with ```doveadm pw -s CRYPT```.
It should start with ```{CRYPT}```.
Username and password need to configured in the SnappyMail ProxyAuth plugin (see above).

You likely also want to limit the access by an IP address filter, e.g., to ```local,172.17.0.0/16```, if you are running Postfix (```local```) and within a default Docker environment (```172.17.0.0/16```).
Otherwise, master user login (assuming password is known) is possible from every connectable system.
This is an unnecessary security risk.

Additionally, you need to set the master user separator in /etc/dovecot/conf.d/10-auth.conf, e.g., ```auth_master_user_separator = *```.
The separator needs to be configured in the SnappyMail ProxyAuth plugin (see above).

## Test

Once configured correctly, you should be able to access SnappyMail through your reverse proxy at ```https://snappymail.tld/?ProxyAuth```.
If your reverse proxy provides the username in the configured header (e.g., Remote-User), you will automatically be logged in to your account.
If not, you will be redirected to the login page.

## Automatic Login

By default, automatic login is activated.
Behind the scenes, this checks for the existence of the configured user header (through ```/?UserHeaderSet```) and automatically redirects to ```https://snappymail.tld/?ProxyAuth```, trying to log in the user.
Note that due to this implementation, logout is impossible, as once logged out, the user will automatically be logged in again.
The user is always considered logged in, as authentication is handled through reverse proxy and authentication system.

Auto login can be disabled in the plugin settings.
You can also change the logout link in admin panel -> Config -> custom_logout_link to the one of your authentication system, e.g., ```https://auth.yourdomain.com/logout```.
In this case, you can log out from your overall system via SnappyMail.

## Troubleshooting

### IMAP `AUTHENTICATIONFAILED` after a container rebuild / upgrade

The master user/password fields are encrypted at rest using SnappyMail's `APP_SALT`. If that salt is regenerated (e.g., the data volume was reset, the container was rebuilt without persisting `_data_`, or the salt file was rotated), the values in `plugin-proxy-auth.json` can no longer be decrypted. `getDecrypted()` then silently returns `null`, an empty password is passed to IMAP, and Dovecot rejects the login with `AUTHENTICATIONFAILED`.

Fix: open admin panel -> Extensions -> Proxy Auth, re-enter the Master User and Master Password (and any other previously-set encrypted fields), and save. The values will be re-encrypted under the current salt.
