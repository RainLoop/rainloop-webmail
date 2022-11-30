## LDAP Mail Accounts Plugin for SnappyMail

### Description
This plugin can be used to add additional mail accounts to SnappyMail when a user logs in successfully. The list of additional accounts is retrieved by a ldap query that can be configured inside the plugin settings.\
On a successful login the username of the SnappyMail user is passed to the plugin and will be searched in the ldap. If additional mail accounts are found, the username and domain-part of those will be used to add the new mail account. The plugin tries to log in the user with the same password used to login to SnappyMail - if this fails SnappyMail asks the user to insert his credentials.

### Configuration
- Install and activate the plugin using the SnappyMail Admin Panel -> menu Extensions.
- Click on the gear symbol beside the plugin to open the configration dialog.
    - Insert the connection data to access your LDAP. Leave username and password empty for an anonymous login.
    - The fields `Object class`, `Base DN`, `Search field` and `LDAP search string` are used to put together a ldap search filter which will return the additional mail accounts of a user:\
    `(&(objectclass=<YOUR OBJECT CLASS>)(<YOUR SEARCH FIELD>=<YOUR SEARCH STRING>))`.\
    This filter will be executed on the `Base DN` you have defined. `LDAP search string` can contain the placeholders `#USERNAME#` (will be replaced with the username the user logged in to Snappymail) and `#BASE_DN#` (will be replaced with the value you inserted into the field `Base DN` inside the plugin settings). This will allow you to create more complex search strings like `uid=#USERNAME#`.
    - `Username field of additional account`, `Domain name field of additional account` and `Additional account name field` are used to define the ldap attributes to read when the ldap search was successful. For example insert `mail` into the `Username field of additional account` and the `Domain name field of additional account` to use the [local-part](https://en.wikipedia.org/wiki/Email_address#Local-part) of the mail address as username and the [domain-part](https://en.wikipedia.org/wiki/Email_address#Domain) as domain for the additional account.\
    `Username field of additional account` and `Domain name field of additional account` before use get checked by the plugin if they contain a mail address and if true only the local-part or domain-part is returned. If no `@` is found the content of the found ldap attribute is returned without modification. This can be usefull if your user should login with something different than the mail address (a username that is diffrent from the local-part of the mail address).

**Important:** keep in mind, that SnappyMail normally needs a mail address as username. In some special circumstances (login with an ldap username, not a mail address) this can mean that you have to configure the plugin to put together a 'fake' mail address like `<LDAP-USERNAME>@<YOUR-DOMAIN>`.
