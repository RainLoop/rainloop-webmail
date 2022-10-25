# snappymail-nextcloud

snappymail-nextcloud is a plugin for Nextcloud to use the excellent SnappyMail webmail (https://snappymail.eu/).

Thank you to all contributors to SnappyMail for nextcloud:
- RainLoop Team, who initiated it
- [pierre-alain-b](https://github.com/pierre-alain-b/rainloop-nextcloud)
- Tab Fitts (@tabp0le)
- Nextgen Networks (@nextgen-networks)
- [All testers of issue 96](https://github.com/the-djmaze/snappymail/issues/96)

## How to Install

Start within Nextcloud, and click on the "+ Apps" button in the upper-right corner dropdown menu:

![Image1](https://raw.githubusercontent.com/the-djmaze/snappymail/master/integrations/nextcloud/screenshots/help_a1.png)

Then, enable the SnappyMail plugin that you will find in the "Social & communication" section:

![Image2](https://raw.githubusercontent.com/the-djmaze/snappymail/master/integrations/nextcloud/screenshots/help_a2.png)

After a quick wait, SnappyMail is installed. Now you should configure it before use: open the Nextcloud admin panel (upper-right corner dropdown menu) and go to "Additionnal settings". There, click on the "Go to SnappyMail Webmail admin panel" link.

![Image3](https://raw.githubusercontent.com/the-djmaze/snappymail/master/integrations/nextcloud/screenshots/nextcloud-admin.png)

To enter SnappyMail admin area, the default login is "admin" and the default password will be generated in `[nextcloud-data]/app_snappymail/_data_/_default_/admin_password.txt`. Don't forget to change it once in the admin panel!

From that point, all instance-wide SnappyMail settings can be tweaked as you wish. One important point is the "Domains" section where you should set up the IMAP/SMTP parameters that will be associated with the email adresses of your users. Basically, if a user of the Nextcloud instance starts SnappyMail and puts "firstname@domain.tld" as an email address, then SnappyMail should know how to connect to the IMAP & SMTP of domain.tld. You can fill in this information in the "Domains" section of the SnappyMail admin settings.

![Image4](https://github.com/pierre-alain-b/rainloop-nextcloud/blob/master/screenshots/help_a4.png)

## SnappyMail Settings, Where Are They?

SnappyMail for Nextcloud is highly configurable. But settings are available in multiple places and this can be misleading for first-time users.

### SnappyMail admin settings
SnappyMail admin settings can be reached only by the Nextcloud administrator. Open the Nextcloud admin panel ("Admin" in the upper-right corner dropdown menu) and go to "Additionnal settings". There, click on the "Go to SnappyMail Webmail admin panel" link. Alternatively, you may use the following link: https://path.to.nextcloud/index.php/apps/snappymail/run/?admin.

SnappyMail admin settings include all settings that will apply to all SnappyMail users (default login rules, branding, management of plugins, security rules and domains).

### SnappyMail user settings
Each user of SnappyMail can also change user-specific behaviors in the SnappyMail user settings. SnappyMail user settings are found within SnappyMail by clicking on the user button (in the upper-right corner of SnappyMail) and then choosing "Settings" in the dropdown menu.

SnappyMail user settings include management of contacts, of email accounts, of folders, appearance and OpenPGP.

### The specificity of SnappyMail user accounts
The plugin passes the login information of the user to the SnappyMail app which then creates and manages the user accounts. Accounts in SnappyMail are based soley on the authenticated email accounts, and do not take into account the nextcloud user which created them in the first place. If two or more Nextcloud users have the same email account in additional settings, they will in fact share the same 'email account' in SnappyMail including any additional email accounts that they may have added subsequently to their main account.
This is to be kept in mind for the use case where multiple users shall have the same email account but may be also tempted to add additionnal acounts to their SnappyMail.

## How to auto-connect to SnappyMail?

### Auto-connection for all Nextcloud users
If your Nextcloud users base is synchronized with an email system, then it is possible that Nextcloud credentials could be used right away to access the centralized email system. In the SnappyMail admin settings, the Nextcloud administrator can then tick the "Automatically login with Nextcloud/Nextcloud user credentials" checkbox.

Beware, if you tick this box, all Nextcloud users will *not* be able to use the override it with the setting below.

### Auto-connection for one user at a time
Except if the above setting is activated, any Nextcloud user can have Nextcloud and SnappyMail keep in mind the default email/password to connect to SnappyMail. There, logging in Nextcloud is sufficient to then access SnappyMail within Nextcloud.

To fill in the default email address and password to use, each Nextcloud user should go in the personal settings: choose "Settings" in the upper-right corner dropdown menu. Under "Personal" select the "Additional settings" section where you can find the "SnappyMail Webmail" settings. You can also use this direct link: https://path.to.nextcloud/settings/user/additional.


## How to Activate SnappyMail Logging and then Find Logs

You can activate SnappyMail logging here: `/path/to/nextcloud/data/appdata_snappymail/_data_/_default_/configs/application.ini`
```
[logs]
enable = On
```
Logs are then available in `/path/to/nextcloud/data/appdata_snappymail/_data_/_default_/logs/`
