## 2.29.2 – 2023-10-02

## Added
- Show size of folders in folders list #1303
  [#1303](https://github.com/the-djmaze/snappymail/issues/1303)

## Fixed
- Configuration failed when using special chars in MySQL password #1308
  [#1308](https://github.com/the-djmaze/snappymail/issues/1308)
- With email open, "delete" doesn't delete #1274
  [#1274](https://github.com/the-djmaze/snappymail/issues/1274)
- Fix threading view in Thunderbird (others?) by @tkasch
  [#1304](https://github.com/the-djmaze/snappymail/pull/1304)


## 2.29.1 – 2023-10-02

## Fixed
- Some small messages list bugs


## 2.29.0 – 2023-10-02

## Added
- Modern UI / Nextcloud Theme
  [#629](https://github.com/the-djmaze/snappymail/pull/629) by @hampoelz
- "Add/Edit signature" label to PopupsIdentity.html by @SergeyMosin
  [#1248](https://github.com/the-djmaze/snappymail/pull/1248)
- use calendar icon in message list for messages with '.ics' or 'text/calendar' attachments by @SergeyMosin
  [#1248](https://github.com/the-djmaze/snappymail/pull/1248)
- Show unseen message count when the message list is threaded by @SergeyMosin
  [#1248](https://github.com/the-djmaze/snappymail/pull/1248)
- in mobile mode hide folders(left) panel when a folder is clicked by @SergeyMosin
  [#1248](https://github.com/the-djmaze/snappymail/pull/1248)
- spellcheck the subject when 'allowSpellcheck' setting is true by @SergeyMosin
  [#1248](https://github.com/the-djmaze/snappymail/pull/1248)
- 'collapse_blockquotes', 'allow_spellcheck' and 'mail_list_grouped' to admin settings ('defaults' section) by @SergeyMosin
  [#1248](https://github.com/the-djmaze/snappymail/pull/1248)
- Browser support for autocompleting TOTP code
  [#1251](https://github.com/the-djmaze/snappymail/issues/1251)

## Changed
- URL strip tracking for
  [#1225](https://github.com/the-djmaze/snappymail/issues/1225)
- Color picker use color blind palette "Tableau 10" by Maureen Stone by default
  [#1199](https://github.com/the-djmaze/snappymail/issues/1199)
- Draft code to improve mobile breakpoints
  [#1150](https://github.com/the-djmaze/snappymail/issues/1150)
- address input: space character can trigger '_parseValue' if the email address looks complete by @SergeyMosin
  [#1248](https://github.com/the-djmaze/snappymail/pull/1248)
- if applicable set '\\answered' or '$forwarded' flag after a message is sent so the proper icon is shown in the message list view by @SergeyMosin
  [#1248](https://github.com/the-djmaze/snappymail/pull/1248)

## Fixed
- CHARSET is not valid in UTF8 mode
  [#1230](https://github.com/the-djmaze/snappymail/issues/1230)
- Spam score is always "acceptable"
  [#1228](https://github.com/the-djmaze/snappymail/issues/1228)
- Undefined constant PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT
  [#1205](https://github.com/the-djmaze/snappymail/issues/1205)
- Fetch controller.abort(reason) handling
  [#1220](https://github.com/the-djmaze/snappymail/issues/1220)
- "Request failed" on message move
  [#1220](https://github.com/the-djmaze/snappymail/issues/1220)
- Unwrapped text nodes attached to squire._root by @SergeyMosin
  [#1234](https://github.com/the-djmaze/snappymail/pull/1234)
- Extra wrapper div is added in Squire every time a Draft is open (or closed) after save.
  [#1208](https://github.com/the-djmaze/snappymail/issues/1208)
- foreach() argument must be of type array|object
  [#1237](https://github.com/the-djmaze/snappymail/issues/1237)
- `<font>` tag 'style' is lost in replies by @SergeyMosin
  [#1248](https://github.com/the-djmaze/snappymail/pull/1248)
- unseen indicator is not shown in thread view when 'listGrouped' settings is false by @SergeyMosin
  [#1248](https://github.com/the-djmaze/snappymail/pull/1248)
- TOTP plugin is dependent on ctype
  [#1250](https://github.com/the-djmaze/snappymail/issues/1250)

## Nextcloud
- iFrame mode: click on unified search result opens inner iFrame by @SergeyMosin
  [#1248](https://github.com/the-djmaze/snappymail/pull/1248)
- set 'smremember' cookie if 'sign_me_auto' is set to 'DefaultOn' when using 'snappymail-autologin*', otherwise nextcloud users need to re-login when the browser is re-opened. by @SergeyMosin
  [#1248](https://github.com/the-djmaze/snappymail/pull/1248)
- Improve UX of "Put in Calendar" option in plugin by @theronakpatel
  [#1259](https://github.com/the-djmaze/snappymail/pull/1259)


## 2.28.4 – 2023-07-10

## Added
- application.ini msg_default_action by @SergeyMosin
  [#1204](https://github.com/the-djmaze/snappymail/pull/1204)
- application.ini view_show_next_message by @SergeyMosin
  [#1204](https://github.com/the-djmaze/snappymail/pull/1204)
- application.ini view_images by @SergeyMosin
  [#1204](https://github.com/the-djmaze/snappymail/pull/1204)
- nextcloud add ability to include custom php file in InstallStep migration by @SergeyMosin
  [#1197](https://github.com/the-djmaze/snappymail/pull/1197)
- Support plugin for Squire editor
  [#1192](https://github.com/the-djmaze/snappymail/issues/1192)

## Changed
- only show 'Add "domain.tld" as an application for mailto links?' message after login (firefox shows the message on every reload otherwise).
  [#1204](https://github.com/the-djmaze/snappymail/issues/1204)
- Convert getPdoAccessData() : array to a RainLoop\Pdo\Settings object instance
- New bidi buttons to Squire editor by @rezaei92
  [#1200](https://github.com/the-djmaze/snappymail/pull/1200)

## Fixed
- Undefined constant PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT
  [#1205](https://github.com/the-djmaze/snappymail/issues/1205)
- 'reloadTime' function result is passed into 'setInterval' instead of the function by @SergeyMosin
  [#1204](https://github.com/the-djmaze/snappymail/pull/1204)
- UNKNOWN-CTE Invalid data in MIME part
  [#1186](https://github.com/the-djmaze/snappymail/issues/1186)


## 2.28.3 – 2023-06-22

## Added
- Attachments in "new window" view
  [#1166](https://github.com/the-djmaze/snappymail/issues/1166)

## Changed
- Update Portuguese by @ner00
- Update French by @hguilbert

## Fixed
- Some emails with inline CSS break the UI
  [#1187](https://github.com/the-djmaze/snappymail/issues/1187)
- Remote.get() Promise broken by previous change
  [#1185](https://github.com/the-djmaze/snappymail/issues/1185)
- Class "MailSo\Base\Exceptions\InvalidArgumentException" not found
  [#1182](https://github.com/the-djmaze/snappymail/issues/1182)
- First account not showed in the right list (dropbox)
  [#1180](https://github.com/the-djmaze/snappymail/issues/1180)


## 2.28.2 – 2023-06-19

## Added
- Detailed error for "Cannot access the repository at the moment"
  [#1164](https://github.com/the-djmaze/snappymail/issues/1164)
- Bidi in Squire editor
  [#1158](https://github.com/the-djmaze/snappymail/issues/1158)
- Translate Squire UI
- Nextcloud 27 compatibility by @LarsBel
- JWT class for handling JSON Web Tokens

## Changed
- Update German by @cm-schl
- Update French by @hguilbert
- Update Polish by @tinola
- Merge handling of local Account Settings. Found while investigating
  [#1170](https://github.com/the-djmaze/snappymail/issues/1170)
- Image max-width now 100% instead of 90vw

## Fixed
- Cannot modify header information
  [#929](https://github.com/the-djmaze/snappymail/issues/929) (comment)
- Admin Panel broken when admin_panel_host is set
  [#1169](https://github.com/the-djmaze/snappymail/issues/1169)
- Invalid CSP report-uri
- Prevent MessageList multiple request at the same time
  [#1071](https://github.com/the-djmaze/snappymail/issues/1071)
- Error in Addressbook Sync
  [#1179](https://github.com/the-djmaze/snappymail/issues/1179)
- base64_decode() second parameter must be true


## 2.28.1 – 2023-06-05

## Changed
- Optical issue with input fields for mail and folder search
  [#1149](https://github.com/the-djmaze/snappymail/issues/1149)
- Update Chinese translation by @mayswind
  [#1157](https://github.com/the-djmaze/snappymail/pull/1157)
- Update Polish translation by @tinola
  [#1156](https://github.com/the-djmaze/snappymail/pull/1156)

## Fixed
- Undefined SIG constants
  [#1147](https://github.com/the-djmaze/snappymail/issues/1147)


## 2.28.0 – 2023-05-30

## Added
- Threaded view make number orange when unread sub-messages
  [#1028](https://github.com/the-djmaze/snappymail/issues/1028)
- Handle PHP pctnl messages
- addEventListener('rl-view-model') missing for Settings
  [#1013](https://github.com/the-djmaze/snappymail/issues/1013)
- CSS `--btn-border-radius`

## Changed
- Improved RTL languages support
  [#1056](https://github.com/the-djmaze/snappymail/issues/1056)
- Composer text/attachments as tabs
  [#1119](https://github.com/the-djmaze/snappymail/issues/1119)
- Filter dialog doesn't refer to folder names consistently
  [#1111](https://github.com/the-djmaze/snappymail/issues/1111)
- TLS connection for MYSQL contact db
  [#1078](https://github.com/the-djmaze/snappymail/issues/1078)
- Allow empty message body when there are attachments
  [#1052](https://github.com/the-djmaze/snappymail/issues/1052)
- PHP inherit logger as Trait
- Update Portuguese by @ner00
  [#1124](https://github.com/the-djmaze/snappymail/pull/1124)
- Update Traditional Chinese (Taiwan) by @chiyi4488
  [#1107](https://github.com/the-djmaze/snappymail/pull/1107)
- Update Russian by @konkere
  [#1108](https://github.com/the-djmaze/snappymail/pull/1108)
- Update Italian by @cm-schl
  [#1094](https://github.com/the-djmaze/snappymail/pull/1094)
- Update French by @hguilbert
  [#1102](https://github.com/the-djmaze/snappymail/pull/1102)
- Update German by @cm-schl
  [#1087](https://github.com/the-djmaze/snappymail/pull/1087)

## Fixed
- Show messagelist timeout/abort error for
  [#1071](https://github.com/the-djmaze/snappymail/issues/1071)
- DesktopNotifications setting not saved
  [#1137](https://github.com/the-djmaze/snappymail/issues/1137)
- PHP Deprecation warning for $_openPipes
  [#1141](https://github.com/the-djmaze/snappymail/issues/1141)
- Images size wrong
  [#1134](https://github.com/the-djmaze/snappymail/issues/1134)
- Unable to preview body of encrypted mail in mailvelope reply-to
  [#1130](https://github.com/the-djmaze/snappymail/issues/1130)
- Replace `<button>` in HTML message with innerHTML instead of remove
  [#1125](https://github.com/the-djmaze/snappymail/issues/1125)
- Mailvelope failed
  [#1126](https://github.com/the-djmaze/snappymail/issues/1126)
- Tabs labels row height
- Selecting not yet existing filter throws error message instead of opening edit box
  [#1104](https://github.com/the-djmaze/snappymail/issues/1104)
- JavaScript Squire `node is null` error
- Config/Application.php: array_rand(): Argument
  [#1](https://github.com/the-djmaze/snappymail/issues/1) cannot be empty
  [#1123](https://github.com/the-djmaze/snappymail/issues/1123)
- Pressing Enter in Add Filter dialog results in "Leave page?" prompt
  [#1112](https://github.com/the-djmaze/snappymail/issues/1112)
- Issue with certain Amazon emails
  [#1086](https://github.com/the-djmaze/snappymail/issues/1086)
- HTML font 8px and 10px issue
  [#1082](https://github.com/the-djmaze/snappymail/issues/1082)
- Exception when executed on command line on the first-time
  [#1085](https://github.com/the-djmaze/snappymail/issues/1085)
- Folders missing pagination
  [#1070](https://github.com/the-djmaze/snappymail/issues/1070)
- Nextcloud WYSIWYG button style
  [#1138](https://github.com/the-djmaze/snappymail/issues/1138)
- Nextcloud .btn-group > .btn layout
- Nextcloud Bulleted items do not show the bullets in the preview window.
  [#1117](https://github.com/the-djmaze/snappymail/issues/1117)
- Nextcloud Contacts integration
  [#1083](https://github.com/the-djmaze/snappymail/issues/1083)


## 2.27.3 – 2023-04-04

## Added
- Squire visualize some active buttons states
- Hard coded string "Message body is empty"
  [#1048](https://github.com/the-djmaze/snappymail/issues/1048)
- Split SPAM label in user.json for directory and action
  [#1065](https://github.com/the-djmaze/snappymail/issues/1065)
- A solution for
  [#1056](https://github.com/the-djmaze/snappymail/issues/1056) to support dates in different language/calendar
- Log \nonexistent folder for
  [#1008](https://github.com/the-djmaze/snappymail/issues/1008)

## Changed
- Cleanup some enums to consts
- Workaround Upgrade with Nextcloud stuck in Maintenance mode
  [#1046](https://github.com/the-djmaze/snappymail/issues/1046)
- Use Actions()->decodeRawKey()
- French language updated by @hguilbert
  [#1045](https://github.com/the-djmaze/snappymail/pull/1045)
- Sorting in folders not working
  [#1022](https://github.com/the-djmaze/snappymail/issues/1022)
- Allow saving draft with empty body
  [#1052](https://github.com/the-djmaze/snappymail/issues/1052)

## Fixed
- GnuPG decrypt failed
- Clear folder link should be hidden if "dangerous actions" is not active
  [#1037](https://github.com/the-djmaze/snappymail/issues/1037)
- 500 error generating preview with GD2
  [#1009](https://github.com/the-djmaze/snappymail/issues/1009)
- Text and Links Jumping While Writing
  [#1004](https://github.com/the-djmaze/snappymail/issues/1004)
- Odd annoying behaviour when copy/ pasting anything into an email and then attempting to edit it.
  [#1054](https://github.com/the-djmaze/snappymail/issues/1054)
- Check if $rImapLiteralStream is open resource and not closed
- Save as eml to nextcloud not working anymore
  [#1057](https://github.com/the-djmaze/snappymail/issues/1057)
- AuthError and Call to a member function ImapConnectAndLogin() on null
  [#1060](https://github.com/the-djmaze/snappymail/issues/1060)
- Thread count missing/shown
  [#1003](https://github.com/the-djmaze/snappymail/issues/1003)


## 2.27.2 – 2023-03-22

## Added
- authentication with smtp freenet.de
  [#1038](https://github.com/the-djmaze/snappymail/issues/1038)

## Changed
- SASL always base64 by default

## Fixed
- Cache issue with index
  [#1024](https://github.com/the-djmaze/snappymail/issues/1024)


## 2.27.1 – 2023-03-21

## Changed
- Improved attachmentIcon glyph coloring
- Better design for .accountPlace text
  [#1025](https://github.com/the-djmaze/snappymail/issues/1025)

## Fixed
- Reply is broken
  [#1027](https://github.com/the-djmaze/snappymail/issues/1027)
- Endless loop at login - Cannot assign array to property MailSo\Imap\Folder::$MAILBOXID
  [#1032](https://github.com/the-djmaze/snappymail/issues/1032)


## 2.27.0 – 2023-03-20

## Added
- Unique attachments.zip filename
  [#992](https://github.com/the-djmaze/snappymail/issues/992)
- Select next email after (re)move current
  [#968](https://github.com/the-djmaze/snappymail/issues/968)

## Changed
- Improved FolderCollection handling
- MODSEQ requires 64-bit int
- Update russian language by @Akrobs
  [#994](https://github.com/the-djmaze/snappymail/pull/994)
- Don't make font bigger when screen > 1400px
- Put top menu "accountPlace" inside top-system-dropdown-id
- Put attachment controls inside attachmentsPlace
- Show message toolbar on screens > 1400px
  [#970](https://github.com/the-djmaze/snappymail/issues/970)
- Chinese updated by @mayswind
  [#1011](https://github.com/the-djmaze/snappymail/pull/1011)
- Prevent folder/messages flags conflict by using the right name `attributes` for Folders
- FolderInformation() use jsonSerialize()
- Squire space handling on paste use `\u00A0` instead of `&nbsp;` for
  [#1004](https://github.com/the-djmaze/snappymail/issues/1004)
- Better line-height for QR code

## Fixed
- Composer src is null
- Image in Signature disappears in Sent/Draft
  [#932](https://github.com/the-djmaze/snappymail/issues/932)
- Mail list is empty
  [#998](https://github.com/the-djmaze/snappymail/issues/998)
- Cache handling issues
  [#1003](https://github.com/the-djmaze/snappymail/issues/1003)
- No message notification popup when installed in sub-directory
  [#1007](https://github.com/the-djmaze/snappymail/issues/1007)
- ERROR: Undefined constant "MailSo\Log\Drivers\STDERR"
  [#965](https://github.com/the-djmaze/snappymail/issues/965)
- 'Location:' headers using proper '302 Found' header
- Can't send email
  [#1006](https://github.com/the-djmaze/snappymail/issues/1006)
- Attachment preview
  [#1005](https://github.com/the-djmaze/snappymail/issues/1005)
- When decrypt message, subject was replaced empty

### Removed
- \MailSo\Imap\ImapClient::GetConnectedPort()

### Nextcloud
- CSS `--panel-bg-clr` was missing
- SnappyMail Menu under Nextcloud top bar
  [#1017](https://github.com/the-djmaze/snappymail/issues/1017)


## 2.26.4 – 2023-02-24

## Added
- Add CSP frame-ancestors for
  [#537](https://github.com/the-djmaze/snappymail/issues/537)

## Changed
- Reduce/simplify CSS footprint
- Use the System/Browser font by default by @HeySora
  [#988](https://github.com/the-djmaze/snappymail/pull/988)
- Make layout fully responsive using matchMedia('(max-width: 799px)')
- Move brotli and gzip compress option to application.ini
- After page refreshes in background whilst editing a draft, the space bar stops working
  [#860](https://github.com/the-djmaze/snappymail/issues/860)
- Updated Portuguese by @ner00
  [#984](https://github.com/the-djmaze/snappymail/pull/984)
- Updated French by @hguilbert
  [#985](https://github.com/the-djmaze/snappymail/pull/985)

## Fixed
- unset border-box for message body
  [#990](https://github.com/the-djmaze/snappymail/issues/990)
- Unread email count badge shows -1
  [#989](https://github.com/the-djmaze/snappymail/issues/989)
- unicode mailto: addresses not decoded
- Unicode email/url address matching
  [#955](https://github.com/the-djmaze/snappymail/issues/955)
- Invalid Token if run in IFrame
  [#537](https://github.com/the-djmaze/snappymail/issues/537)

### Removed
- rl.initData


## 2.26.3 – 2023-02-21

## Added
- Translate "Are you sure you want to exit?"
- stderr as Logger

## Changed
- Moved rl.fetch and rl.fetchJSON to boot.js so that AppData can be fetched as JSON
- Many AppData properties to JavaScript camelCase
- Cleanup Identity handling
- Merge GnuPG and OpenPGP.js passphrases

## Fixed
- Notification enum conflicts with window.Notification
- language selector didn't show current language in green
- Threads indicator got lost with new message cache handling
- messagesBodiesDom never cached previous messages
- Nextcloud File picker doesn't insert multiple links
  [#981](https://github.com/the-djmaze/snappymail/issues/981)
- Call to protected method RainLoop\Enumerations\UploadError::getUserMessage()
  [#982](https://github.com/the-djmaze/snappymail/issues/982)
- Issue with the top logo and text of a certain e-mail
  [#953](https://github.com/the-djmaze/snappymail/issues/953)
- Facebook logo missing from emails sent out by it
  [#954](https://github.com/the-djmaze/snappymail/issues/954)

### Removed
- Unused Squire code


## 2.26.2 – 2023-02-17

## Added
- Remove CSS white-space from messages to prevent annoying side scrolling
- Show error when trying to send empty message
  [#974](https://github.com/the-djmaze/snappymail/issues/974)
- max_sys_loadavg as setting
  [#971](https://github.com/the-djmaze/snappymail/issues/971)

## Changed
- Speedup and improved cleanHtml() and cleanCSS() handling
- Better handling of upload .eml files to a mailbox
- Rename Folder Hash to ETag as it is the more obvious name
- Moved AllowDraftAutosave option from Settings -> Security to Settings -> General -> Compose
- SmtpClient->Connect() use $oSettings->Ehlo
- Improved handling of `<style>` elements in messages
- French updated by @hguilbert

## Fixed
- Remove SVG elements properly from messages
  [#972](https://github.com/the-djmaze/snappymail/issues/972)
- Sending large HTML messages slow/fail
  [#962](https://github.com/the-djmaze/snappymail/issues/962)
- Nextcloud login failed
  [#969](https://github.com/the-djmaze/snappymail/issues/969)
- DoMessageList() hash check was incorrect
- "Move to folder" button overlays folder sidebar on mobile
  [#961](https://github.com/the-djmaze/snappymail/issues/961)
- Spanish translation SPAM and NOT SPAM strings are reversed
  [#964](https://github.com/the-djmaze/snappymail/issues/964)
- Can't open Thunderbird PGP keys from decrypted message
  [#958](https://github.com/the-djmaze/snappymail/issues/958)
- Can't close Sieve dialog
  [#960](https://github.com/the-djmaze/snappymail/issues/960)


## 2.26.1 – 2023-02-14

## Added
- Option to allow `<style>` in messages (beta)
- Message in new tab/window was missing BCC

## Changed
- Don't clone message for viewing, so that there is instant interaction with messagelist item
- emailArrayToStringLineHelper() now filters addresses without email address
- Cleanup EmailModel and better email address parsing and handling
- Workaround "server connection error"
  [#936](https://github.com/the-djmaze/snappymail/issues/936)
- Cleanup AbstractViewPopup handling
- Italian translation by @lota
  [#948](https://github.com/the-djmaze/snappymail/pull/948)
- Replace Element.fromHTML() with createElement()

## Fixed
- New subfolder not visible
  [#937](https://github.com/the-djmaze/snappymail/issues/937)
- OpenPGP decrypted attachments `friendlySize` not a function
- Message @media print was broken due to new `display:flex`
- addressparser() didn't handle groups properly
- middleclick in messages list failed when messagesDom not yet initialized
- Cannot open messages that have an email address without an @ in the From header
  [#950](https://github.com/the-djmaze/snappymail/issues/950)
- CSS don't display:flex when `[hidden]`
- Default theme handling by @Niveshkrishna


## 2.26.0 – 2023-02-10

## Added
- Whitelist advanced SPF/DKIM/DMARC valid feature
  [#938](https://github.com/the-djmaze/snappymail/issues/938)

## Changed
- \RainLoop\Providers\AddressBook\Utils functions param `Contact` changed to `VCard`

## Fixed
- Issue with themes and Chrome cache
  [#188](https://github.com/the-djmaze/snappymail/issues/188)
- Settings panel width due to display:flex
  [#940](https://github.com/the-djmaze/snappymail/issues/940)
- Not respecting default theme setting
  [#941](https://github.com/the-djmaze/snappymail/issues/941)
- Some files had 0755 instead of 0644
- Some spacing between message "view images" buttons for
  [#201](https://github.com/the-djmaze/snappymail/issues/201)
- Whitelist failed when empty or when using `:`
  [#938](https://github.com/the-djmaze/snappymail/issues/938)
- Cosmetics of the external images whitelist menu
  [#939](https://github.com/the-djmaze/snappymail/issues/939)
- PdoAddressBook ORDER BY deleted DESC to prevent sync and export issues
- Undefined variable $items in upgrade.php
- qq.com not supporting literal-string in search
  [#836](https://github.com/the-djmaze/snappymail/issues/836)


## 2.25.5 – 2023-02-09

## Added
- New dark themes by @TheCuteFoxxy
  [#925](https://github.com/the-djmaze/snappymail/pull/925)
- External images option 'Always when DKIM is valid' for
  [#201](https://github.com/the-djmaze/snappymail/issues/201)
- Image whitelist menu on message for
  [#201](https://github.com/the-djmaze/snappymail/issues/201)

## Changed
- pt-PT translation by @ner00
  [#917](https://github.com/the-djmaze/snappymail/issues/917) and
  [#920](https://github.com/the-djmaze/snappymail/issues/920)
- fr-FR translation by @hguilbert
  [#919](https://github.com/the-djmaze/snappymail/issues/919)
- Layout section rl-right now is `display: flex` and solves
  [#928](https://github.com/the-djmaze/snappymail/issues/928)
- Some Themes background to `cover`
  [#918](https://github.com/the-djmaze/snappymail/issues/918)
- Speedup cleanHtml() parser
- Reduce memory usage on addressbook import

## Fixed
- Prevent loading loop between MessageList and FolderInformation requests
- Admin -> Config layout
- Inline images sometimes failed
- Undefined index: cid
  [#921](https://github.com/the-djmaze/snappymail/issues/921)
- On upgrade prevent Apache access errors for
  [#358](https://github.com/the-djmaze/snappymail/issues/358)
- Import contacts as CSV is broken
  [#931](https://github.com/the-djmaze/snappymail/issues/931)

### Removed
- Blockquote height calculator for
  [#902](https://github.com/the-djmaze/snappymail/issues/902)


## 2.25.4 – 2023-02-06

## Added
- message maximum quoted text level for speed.
  [#902](https://github.com/the-djmaze/snappymail/issues/902)
- LoveDark Theme by @TheCuteFoxxy
  [#913](https://github.com/the-djmaze/snappymail/pull/913)

## Changed
- Moved pluginEnable() to \SnappyMail\Repository::enablePackage()
- Updrate French language by @hguilbert
- Cleanup material-design checkbox
- Some style change for settings panels
- Some MailMessageView styling
- Disabled blockquotes height calculation for
  [#902](https://github.com/the-djmaze/snappymail/issues/902)
- Enhance Add domain dialog
  [#916](https://github.com/the-djmaze/snappymail/issues/916)

## Fixed
- Fixed arrows in thread view while scrolling
  [#908](https://github.com/the-djmaze/snappymail/issues/908)
- CSS btn-thin were too high
- Whitelist to show images directly
  [#201](https://github.com/the-djmaze/snappymail/issues/201)
- MailSo\Base\Http::GetHost(): Return value must be of type string
  [#910](https://github.com/the-djmaze/snappymail/issues/910)
- Nextcloud undefined variable $sUser
  [#915](https://github.com/the-djmaze/snappymail/issues/915)
- Hopefull improved styling for Firefox mobile fixes
- Scroll display error
  [#912](https://github.com/the-djmaze/snappymail/issues/912)
- Autofocus was triggered when view resized
- Better solution for Settings Page is bigger than the Account Page
  [#897](https://github.com/the-djmaze/snappymail/issues/897)

### Removed
- $bUrlEncode as it was always false


## 2.25.3 – 2023-02-03

## Added
- Make message collapse quotes optional
  [#902](https://github.com/the-djmaze/snappymail/issues/902)

## Changed
- Improved loginErrorDelay to prevent timing attacks and default to 5 seconds
- Moved message collapse quotes to HTML parser
- Moved some application.ini settings to other sections
- Moved source "/assets/*" to proper location in /snappymail/v/0.0.0/static/
- Set checkMailInterval to 15 minutes by default (now that it is configurable)

## Fixed
- Prevent plugin property decrypt error
  [#859](https://github.com/the-djmaze/snappymail/issues/859)
- Index.html cache issue
  [#891](https://github.com/the-djmaze/snappymail/issues/891)
- Images whitelist regular expression failed
  [#201](https://github.com/the-djmaze/snappymail/issues/201)
- Undefined index: ShowImages
  [#901](https://github.com/the-djmaze/snappymail/issues/901)
- Chrome shows LSep boxes in certain emails
  [#900](https://github.com/the-djmaze/snappymail/issues/900)
- Don't remember OpenPGP/GnuPGP key passphrase when it fails
  [#840](https://github.com/the-djmaze/snappymail/issues/840)


## 2.25.2 – 2023-02-02

## Added
- Refresh frequency of the mailboxes
  [#486](https://github.com/the-djmaze/snappymail/issues/486)
- Temporarily save password for private key during session
  [#840](https://github.com/the-djmaze/snappymail/issues/840)
- Upgrade from Rainloop, password not migrated
  [#898](https://github.com/the-djmaze/snappymail/issues/898)
- Whitelist to show images directly
  [#201](https://github.com/the-djmaze/snappymail/issues/201)
- HTML editor paste image makes it max 1024px width/height
  [#262](https://github.com/the-djmaze/snappymail/issues/262)
- SnappyMail\TAR::extractTo support the $files and $overwrite parameters

## Changed
- Issue with themes when Chrome crashes
  [#188](https://github.com/the-djmaze/snappymail/issues/188)
- /static/.htaccess as mentioned by @dbiczo in
  [#895](https://github.com/the-djmaze/snappymail/issues/895)
- Update nb-NO language by @master3395
  [#896](https://github.com/the-djmaze/snappymail/pull/896)
- \RainLoop\Utils::SetCookie() to \SnappyMail\Cookies::set()
- Merge \MailSo\Base\Utils::RecRmDir() and \MailSo\Base\Utils::RecTimeDirRemove()

## Fixed
- Two issues with images being delivered via ProxyExternal
  [#887](https://github.com/the-djmaze/snappymail/issues/887)
- Multiple accounts conflicts when using multiple tabs
  [#892](https://github.com/the-djmaze/snappymail/issues/892)
- Spaces in attached file names are not preserved
  [#893](https://github.com/the-djmaze/snappymail/issues/893)
- Prevent empty area scroll on body

### Removed
- Floating HTML text formatting menu on mobile
  [#828](https://github.com/the-djmaze/snappymail/issues/828)
- Unused AUTH_SPEC_LOGOUT_TOKEN_KEY and AUTH_SPEC_LOGOUT_CUSTOM_MSG_KEY


## 2.25.1 – 2023-01-30

## Added
- Support RFC 8689
- Nextcloud move themes outside of app folder
  [#875](https://github.com/the-djmaze/snappymail/issues/875)
- Add check to unregister system addressbook by @akhil1508
  [#879](https://github.com/the-djmaze/snappymail/pull/879)

## Changed
- material-design checkbox use hidden input for accessibility
- Always subscribe to new folder by default
- Merge NoScript, NoCookie and BadBrowser pages in Index.html
- Cleanup translations. Also see https://snappymail.eu/translate.php

## Fixed
- PHP < 8.1 ini_set() only accepts strings when `declare(strict_types=1);` is used
- Nextcloud also fix settings on upgrade
- Nextcloud workaround upgrade OPCache issue
  [#880](https://github.com/the-djmaze/snappymail/issues/880)
- SMTP error while using PHP mail()
  [#884](https://github.com/the-djmaze/snappymail/issues/884)
- Cannot create folder
  [#885](https://github.com/the-djmaze/snappymail/issues/885)
- Image stretching when image hasd max-width
  [#869](https://github.com/the-djmaze/snappymail/issues/869)


## 2.25.0 – 2023-01-26

## Changed
- Right margin to folder search input wrapper by @codiflow
  [#871](https://github.com/the-djmaze/snappymail/pull/871)
- Almost all request params now use JavaScript camelCase instead of CamelCase
- #rl-content to use flex for better layout control
- Decode some Copernica link tracking
- Cleanup some CSS and JS code
- Better Sieve rainloop.user script handling
- Improve MailSo\Imap\BodyStructure
- Cleanup MIME part FileName handling

## Fixed
- CardDAV sync error - Request aborted
  [#866](https://github.com/the-djmaze/snappymail/issues/866)
- PDF not possible to be viewed in the browser
  [#867](https://github.com/the-djmaze/snappymail/issues/867)
- ZIP Files cannot be uploaded from Desktop to attachments (other files can be uploaded)
  [#878](https://github.com/the-djmaze/snappymail/issues/878)
- Mobile view issues with leftside menu
- Default messageListItem border left color for dark mode
- Nextcloud layout in ?admin
- Nextcloud `_htaccess` to `.htaccess` failed

### Removed
- Some unused PHP functions

## 2.24.6 – 2023-01-18

## Added
- Preparations for RFC 8689
- Add admin setting for the contacts suggestions limit
- A button to clear folder search input field by @codiflow
  [#847](https://github.com/the-djmaze/snappymail/pull/847)
- Preparations for custom SMTP credentials handling for
  [#859](https://github.com/the-djmaze/snappymail/issues/859)
  [#458](https://github.com/the-djmaze/snappymail/issues/458)
  [#431](https://github.com/the-djmaze/snappymail/issues/431)
  [#233](https://github.com/the-djmaze/snappymail/issues/233)

## Changed
- Display the time of emails, not just the size and date
  [#843](https://github.com/the-djmaze/snappymail/issues/843)
- Made thread number a bit wider
  [#844](https://github.com/the-djmaze/snappymail/issues/844)
- Improved contacts suggestions limit handling
  [#849](https://github.com/the-djmaze/snappymail/issues/849)
- 64-bit PHP was required
  [#852](https://github.com/the-djmaze/snappymail/issues/852)
- Update fr-FR translations by @dominiquefournier
  [#854](https://github.com/the-djmaze/snappymail/pull/854)
- Move createDomain & createDomainAlias buttons below table
- Move some Nextcloud SnappyMailHelper code to new InstallStep
- Cleanup messages cache handling
- Improved visibility Admin Domain Test errors

## Fixed
- LiteSpeed does not disable compression although .htaccess says so
  [#525](https://github.com/the-djmaze/snappymail/issues/525)
  [#855](https://github.com/the-djmaze/snappymail/issues/855)
- "Move to folder" functionality displays in desktop view when on mobile
  [#858](https://github.com/the-djmaze/snappymail/issues/858)
- matchAnyRule() Return value must be of type bool, none returned
- Unknown CSP directive 'strict-dynamic' in Safari 13.1.2
- Wrong timeStyle issue in Safari 13.1.2
- Language SETTINGS_LABELS got lost
- Nextcloud failed loading app data when path didn't end with /
  [#864](https://github.com/the-djmaze/snappymail/issues/864)
- Workaround Nextcloud session_start issue
  [#813](https://github.com/the-djmaze/snappymail/issues/813)

## 2.24.5 – 2023-01-12

## Added
- Support for search criterias ON, SENTON, SENTSINCE and SENTBEFORE
- New 'forward as attachment' glyph
- NC integration app metadata: add links to admin and dev docs by @p-bo
  [#820](https://github.com/the-djmaze/snappymail/pull/820)
- Clicking on messagelist grouped date/from searches on that date/from
  [#815](https://github.com/the-djmaze/snappymail/issues/815)
- Nextcloud Improved file picker layout
  [#825](https://github.com/the-djmaze/snappymail/issues/825)

## Changed
- Move release.php to cli/release.php
- Moved sort options "FROM" direct below "DATE" for better understanding
- Added DAV path error to log for
  [#822](https://github.com/the-djmaze/snappymail/issues/822)
- Resolve layout issues by changing from `fixed` to `relative`
  [#686](https://github.com/the-djmaze/snappymail/issues/686)
- Cache handling of messagelist changed due to etag issues
- Improve german and italian translation by @cm-schl
  [#846](https://github.com/the-djmaze/snappymail/pull/846)

## Fixed
- Searching on Nextcloud search
  [#787](https://github.com/the-djmaze/snappymail/issues/787)
- Workaround another Nextcloud disallowed .htaccess
  [#790](https://github.com/the-djmaze/snappymail/issues/790)
- Compact display of folders in nextcloud by @makoehr
  [#824](https://github.com/the-djmaze/snappymail/pull/824)
- Admin -> Contacts PDO test failed when using different AddressBookInterface
- KolabAddressBook errors
- Forgot debug js/css setting change in Nextcloud
- Typed property MailSo\Mail\MessageListParams::$sSearch must not be accessed before initialization
- Unable to change font/text colour when composing message using Safari
  [#826](https://github.com/the-djmaze/snappymail/issues/826)
- auth_logging failed
  [#489](https://github.com/the-djmaze/snappymail/issues/489)
- Class "RainLoop\Actions\Notifications" not found
  [#839](https://github.com/the-djmaze/snappymail/issues/839)

### Removed
- 'set-version' argument for release.php


## 2.24.4 – 2022-12-30

## Added
- Check PHP_INT_SIZE if SnappyMail runs on 64bit

## Changed
- A lot of MessageList sorting improvements
  [#796](https://github.com/the-djmaze/snappymail/issues/796)
- On upgrade also update plugins in Nextcloud due to many misunderstandings and prevent invalid open issues
- Moved application.ini labs.use_app_debug_* to debug.*

## Fixed
- Dutch translation for confusing message (threads vs grouped)
- Workaround Nextcloud disallowed .htaccess
  [#790](https://github.com/the-djmaze/snappymail/issues/790)
- Searching on Nextcloud search failed
  [#787](https://github.com/the-djmaze/snappymail/issues/787)


## 2.24.3 – 2022-12-28

## Changed
- When sorting on FROM also sort on REVERSE DATE

## Fixed
- F5 and Ctrl-F5 reload logs out of Snappymail in Chrome.
  [#800](https://github.com/the-djmaze/snappymail/issues/800)
- Switching accounts does not work anymore with 2.24.2
  [#802](https://github.com/the-djmaze/snappymail/issues/802)


## 2.24.2 – 2022-12-27

### Changed
- Disable sorting when viewing message thread
  [#445](https://github.com/the-djmaze/snappymail/issues/445)
- Update Chinese translation by @mayswind
  [#794](https://github.com/the-djmaze/snappymail/pull/794)
- No need to call IMAP EXAMINE when current folder already SELECT
- Thread view now has tree indentation

### Fixed
- Nextcloud failed on Integrity check
  [#790](https://github.com/the-djmaze/snappymail/issues/790)
- Deleting message fails with message "Cannot move message" on hMailServer
  [#793](https://github.com/the-djmaze/snappymail/issues/793)
- List messages per day feature is enabled by default and breaks sorting
  [#796](https://github.com/the-djmaze/snappymail/issues/796)
- Custom page login not working for first time due to smctoken security
  [#798](https://github.com/the-djmaze/snappymail/issues/798)
- Message list is always empty due to wrong implementation of RFC 8474
  [#799](https://github.com/the-djmaze/snappymail/issues/799)


## 2.24.1 – 2022-12-23

### Changed
- Intl.DateTimeFormat() into toLocaleString() for iOS < 14
- Cleanup locale date/time handling
- Make MessageList per day optional
  [#737](https://github.com/the-djmaze/snappymail/issues/737)

### Fixed
- Typed property MailSo\Cache\Drivers\Redis::$sKeyPrefix must not be accessed before initialization
  [#792](https://github.com/the-djmaze/snappymail/issues/792)
- Attachments in mails in 2.24 not loading in reply/forward
  [#789](https://github.com/the-djmaze/snappymail/issues/789)
- Rollback #280 due to complications
  [#280](https://github.com/the-djmaze/snappymail/issues/280)


## 2.24.0 – 2022-12-22

### Added
- Option to enable additional account unread messages count
- Prevent godaddy click tracking
- Dark theme use `color-scheme: dark;`
- More imapsync.php CLI options and help

### Changed
- MessageList now grouped/split per day
  [#737](https://github.com/the-djmaze/snappymail/issues/737)
- Account switcher still shown when allow_additional_accounts is set to Off
  [#280](https://github.com/the-djmaze/snappymail/issues/280)
- PHP classes use typed properties
- Speedup Contacts Suggestions handling
- Check SMTP SIZE
  [#779](https://github.com/the-djmaze/snappymail/issues/779)

### Fixed
- Handle multiple DKIM signatures authentication results
- Reload admin extensions on update
- SieveClient quoted string parsing failed
- Invalid Attachments (PDF)
  [#466](https://github.com/the-djmaze/snappymail/issues/466)
- Email HTML images rendering issue
  [#564](https://github.com/the-djmaze/snappymail/issues/564)
- "Server message: No supported SASL mechanism found, remote server wants:" in hMailServer
  [#780](https://github.com/the-djmaze/snappymail/issues/780)

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
  [#744](https://github.com/the-djmaze/snappymail/issues/744)
- Added manual setting for 12/24h clock
  [#760](https://github.com/the-djmaze/snappymail/issues/760)
- Add options to mark the message I'm viewing as unread and return to the inbox
  [#766](https://github.com/the-djmaze/snappymail/issues/766)

### Fixed
- Extension menu shows only some available extensions
  [#778](https://github.com/the-djmaze/snappymail/issues/778)
- New solution for [#423](https://github.com/the-djmaze/snappymail/issues/423) due to [#774](https://github.com/the-djmaze/snappymail/issues/774)
- Avatars extension error on smartphone
  [#764](https://github.com/the-djmaze/snappymail/issues/764)
- Don't fetch Unread count for main account
- CSS .e-checkbox.material-design invisible on show/hide


## 2.23.0 – 2022-12-08

### Added
- Show the number of unread mails on all mail addresses/accounts
  [#437](https://github.com/the-djmaze/snappymail/issues/437)
- Show OpenSSL version in Admin => About

### Changed
- Redirect to login page instead of "invalid token" popup
  [#752](https://github.com/the-djmaze/snappymail/issues/752)
- Make all dialogs fit in mobile view
- Changed some Plugin hooks for better handling:
	* json.action-pre-call => json.before-{actionname}
	* json.action-post-call => json.after-{actionname}
- Cleaner accounts list in systemdropdown
- Multiple imapConnect handling for new import mail feature
  [#744](https://github.com/the-djmaze/snappymail/issues/744)

### Fixed
- Loosing HTML signature in account identity under settings
  [#750](https://github.com/the-djmaze/snappymail/issues/750)
- Plugin configuration did not load anymore when type was SELECTION by @cm-schl
  [#753](https://github.com/the-djmaze/snappymail/pull/753)
- Nextcloud Default theme shows gray text on gray background
  [#754](https://github.com/the-djmaze/snappymail/issues/754)
- Only run JSON hooks when $sAction is set
  [#755](https://github.com/the-djmaze/snappymail/issues/755)
- Unsupported SASL mechanism OAUTHBEARER
  [#756](https://github.com/the-djmaze/snappymail/issues/756)
  [#758](https://github.com/the-djmaze/snappymail/issues/758)
  [#759](https://github.com/the-djmaze/snappymail/issues/759)
- border-box issue with .buttonCompose

### Removed
- Deprecate \RainLoop\Account->Login() and \RainLoop\Account->Password()


## 2.22.7 – 2022-12-06

### Changed
- Scroll bar with the mobile version in "Advanced search" screen
  [#712](https://github.com/the-djmaze/snappymail/issues/712)

### Fixed
- Undefined property: MailSo\Mail\FolderCollection::$capabilities
- PHP 8.2 Creation of dynamic property is deprecated
- Attempt to solve #745 in v2.22.6 failed and resulted in errors #746 and #748
  [#745](https://github.com/the-djmaze/snappymail/issues/745)
  [#746](https://github.com/the-djmaze/snappymail/issues/746)
  [#748](https://github.com/the-djmaze/snappymail/issues/748)
- Admin domain test undefined matched domain should say email@example matched domain


## 2.22.6 – 2022-12-05

### Changed
- Narrow MessageList wraps star icon
  [#737](https://github.com/the-djmaze/snappymail/issues/737)
- Use UIDVALIDITY when HIGHESTMODSEQ not available, maybe solves
  [#745](https://github.com/the-djmaze/snappymail/issues/745)
- No need to generate 1000's of ID's for MessageListByRequestIndexOrUids()
- Update Chinese translation by @mayswind

### Fixed
- PluginProperty DefaultValue contained array while it should not
  [#741](https://github.com/the-djmaze/snappymail/issues/741)

### Removed
- IMAP SELECT/EXAMINE unset `UNSEEN` because IMAP4rev2 deprecated


## 2.22.5 – 2022-12-02

### Added
- Support plugin minified .min.js and .min.css
- ZIP Download multiple emails
  [#717](https://github.com/the-djmaze/snappymail/issues/717)

### Changed
- Replaced some data-bind="click: function(){} with object functions to prevent eval()
- Improved plugins hash when there are changes

### Fixed
- Settings Themes style due to border-box change
- "Remember me" failed due to v2.22.4 Session token change
  [#719](https://github.com/the-djmaze/snappymail/issues/719)
  [#731](https://github.com/the-djmaze/snappymail/issues/731)

### Removed
- Vacation filter: Button to add recipients (+)
  [#728](https://github.com/the-djmaze/snappymail/issues/728)


## 2.22.4 – 2022-11-28

### Changed
- Contacts dialog layout using flex
- Session token is related to the user agent string
  [#713](https://github.com/the-djmaze/snappymail/issues/713)
- Better browser cache handling for avatars plugin
  [#714](https://github.com/the-djmaze/snappymail/issues/714)
- Force HTML editor when set as default when replying to message
  [#355](https://github.com/the-djmaze/snappymail/issues/355)

### Fixed
- Contact Error - object Object
  [#716](https://github.com/the-djmaze/snappymail/issues/716)
- Unable to move messages to different folder by drag and drop
  [#710](https://github.com/the-djmaze/snappymail/issues/710)
- v2.22.3 unknown error
  [#709https://github.com/the-djmaze/snappymail/issues/709)


## 2.22.3 – 2022-11-25

### Added
- application.ini config logs.path and cache.path to improve custom data structure.

### Changed
- Improved cPanel integration
  [#697](https://github.com/the-djmaze/snappymail/issues/697)
- Update to OpenPGP.js v5.5.0

### Fixed
- drag & drop folder expansion
  [#707](https://github.com/the-djmaze/snappymail/issues/707)
- Save selected messages as .eml in Nextcloud failed
  [#704](https://github.com/the-djmaze/snappymail/issues/704)


## 2.22.2 – 2022-11-24

### Added
- Support cPanel
  [#697](https://github.com/the-djmaze/snappymail/issues/697)


## 2.22.1 – 2022-11-23

### Added
- AddressBookInterface::GetContactByEmail() to support sender image/avatar extension
  [#115](https://github.com/the-djmaze/snappymail/issues/115)

### Changed
- All the attachment zone is not clickable, even if the cursor is a hand
  [#691](https://github.com/the-djmaze/snappymail/issues/691)
- Different approach for "update button duplicated in admin panel"
  [#677](https://github.com/the-djmaze/snappymail/issues/677)
- Better drag & drop solution for leftPanel

### Fixed
- The page does not change after batch deletion
  [#684](https://github.com/the-djmaze/snappymail/issues/684)
- Prevent domain uppercase issues found in
  [#689](https://github.com/the-djmaze/snappymail/issues/689)
- Login invalid response: VXNlcm5hbWU6CG
  [#693](https://github.com/the-djmaze/snappymail/issues/693)


## 2.21.4 – 2022-11-22

### Added
- Added domain matcher test for
  [#689](https://github.com/the-djmaze/snappymail/issues/689)
- Download all Attachments of selected Emails
  [#361](https://github.com/the-djmaze/snappymail/issues/361)

### Changed
- Log current shortcuts scope for
  [#690](https://github.com/the-djmaze/snappymail/issues/690)
- CSS everything to be box-sizing: border-box;
- Make messageview a bit larger so that it is the same height as the messagelist
- Cleanup and rearrange some fontastic glyphs
- Also show From email address by default
  [#683](https://github.com/the-djmaze/snappymail/issues/683)

### Fixed
- Contact.display() returns [object Object]
- When left panel disabled and drag messages, show it
- Issue with admin domain connection type settings selectbox
  [#689](https://github.com/the-djmaze/snappymail/issues/689)
- Mobile View on cellphones: automatic scrolling not working near the visual keyboard
  [#686](https://github.com/the-djmaze/snappymail/issues/686)
- Unable to separate runtime from installation
  [#685](https://github.com/the-djmaze/snappymail/issues/685)

### Removed
- Removed inline parameter of checkbox and select components


## 2.21.3 – 2022-11-16

### Added
- Click on PGP KEY attachment opens "Import key" dialog

### Changed
- Increase visible reading area for small screens
  [#672](https://github.com/the-djmaze/snappymail/issues/672)
- Improved message spam score detailed view
- Improved DAV connection logging

### Fixed
- Handling attachments MIME type / content-type
- Message responsive resizing width/height of elements
  [#678](https://github.com/the-djmaze/snappymail/issues/678)
- Focus on textarea when creating a new plain text email
  [#501](https://github.com/the-djmaze/snappymail/issues/501)
- CardDav remove photos of my contacts when synchronizing
  [#679](https://github.com/the-djmaze/snappymail/issues/679)

### Removed
- \MailSo\Mime\Enumerations\MimeType

### Nextcloud
- Use fontastic in Nextcloud Files selector dialog
- Firefox < 98 dialogs
  [#673](https://github.com/the-djmaze/snappymail/issues/673)

## 2.21.2 – 2022-11-15

### Added
- Allow browser Spellchecker
  [#574](https://github.com/the-djmaze/snappymail/issues/574)
- Decode MIME charset of .EML attachments
  [#662](https://github.com/the-djmaze/snappymail/issues/662)

### Changed
- Increase message visible text area
  [#672](https://github.com/the-djmaze/snappymail/issues/672)
- When copy/paste image use the raw data instead of clipboard HTML
  [#654](https://github.com/the-djmaze/snappymail/issues/654)
- When application.ini debug.enable is true, also debug js and css
- JavaScript rl.setWindowTitle() renamed to rl.setTitle()

### Removed
- Message toggle fullscreen button which was only in mobile view

### Nextcloud
- Workaround Nextcloud calendar crashes
  [#622](https://github.com/the-djmaze/snappymail/issues/622)
  [#661](https://github.com/the-djmaze/snappymail/issues/661)
- Added share public/internal file link
  [#569](https://github.com/the-djmaze/snappymail/issues/569)


## 2.21.1 – 2022-11-13

### Fixed
- Crypt crashes when Sodium not installed
  [#641](https://github.com/the-djmaze/snappymail/issues/641)
  [#657](https://github.com/the-djmaze/snappymail/issues/657)
  [#663](https://github.com/the-djmaze/snappymail/issues/663)
  [#664](https://github.com/the-djmaze/snappymail/issues/664)
  [#668](https://github.com/the-djmaze/snappymail/issues/668)
  [#669](https://github.com/the-djmaze/snappymail/issues/669)
- Personalised favicon not working - default Snappymail favicon showing
  [#665](https://github.com/the-djmaze/snappymail/issues/665)

### Nextcloud
- v23 ContentSecurityPolicy versions issue
  [#666](https://github.com/the-djmaze/snappymail/issues/666)


## 2.21.0 – 2022-11-11

### Added
- Put messagelist top bar buttons also in dropdown
- Allow setting additional Sec-Fetch rules, as discussed by
  [#585](https://github.com/the-djmaze/snappymail/issues/585)
- Light/Dark favicon.svg
  [#643](https://github.com/the-djmaze/snappymail/issues/643)
- Allow an account name/label
  [#571](https://github.com/the-djmaze/snappymail/issues/571)

### Changed
- Moved ServiceRemoteAutoLogin to plugin/extension
- Moved ServiceExternalSso to plugin/extension
- Moved ServiceExternalLogin to plugin/extension
- Renamed ManageSieveClient to SieveClient
- New Net/Imap/Smtp/Sieve Settings object system which allows
  setting SSL options per domain and verify_certificate by default
- Update plugins to use new Net/Imap/Smtp/Sieve Settings object
- Removed message double-click to full screen
  [#638](https://github.com/the-djmaze/snappymail/issues/638)

### Fixed
- ldap-identities-plugin by @cm-schl
  [#647](https://github.com/the-djmaze/snappymail/pull/647)
- OpenSSL v3 ciphers issue
  [#641](https://github.com/the-djmaze/snappymail/issues/641)

### Nextcloud
- Style PopupsNextcloudFiles view
- Link to internal files in composer


## 2.20.6 – 2022-11-08

### Fixed
- ?admin login failed
  [#642](https://github.com/the-djmaze/snappymail/issues/642)
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
  [#617](https://github.com/the-djmaze/snappymail/pull/617)


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
- Allow setting additional Sec-Fetch rules, as discussed by
  [#585](https://github.com/the-djmaze/snappymail/issues/585)
- Light/Dark favicon.svg
  [#643](https://github.com/the-djmaze/snappymail/issues/643)
- Allow an account name/label
  [#571](https://github.com/the-djmaze/snappymail/issues/571)

### Changed
- Moved ServiceRemoteAutoLogin to plugin/extension
- Moved ServiceExternalSso to plugin/extension
- Moved ServiceExternalLogin to plugin/extension
- Renamed ManageSieveClient to SieveClient
- New Net/Imap/Smtp/Sieve Settings object system which allows
  setting SSL options per domain and verify_certificate by default
- Update plugins to use new Net/Imap/Smtp/Sieve Settings object
- Removed message double-click to full screen
  [#638](https://github.com/the-djmaze/snappymail/issues/638)

### Fixed
- ldap-identities-plugin by @cm-schl
  [#647](https://github.com/the-djmaze/snappymail/pull/647)
- OpenSSL v3 ciphers issue
  [#641](https://github.com/the-djmaze/snappymail/issues/641)

### Nextcloud
- Style PopupsNextcloudFiles view
- Link to internal files in composer


## 2.20.6 – 2022-11-08

### Fixed
- ?admin login failed
  [#642](https://github.com/the-djmaze/snappymail/issues/642)
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
  [#617](https://github.com/the-djmaze/snappymail/pull/617)


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
