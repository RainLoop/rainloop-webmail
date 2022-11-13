## 2.21.1 – 2022-11-13

### Fixed
- Crypt crashes when Sodium not installed
  [#641](https://github.com/the-djmaze/snappymail/pull/641)
  [#657](https://github.com/the-djmaze/snappymail/pull/657)
  [#663](https://github.com/the-djmaze/snappymail/pull/663)
  [#664](https://github.com/the-djmaze/snappymail/pull/664)
  [#668](https://github.com/the-djmaze/snappymail/pull/668)
  [#669](https://github.com/the-djmaze/snappymail/pull/669)
- Personalised favicon not working - default Snappymail favicon showing
  [#665](https://github.com/the-djmaze/snappymail/pull/665)

### Nextcloud
- v23 ContentSecurityPolicy versions issue
  [#666](https://github.com/the-djmaze/snappymail/pull/666)


## 2.21.0 – 2022-11-11

### Added
- Put messagelist top bar buttons also in dropdown
- Allow setting additional Sec-Fetch rules, as discussed by
  [#585](https://github.com/the-djmaze/snappymail/pull/585)
- Light/Dark favicon.svg
  [#643](https://github.com/the-djmaze/snappymail/pull/643)
- Allow an account name/label
  [#571](https://github.com/the-djmaze/snappymail/pull/571)

### Changed
- Moved ServiceRemoteAutoLogin to plugin/extension
- Moved ServiceExternalSso to plugin/extension
- Moved ServiceExternalLogin to plugin/extension
- Renamed ManageSieveClient to SieveClient
- New Net/Imap/Smtp/Sieve Settings object system which allows
  setting SSL options per domain and verify_certificate by default
- Update plugins to use new Net/Imap/Smtp/Sieve Settings object
- Removed message double-click to full screen
  [#638](https://github.com/the-djmaze/snappymail/pull/638)

### Fixed
- ldap-identities-plugin by @cm-schl
  [#647](https://github.com/the-djmaze/snappymail/pull/647)
- OpenSSL v3 ciphers issue
  [#641](https://github.com/the-djmaze/snappymail/pull/641)

### Nextcloud
- Style PopupsNextcloudFiles view
- Link to internal files in composer


## 2.20.6 – 2022-11-08

### Fixed
- ?admin login failed
  [#642](https://github.com/the-djmaze/snappymail/pull/642)
- Resolve PHP 8.2 Creation of dynamic property is deprecated


## 2.20.5 – 2022-11-08

### Nextcloud
- Improved workaround for Nextcloud Content-Security-Policy bug
  Safari [#631](https://github.com/the-djmaze/snappymail/issues/631)
  Edge [#633](https://github.com/the-djmaze/snappymail/issues/633)
  Reported [#35013](https://github.com/nextcloud/server/issues/35013)


## 2.20.4 – 2022-11-07

### Fixed
- Nextcloud no-embed use iframe mode failed

### Nextcloud
- Workaround Nextcloud Content-Security-Policy bug
  Safari [#631](https://github.com/the-djmaze/snappymail/issues/631)
  Edge [#633](https://github.com/the-djmaze/snappymail/issues/633)
  Reported [#35013](https://github.com/nextcloud/server/issues/35013)


## 2.20.3 – 2022-11-07

### Added
- Throw decrypt errors
  [#632](https://github.com/the-djmaze/snappymail/issues/632)

### Changed
- Better multiple WYSIWYG registration system (not finished)
- Better handling of admin token cookie

### Fixed
- Cookie “name” has been rejected because it is already expired.
  [#636](https://github.com/the-djmaze/snappymail/issues/636)
- Content-Security-Policy 'strict-dynamic' was missing

### Nextcloud
- Better handling of Content-Security-Policy
  [#631](https://github.com/the-djmaze/snappymail/issues/631)
  [#633](https://github.com/the-djmaze/snappymail/issues/633)
- Nextcloud 23 Error Call to undefined method useStrictDynamic()
  [#634](https://github.com/the-djmaze/snappymail/issues/634)
- Use snappymail icon as favicon-mask.svg instead default nextcloud logo
  [#635](https://github.com/the-djmaze/snappymail/issues/635)


## 2.20.2 – 2022-11-05

### Added
- Add more search operators (i.e. copy lots of Gmail ones)
  [#625](https://github.com/the-djmaze/snappymail/issues/625)

### Changed
- Some CSS borders to var(--border-color)

### Fixed
- pgpDecrypt() using MailVelope the decrypt message was not green
- Shift + F in search bar resulted in forwarding message
  [#624](https://github.com/the-djmaze/snappymail/issues/624)

### Nextcloud
- auto login mechanism not working anymore
  [#627](https://github.com/the-djmaze/snappymail/issues/627)


## 2.20.1 – 2022-11-04

### Added
- Added CSS --dialog-border-clr and --dialog-border-radius
- Show lock (lock) glyph in messagelist for encrypted messages

### Fixed
- Decrypt failed when OpenPGP.js not loaded

### Nextcloud
- Now integrate with Nextcloud by default, but keep iframe option available
- Better theme integration with Nextcloud
- Use Nextcloud 18+ IEventDispatcher
- Solve Nextcloud 25 CSS issues
  [#620](https://github.com/the-djmaze/snappymail/issues/620)
- PutinICS does is not working for all calendar events
  [#622](https://github.com/the-djmaze/snappymail/issues/622)
- Update readme by @cm-schl
  [#617](https://github.com/the-djmaze/snappymail/issues/617)


## 2.20.0 – 2022-11-03

### Added
- Strip mailchimp tracking

### Changed
- Use some PHP typed properties
- Move bootstrap @less variables to CSS var()
- Improved theme styling

### Fixed
- CSS --dropdown-menu-background-color should be --dropdown-menu-bg-color

### Nextcloud
- Disable Nextcloud Impersonate check due to login/logout complications
  [#561](https://github.com/the-djmaze/snappymail/issues/561)
- Improved theme integration and be compatible with Breeze Dark


## 2.19.7 – 2022-11-02

### Added
- Make it clear that you are on the admin panel login screen
- Force PHP opcache_invalidate due to upgrade error reports "Missing version directory"

### Fixed
- Switching user (impersonate plugin) keeps old Email logged in
  [#561](https://github.com/the-djmaze/snappymail/issues/561)
- PGP Decryption / Encryption Failures
  [#600](https://github.com/the-djmaze/snappymail/issues/600)
- Undefined constant "OCA\SnappyMail\Util\RAINLOOP_APP_LIBRARIES_PATH
  [#601](https://github.com/the-djmaze/snappymail/issues/601)
- Cannot access admin panel
  [#602](https://github.com/the-djmaze/snappymail/issues/602)
- Wont show my emails
  [#604](https://github.com/the-djmaze/snappymail/issues/604)
- Return type of MailSo\Base\StreamFilters\LineEndings::filter
  [#610](https://github.com/the-djmaze/snappymail/issues/610)
- Create .pgp directory was missing

### Security
- Logger leaked some passwords

## 2.19.6 – 2022-10-31

### Added
- Put sign and encrypt options in composer dropdown menu and simplify te two existing buttons with a glyph
- Filter scripts UI let user understand which filter is active
  [#590](https://github.com/the-djmaze/snappymail/issues/590)

### Fixed
- Method 'GetRequest' not found in \MailSo\Base\Http
  [#585](https://github.com/the-djmaze/snappymail/issues/585)

### Changed
- Base Domain setup enhancements
- Cleanup MailSo MailClient using __call()
- Domain settings handling and store as JSON instead of ini
- Some JavaScript changes
- When try to login IMAP/SMTP/SIEVE but STARTTLS is required, force STARTTLS
- Embed admin panel into Nextcloud (with autologin, no need for separate login)
- Don't set default_domain in Nextcloud when already set

### Removed
- Nextcloud dark mode, it is incomplete

### Deprecated
- nothing
## 2.21.0 – 2022-11-11

### Added
- Put messagelist top bar buttons also in dropdown
- Allow setting additional Sec-Fetch rules, as discussed by #585
- Light/Dark favicon.svg #643
- Allow an account name/label #571

### Changed
- Moved ServiceRemoteAutoLogin to plugin/extension
- Moved ServiceExternalSso to plugin/extension
- Moved ServiceExternalLogin to plugin/extension
- Renamed ManageSieveClient to SieveClient
- New Net/Imap/Smtp/Sieve Settings object system which allows
  setting SSL options per domain and verify_certificate by default
- Update plugins to use new Net/Imap/Smtp/Sieve Settings object
- Removed message double-click to full screen #638

### Fixed
- ldap-identities-plugin by @cm-schl
  [#647](https://github.com/the-djmaze/snappymail/pull/647)
- OpenSSL v3 ciphers issue #641

### Nextcloud
- Style PopupsNextcloudFiles view
- Link to internal files in composer


## 2.20.6 – 2022-11-08

### Fixed
- ?admin login failed
  [#642](https://github.com/the-djmaze/snappymail/pull/642)
- Resolve PHP 8.2 Creation of dynamic property is deprecated


## 2.20.5 – 2022-11-08

### Nextcloud
- Improved workaround for Nextcloud Content-Security-Policy bug
  Safari [#631](https://github.com/the-djmaze/snappymail/issues/631)
  Edge [#633](https://github.com/the-djmaze/snappymail/issues/633)
  Reported [#35013](https://github.com/nextcloud/server/issues/35013)


## 2.20.4 – 2022-11-07

### Fixed
- Nextcloud no-embed use iframe mode failed

### Nextcloud
- Workaround Nextcloud Content-Security-Policy bug
  Safari [#631](https://github.com/the-djmaze/snappymail/issues/631)
  Edge [#633](https://github.com/the-djmaze/snappymail/issues/633)
  Reported [#35013](https://github.com/nextcloud/server/issues/35013)


## 2.20.3 – 2022-11-07

### Added
- Throw decrypt errors
  [#632](https://github.com/the-djmaze/snappymail/issues/632)

### Changed
- Better multiple WYSIWYG registration system (not finished)
- Better handling of admin token cookie

### Fixed
- Cookie “name” has been rejected because it is already expired.
  [#636](https://github.com/the-djmaze/snappymail/issues/636)
- Content-Security-Policy 'strict-dynamic' was missing

### Nextcloud
- Better handling of Content-Security-Policy
  [#631](https://github.com/the-djmaze/snappymail/issues/631)
  [#633](https://github.com/the-djmaze/snappymail/issues/633)
- Nextcloud 23 Error Call to undefined method useStrictDynamic()
  [#634](https://github.com/the-djmaze/snappymail/issues/634)
- Use snappymail icon as favicon-mask.svg instead default nextcloud logo
  [#635](https://github.com/the-djmaze/snappymail/issues/635)


## 2.20.2 – 2022-11-05

### Added
- Add more search operators (i.e. copy lots of Gmail ones)
  [#625](https://github.com/the-djmaze/snappymail/issues/625)

### Changed
- Some CSS borders to var(--border-color)

### Fixed
- pgpDecrypt() using MailVelope the decrypt message was not green
- Shift + F in search bar resulted in forwarding message
  [#624](https://github.com/the-djmaze/snappymail/issues/624)

### Nextcloud
- auto login mechanism not working anymore
  [#627](https://github.com/the-djmaze/snappymail/issues/627)


## 2.20.1 – 2022-11-04

### Added
- Added CSS --dialog-border-clr and --dialog-border-radius
- Show lock (lock) glyph in messagelist for encrypted messages

### Fixed
- Decrypt failed when OpenPGP.js not loaded

### Nextcloud
- Now integrate with Nextcloud by default, but keep iframe option available
- Better theme integration with Nextcloud
- Use Nextcloud 18+ IEventDispatcher
- Solve Nextcloud 25 CSS issues
  [#620](https://github.com/the-djmaze/snappymail/issues/620)
- PutinICS does is not working for all calendar events
  [#622](https://github.com/the-djmaze/snappymail/issues/622)
- Update readme by @cm-schl
  [#617](https://github.com/the-djmaze/snappymail/issues/617)


## 2.20.0 – 2022-11-03

### Added
- Strip mailchimp tracking

### Changed
- Use some PHP typed properties
- Move bootstrap @less variables to CSS var()
- Improved theme styling

### Fixed
- CSS --dropdown-menu-background-color should be --dropdown-menu-bg-color

### Nextcloud
- Disable Nextcloud Impersonate check due to login/logout complications
  [#561](https://github.com/the-djmaze/snappymail/issues/561)
- Improved theme integration and be compatible with Breeze Dark


## 2.19.7 – 2022-11-02

### Added
- Make it clear that you are on the admin panel login screen
- Force PHP opcache_invalidate due to upgrade error reports "Missing version directory"

### Fixed
- Switching user (impersonate plugin) keeps old Email logged in
  [#561](https://github.com/the-djmaze/snappymail/issues/561)
- PGP Decryption / Encryption Failures
  [#600](https://github.com/the-djmaze/snappymail/issues/600)
- Undefined constant "OCA\SnappyMail\Util\RAINLOOP_APP_LIBRARIES_PATH
  [#601](https://github.com/the-djmaze/snappymail/issues/601)
- Cannot access admin panel
  [#602](https://github.com/the-djmaze/snappymail/issues/602)
- Wont show my emails
  [#604](https://github.com/the-djmaze/snappymail/issues/604)
- Return type of MailSo\Base\StreamFilters\LineEndings::filter
  [#610](https://github.com/the-djmaze/snappymail/issues/610)
- Create .pgp directory was missing

### Security
- Logger leaked some passwords

## 2.19.6 – 2022-10-31

### Added
- Put sign and encrypt options in composer dropdown menu and simplify te two existing buttons with a glyph
- Filter scripts UI let user understand which filter is active
  [#590](https://github.com/the-djmaze/snappymail/issues/590)

### Fixed
- Method 'GetRequest' not found in \MailSo\Base\Http
  [#585](https://github.com/the-djmaze/snappymail/issues/585)

### Changed
- Base Domain setup enhancements
- Cleanup MailSo MailClient using __call()
- Domain settings handling and store as JSON instead of ini
- Some JavaScript changes
- When try to login IMAP/SMTP/SIEVE but STARTTLS is required, force STARTTLS
- Embed admin panel into Nextcloud (with autologin, no need for separate login)
- Don't set default_domain in Nextcloud when already set

### Removed
- Nextcloud dark mode, it is incomplete

### Deprecated
- nothing
