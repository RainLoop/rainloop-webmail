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
