## LDAP Mail Accounts Plugin for SnappyMail

### Description
This plugin can be used to add additional mail accounts to SnappyMail when a user logs in successfully. The list of additional accounts is retrieved by a ldap query that can be configured inside the plugin settings.\
On a successful login the username of the SnappyMail user is passed to the plugin and will be searched in the ldap. If additional mail accounts are found, the username and domain-part of those will be used to add the new mail account. The plugin tries to log in the user with the same password used to login to SnappyMail - if this fails SnappyMail asks the user to insert his credentials.

Version 2.0.0 changes the way additional mail accounts get their e-mail address: the mail address connected with additional mail accounts is now always the address found inside the ldap.
Now it is also possible to overwrite the mail address of the main account: if a user logs into SnappyMail with a username and SnappyMail added the configured default domain the mail address of the main account could have been some not existing address like "username@default-domain.com". This could have happend when using the Nextcloud SnappyMail integration that offers an automatic login using the Nextcloud username.
The plugin now can be configured to overwrite the username or mail address used at login with a mail address found inside ldap.

Version 2.2.0 adds compatibility with SnappyMail 2.36.1 and later where some changes were introduced that made the plugin unusable. This version also adds the possibility to delete the .cryptkey file on evere login. For more information see the `Configuration` section below.

### Configuration
- Install and activate the plugin using the SnappyMail Admin Panel -> menu Extensions.
- Click on the gear symbol beside the plugin to open the configration dialog.
    - Insert the connection data to access your LDAP. Leave username and password empty for an anonymous login.
    - The fields `Object class`, `Base DN`, `Search field` and `LDAP search string` are used to put together a ldap search filter which will return the additional mail accounts of a user:\
    `(&(objectclass=<YOUR OBJECT CLASS>)(<YOUR SEARCH FIELD>=<YOUR SEARCH STRING>))`.\
    This filter will be executed on the `Base DN` you have defined. `LDAP search string` can contain the placeholders `#USERNAME#` (will be replaced with the username the user logged in to Snappymail) and `#BASE_DN#` (will be replaced with the value you inserted into the field `Base DN` inside the plugin settings). This will allow you to create more complex search strings like `uid=#USERNAME#`.
    - `Username field`, `Domain name field of additional account`, `Mail address field for additional account` and `Additional account name field` are used to define the ldap attributes to read when the ldap search was successful. For example insert `mail` into the `Username field` and the `Domain name field of additional account` to use the [local-part](https://en.wikipedia.org/wiki/Email_address#Local-part) of the mail address as username and the [domain-part](https://en.wikipedia.org/wiki/Email_address#Domain) as domain for the additional account.\
    `Username field` and `Domain name field of additional account` before use get checked by the plugin if they contain a mail address and if true only the local-part or domain-part is returned. If no `@` is found the content of the found ldap attribute is returned without modification. This can be usefull if your user should login with something different than the mail address (a username that is diffrent from the local-part of the mail address).

    Section `Overwrite mail address of main account` can be used to overwrite the username or mail address used at login with a value found in ldap. If activated, the username or mail address used at login will be looked up inside the `Username field` in ldap (for details see how a search for additional accounts is made). If the username is found, the value of the field `Mail address field for main account` will be used to overwrite the mail address of the main account.

    `Overwrite user cryptkey` can be activated to prevent SnappyMail from asking the user for his old LDAP password when this password was changed or reseted. SnappyMail saves the passwords of the additional accounts by encrypting them using a cryptkey that is saved in the file `.cryptkey`. When the password of the main account changes, SnappyMail asks the user for the old password to reencrypt the keys with the new userpassword.
	On a password change using ldap (or when the password has been forgotten by the user) this makes problems and asks the user to insert the old password. Therefore activating this option overwrites the .cryptkey file on login in order to always accept the actual ldap password of the user.
	**ATTENTION:** This has side effects on pgp keys because these are also secured by the cryptkey and could therefore not be accessible anymore! See https://github.com/the-djmaze/snappymail/issues/1570#issuecomment-2085528061 . This has also an impact on additional mail accounts that aren't created by this plugin because without the cryptkey saved passwords of additional mail accounts can not be decrypted anymore.

**Important:** SnappyMail normally needs a mail address as username. This plugin handles some special circumstances (login with an ldap username, not a mail address) so that you can login to your IMAP server with the ldap username but send mails with a mail address connected to this ldap user.
