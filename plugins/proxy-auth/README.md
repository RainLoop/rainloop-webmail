# SnappyMail Proxy Auth

This plugin allows to authenticate a user through the remote user header, effectively allowing single-sign on.
This is achieved through "master user"-like functionality.

## Example Configuration

The exact setup depends on your mailserver, reverse proxy, authentication solution, etc.
The following example is for Traefik with Authelia and Dovecot as mailserver.

### SnappyMail

The following steps are require in SnappyMail:

- To open SnappyMail through a reverse proxy server, make sure to enable the correct secfetch policies: ```mode=navigate,dest=document,site=cross-site,user=true``` in the admin panel -> Config -> Security -> secfetch_allow.
- Activate plugin in admin panel -> Extensions
- Configure the plugin with the required data:
   - Master User Separator is dependent on Dovecot config (see below)
   - Master User is dependent on Dovecot config (see below)
   - Master User Password is dependent on Dovecot config (see below)
   - Header Name is dependent on authentication solution. This is the header containing the name of currently logged in user. In case of Authelia, this is "Remote-User".
   - Check Proxy: Since this plugin partially bypasses authentication, it is important to only allow this access from well-defined hosts. It is highly recommended to activate this option!
   - When checking for reverse proxy, it is required to set the IP filter to either an IP address or a subnet.

This concludes the setup of SnappyMail.

### Dovecot

In Dovecot, you need to enable Master User.
Enable ```!include auth-master.conf.ext``` in /etc/dovecot/conf.d/10-auth.conf.
The file /etc/dovecot/conf.d/auth-master.conf.ext should contain:
```
# Authentication for master users. Included from auth.conf.

# By adding master=yes setting inside a passdb you make the passdb a list
# of "master users", who can log in as anyone else.
# <doc/wiki/Authentication.MasterUsers.txt>

# Example master user passdb using passwd-file. You can use any passdb though.
passdb {
  driver = passwd-file
  master = yes
  args = /etc/dovecot/master-users

  # Unless you're using PAM, you probably still want the destination user to
  # be looked up from passdb that it really exists. pass=yes does that.
  pass = yes
}
```

You then need to create a master user in /etc/dovecot/master-users:
```
admin:PASSWORD
```
where the encrypted password ```PASSWORD``` can be created from a cleartext password with ```doveadm pw -s CRYPT```.
It should start with ```{CRYPT}```.
Username and password need to configured in the SnappyMail ProxyAuth plugin (see above).

Additionally, you need to set the master user separator in /etc/dovecot/conf.d/10-auth.conf, e.g., ```auth_master_user_separator = *```.
The separator needs to be configured in the SnappyMail ProxyAuth plugin (see above).

## Test

Once configured correctly, you should be able to access SnappyMail through your reverse proxy at ```https://snappymail.tld/?ProxyAuth```.
If your reverse proxy provides the username in the configured header (e.g., Remote-User), you will automatically be logged in to your account.
If not, you will be redirected to the login page.
