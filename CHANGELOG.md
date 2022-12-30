## 2.24.4 – 2022-12-30

## Added
- Check PHP_INT_SIZE if SnappyMail runs on 64bit

## Changed
- A lot of MessageList sorting improvements
  [#796](https://github.com/the-djmaze/snappymail/pull/796)
- On upgrade also update plugins in Nextcloud due to many misunderstandings and prevent invalid open issues
- Moved application.ini labs.use_app_debug_* to debug.*

## Fixed
- Dutch translation for confusing message (threads vs grouped)
- Workaround Nextcloud disallowed .htaccess
  [#790](https://github.com/the-djmaze/snappymail/pull/790)
- Searching on Nextcloud search failed
  [#787](https://github.com/the-djmaze/snappymail/pull/787)


## 2.24.3 – 2022-12-28

## Changed
- When sorting on FROM also sort on REVERSE DATE

## Fixed
- F5 and Ctrl-F5 reload logs out of Snappymail in Chrome.
  [#800](https://github.com/the-djmaze/snappymail/pull/800)
- Switching accounts does not work anymore with 2.24.2
  [#802](https://github.com/the-djmaze/snappymail/pull/802)


## 2.24.2 – 2022-12-27

### Changed
- Disable sorting when viewing message thread
  [#445](https://github.com/the-djmaze/snappymail/pull/445)
- Update Chinese translation by @mayswind
  [#794](https://github.com/the-djmaze/snappymail/pull/794)
- No need to call IMAP EXAMINE when current folder already SELECT
- Thread view now has tree indentation

### Fixed
- Nextcloud failed on Integrity check
  [#790](https://github.com/the-djmaze/snappymail/pull/790)
- Deleting message fails with message "Cannot move message" on hMailServer
  [#793](https://github.com/the-djmaze/snappymail/pull/793)
- List messages per day feature is enabled by default and breaks sorting
  [#796](https://github.com/the-djmaze/snappymail/pull/796)
- Custom page login not working for first time due to smctoken security
  [#798](https://github.com/the-djmaze/snappymail/pull/798)
- Message list is always empty due to wrong implementation of RFC 8474
  [#799](https://github.com/the-djmaze/snappymail/pull/799)


## 2.24.1 – 2022-12-23

### Changed
- Intl.DateTimeFormat() into toLocaleString() for iOS < 14
- Cleanup locale date/time handling
- Make MessageList per day optional
  [#737](https://github.com/the-djmaze/snappymail/pull/737)

### Fixed
- Typed property MailSo\Cache\Drivers\Redis::$sKeyPrefix must not be accessed before initialization #792
  [#792](https://github.com/the-djmaze/snappymail/pull/792)
- Attachments in mails in 2.24 not loading in reply/forward #789
  [#789](https://github.com/the-djmaze/snappymail/pull/789)
- Rollback #280 due to complications
  [#280](https://github.com/the-djmaze/snappymail/pull/280)


## 2.24.0 – 2022-12-22

### Added
- Option to enable additional account unread messages count
- Prevent godaddy click tracking
- Dark theme use `color-scheme: dark;`
- More imapsync.php CLI options and help

### Changed
- MessageList now grouped/split per day
  [#737](https://github.com/the-djmaze/snappymail/pull/737)
- Account switcher still shown when allow_additional_accounts is set to Off
  [#280](https://github.com/the-djmaze/snappymail/pull/280)
- PHP classes use typed properties
- Speedup Contacts Suggestions handling
- Check SMTP SIZE
  [#779](https://github.com/the-djmaze/snappymail/pull/779)

### Fixed
- Handle multiple DKIM signatures authentication results
- Reload admin extensions on update
- SieveClient quoted string parsing failed
- Invalid Attachments (PDF)
  [#466](https://github.com/the-djmaze/snappymail/pull/466)
- Email HTML images rendering issue
  [#564](https://github.com/the-djmaze/snappymail/pull/564)
- "Server message: No supported SASL mechanism found, remote server wants:" in hMailServer
  [#780](https://github.com/the-djmaze/snappymail/pull/780)

### Removed
- Some unused plugin hooks to improve Action handling speed


## 2.23.1 – 2022-12-15

### Changed
- More JMAP RFC matching including role
- Speedup fetch all Folders/mailboxes
- Disable unused folder_list_limit
- Merge MailSo\Mail\Folder into MailSo\Imap\Folder and speedup process
- SnappyMail\Imap\Sync now matches folders based on JMAP role
- Added the new imapsync.php command line script for
  [#744](https://github.com/the-djmaze/snappymail/pull/744)
- Added manual setting for 12/24h clock
  [#760](https://github.com/the-djmaze/snappymail/pull/760)
- Add options to mark the message I'm viewing as unread and return to the inbox #766

### Fixed
- Extension menu shows only some available extensions #778
- New solution for [#423](https://github.com/the-djmaze/snappymail/pull/423) due to [#774](https://github.com/the-djmaze/snappymail/pull/774)
- Avatars extension error on smartphone
  [#764](https://github.com/the-djmaze/snappymail/pull/764)
- Don't fetch Unread count for main account
- CSS .e-checkbox.material-design invisible on show/hide


## 2.23.0 – 2022-12-08

### Added
- Show the number of unread mails on all mail addresses/accounts
  [#437](https://github.com/the-djmaze/snappymail/pull/437)
- Show OpenSSL version in Admin => About

### Changed
- Redirect to login page instead of "invalid token" popup
  [#752](https://github.com/the-djmaze/snappymail/pull/752)
- Make all dialogs fit in mobile view
- Changed some Plugin hooks for better handling:
	* json.action-pre-call => json.before-{actionname}
	* json.action-post-call => json.after-{actionname}
- Cleaner accounts list in systemdropdown
- Multiple imapConnect handling for new import mail feature
  [#744](https://github.com/the-djmaze/snappymail/pull/744)

### Fixed
- Loosing HTML signature in account identity under settings
  [#750](https://github.com/the-djmaze/snappymail/pull/750)
- Plugin configuration did not load anymore when type was SELECTION by @cm-schl
  [#753](https://github.com/the-djmaze/snappymail/pull/753)
- Nextcloud Default theme shows gray text on gray background
  [#754](https://github.com/the-djmaze/snappymail/pull/754)
- Only run JSON hooks when $sAction is set
  [#755](https://github.com/the-djmaze/snappymail/pull/755)
- Unsupported SASL mechanism OAUTHBEARER
  [#756](https://github.com/the-djmaze/snappymail/pull/756)
  [#758](https://github.com/the-djmaze/snappymail/pull/758)
  [#759](https://github.com/the-djmaze/snappymail/pull/759)
- border-box issue with .buttonCompose

### Removed
- Deprecate \RainLoop\Account->Login() and \RainLoop\Account->Password()


## 2.22.7 – 2022-12-06

### Changed
- Scroll bar with the mobile version in "Advanced search" screen
  [#712](https://github.com/the-djmaze/snappymail/pull/712)

### Fixed
- Undefined property: MailSo\Mail\FolderCollection::$capabilities
- PHP 8.2 Creation of dynamic property is deprecated
- Attempt to solve #745 in v2.22.6 failed and resulted in errors #746 and #748
  [#745](https://github.com/the-djmaze/snappymail/pull/745)
  [#746](https://github.com/the-djmaze/snappymail/pull/746)
  [#748](https://github.com/the-djmaze/snappymail/pull/748)
- Admin domain test undefined matched domain should say email@example matched domain


## 2.22.6 – 2022-12-05

### Changed
- Narrow MessageList wraps star icon
  [#737](https://github.com/the-djmaze/snappymail/pull/737)
- Use UIDVALIDITY when HIGHESTMODSEQ not available, maybe solves
  [#745](https://github.com/the-djmaze/snappymail/pull/745)
- No need to generate 1000's of ID's for MessageListByRequestIndexOrUids()
- Update Chinese translation by @mayswind

### Fixed
- PluginProperty DefaultValue contained array while it should not
  [#741](https://github.com/the-djmaze/snappymail/pull/741)

### Removed
- IMAP SELECT/EXAMINE unset `UNSEEN` because IMAP4rev2 deprecated


## 2.22.5 – 2022-12-02

### Added
- Support plugin minified .min.js and .min.css
- ZIP Download multiple emails
  [#717](https://github.com/the-djmaze/snappymail/pull/717)

### Changed
- Replaced some data-bind="click: function(){} with object functions to prevent eval()
- Improved plugins hash when there are changes

### Fixed
- Settings Themes style due to border-box change
- "Remember me" failed due to v2.22.4 Session token change
  [#719](https://github.com/the-djmaze/snappymail/pull/719)
  [#731](https://github.com/the-djmaze/snappymail/pull/731)

### Removed
- Vacation filter: Button to add recipients (+)
  [#728](https://github.com/the-djmaze/snappymail/pull/728)


## 2.22.4 – 2022-11-28

### Changed
- Contacts dialog layout using flex
- Session token is related to the user agent string
  [#713](https://github.com/the-djmaze/snappymail/pull/713)
- Better browser cache handling for avatars plugin
  [#714](https://github.com/the-djmaze/snappymail/pull/714)
- Force HTML editor when set as default when replying to message
  [#355](https://github.com/the-djmaze/snappymail/pull/355)

### Fixed
- Contact Error - object Object
  [#716](https://github.com/the-djmaze/snappymail/pull/716)
- Unable to move messages to different folder by drag and drop
  [#710](https://github.com/the-djmaze/snappymail/pull/710)
- v2.22.3 unknown error
  [#709https://github.com/the-djmaze/snappymail/pull/709)


## 2.22.3 – 2022-11-25

### Added
- application.ini config logs.path and cache.path to improve custom data structure.

### Changed
- Improved cPanel integration
  [#697](https://github.com/the-djmaze/snappymail/pull/697)
- Update to OpenPGP.js v5.5.0

### Fixed
- drag & drop folder expansion
  [#707](https://github.com/the-djmaze/snappymail/pull/707)
- Save selected messages as .eml in Nextcloud failed
  [#704](https://github.com/the-djmaze/snappymail/pull/704)


## 2.22.2 – 2022-11-24

### Added
- Support cPanel #697


## 2.22.1 – 2022-11-23

### Added
- AddressBookInterface::GetContactByEmail() to support sender image/avatar extension
  [#115](https://github.com/the-djmaze/snappymail/pull/115)

### Changed
- All the attachment zone is not clickable, even if the cursor is a hand
  [#691](https://github.com/the-djmaze/snappymail/pull/691)
- Different approach for "update button duplicated in admin panel"
  [#677](https://github.com/the-djmaze/snappymail/pull/677)
- Better drag & drop solution for leftPanel

### Fixed
- The page does not change after batch deletion
  [#684](https://github.com/the-djmaze/snappymail/pull/684)
- Prevent domain uppercase issues found in
  [#689](https://github.com/the-djmaze/snappymail/pull/689)
- Login invalid response: VXNlcm5hbWU6CG
  [#693](https://github.com/the-djmaze/snappymail/pull/693)


## 2.21.4 – 2022-11-22

### Added
- Added domain matcher test for
  [#689](https://github.com/the-djmaze/snappymail/pull/689)
- Download all Attachments of selected Emails
  [#361](https://github.com/the-djmaze/snappymail/pull/361)

### Changed
- Log current shortcuts scope for
  [#690](https://github.com/the-djmaze/snappymail/pull/690)
- CSS everything to be box-sizing: border-box;
- Make messageview a bit larger so that it is the same height as the messagelist
- Cleanup and rearrange some fontastic glyphs
- Also show From email address by default
  [#683](https://github.com/the-djmaze/snappymail/pull/683)

### Fixed
- Contact.display() returns [object Object]
- When left panel disabled and drag messages, show it
- Issue with admin domain connection type settings selectbox
  [#689](https://github.com/the-djmaze/snappymail/pull/689)
- Mobile View on cellphones: automatic scrolling not working near the visual keyboard
  [#686](https://github.com/the-djmaze/snappymail/pull/686)
- Unable to separate runtime from installation
  [#685](https://github.com/the-djmaze/snappymail/pull/685)

### Removed
- Removed inline parameter of checkbox and select components


## 2.21.3 – 2022-11-16

### Added
- Click on PGP KEY attachment opens "Import key" dialog

### Changed
- Increase visible reading area for small screens
  [#672](https://github.com/the-djmaze/snappymail/pull/672)
- Improved message spam score detailed view
- Improved DAV connection logging

### Fixed
- Handling attachments MIME type / content-type
- Message responsive resizing width/height of elements
  [#678](https://github.com/the-djmaze/snappymail/pull/678)
- Focus on textarea when creating a new plain text email
  [#501](https://github.com/the-djmaze/snappymail/pull/501)
- CardDav remove photos of my contacts when synchronizing
  [#679](https://github.com/the-djmaze/snappymail/pull/679)

### Removed
- \MailSo\Mime\Enumerations\MimeType

### Nextcloud
- Use fontastic in Nextcloud Files selector dialog
- Firefox < 98 dialogs
  [#673](https://github.com/the-djmaze/snappymail/pull/673)

## 2.21.2 – 2022-11-15

### Added
- Allow browser Spellchecker
  [#574](https://github.com/the-djmaze/snappymail/pull/574)
- Decode MIME charset of .EML attachments
  [#662](https://github.com/the-djmaze/snappymail/pull/662)

### Changed
- Increase message visible text area
  [#672](https://github.com/the-djmaze/snappymail/pull/672)
- When copy/paste image use the raw data instead of clipboard HTML
  [#654](https://github.com/the-djmaze/snappymail/pull/654)
- When application.ini debug.enable is true, also debug js and css
- JavaScript rl.setWindowTitle() renamed to rl.setTitle()

### Removed
- Message toggle fullscreen button which was only in mobile view

### Nextcloud
- Workaround Nextcloud calendar crashes
  [#622](https://github.com/the-djmaze/snappymail/pull/622)
  [#661](https://github.com/the-djmaze/snappymail/pull/661)
- Added share public/internal file link
  [#569](https://github.com/the-djmaze/snappymail/pull/569)


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
