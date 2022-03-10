<div align="center">
  <a href="https://github.com/the-djmaze/snappymail">
    <img src="https://snappymail.eu/static/img/logo-256x256-white.png">
  </a>
  <br>
  <h1>SnappyMail</h1>
  <br>
  <p>
    Simple, modern, lightweight &amp; fast web-based email client.
  </p>
  <p>
    The drastically upgraded &amp; secured fork of <a href="https://github.com/RainLoop/rainloop-webmail">RainLoop Webmail Community edition</a>.
  </p>
  <p>
    We thank the RainLoop Team for making a great PHP 5 product that was good in the past.
  </p>
  <p>
    Up to date system requirements, snappy performance, simple installation and upgrade, no database required
    - all these make SnappyMail a good choice.
  </p>
  <h2></h2>
  <br>
</div>

For more information about the product, check [snappymail.eu](https://snappymail.eu/).

Information about installing the product, check the [wiki page](https://github.com/the-djmaze/snappymail/wiki/Installation-instructions).

And don't forget to read the [RainLoop documentation](https://www.rainloop.net/docs/).

## License

**SnappyMail** is released under
**GNU AFFERO GENERAL PUBLIC LICENSE Version 3 (AGPL)**.
http://www.gnu.org/licenses/agpl-3.0.html

Copyright (c) 2020 - 2022 SnappyMail
Copyright (c) 2013 - 2021 RainLoop

## Modifications

This fork of RainLoop has the following changes:

* Privacy/GDPR friendly (no: Social, Gravatar, Facebook, Google, Twitter, DropBox, OwnCloud, X-Mailer)
* Admin uses password_hash/password_verify
* Auth failed attempts written to syslog
* Added Fail2ban instructions
* ES2018
* PHP 7.3+ required
* PHP mbstring extension required
* PHP replaced pclZip with PharData and ZipArchive
* Dark mode
* Added option to remove background/font colors from messages for real "dark mode"
* Removed BackwardCapability (class \RainLoop\Account)
* Removed ChangePassword (re-implemented as plugin)
* Removed POP3 support
* Removed background video support
* Removed Sentry (Application Monitoring and Error Tracking Software)
* Removed Spyc yaml
* Replaced gulp-uglify with gulp-terser
* CRLF => LF line endings
* Embed boot.js and boot.css into index.html
* Ongoing removal of old JavaScript code (things are native these days)
* Added modified [Squire](https://github.com/neilj/Squire) HTML editor as replacement for CKEditor
* Split Admin specific JavaScript code from User code
* JSON reviver
* Better memory garbage collection management
* Added serviceworker for Notifications
* Added advanced Sieve scripts editor
* Slimmed down language files
* Replaced webpack with rollup
* No user-agent detection (use device width)
* Added support to load plugins as .phar
* Replaced old Sabre library
* AddressBook Contacts support MySQL/MariaDB utf8mb4
* Prevent Google FLoC
* Added [Fetch Metadata Request Headers](https://www.w3.org/TR/fetch-metadata/) checks
* Reduced excessive DOM size
* Support [Kolab groupware](https://kolab.org/)
* Support IMAP RFC 2971 ID extension
* Support IMAP RFC 5258 LIST-EXTENDED
* Support IMAP RFC 5464 METADATA
* Support IMAP RFC 5819 LIST-STATUS
* Support IMAP RFC 7628 SASL OAUTHBEARER aka XOAUTH2
* Support IMAP4rev2 RFC 9051
* Support Sodium and OpenSSL for encryption
* Much better PGP support


### Supported browsers

This fork uses downsized/simplified versions of scripts and has no support for Internet Explorer nor Edge Legacy.
Supported are:

* Chrome 69+
* Edge 79+
* Firefox 69+
* Opera 56+
* Safari 12+


### Removal of old JavaScript

The result is faster and smaller download code (good for mobile networks).

* Added dev/prototype.js for some additional features
* boot.js without webpack overhead
* Modified Jua.js to be without jQuery
* Replaced Autolinker with simple https/email detection
* Replaced ifvisible.js with simple drop-in replacement
* Replaced momentToNode with proper HTML5 `<time>`
* Replaced resize listeners with ResizeObserver
* Replaced bootstrap.js with native drop-in replacement
* Replaced dev/Common/ClientStorageDriver/* with Web Storage Objects polyfill
* Replaced *Ajax with *Fetch classes because we use the Fetch API, not jQuery.ajax
* Replaced [knockoutjs](https://github.com/knockout/knockout) 3.4 with a modified 3.5.1
* Replaced knockout-sortable with native HTML5 drag&drop
* Replaced simplestatemanager with CSS @media
* Replaced inputosaurus with own code
* Replaced keymaster with own shortcuts handler
* Removed pikaday
* Removed underscore
* Removed polyfills
* Removed Modernizr
* Removed nanoscroll
* Removed lightgallery
* Removed jQuery
* Removed jquery-ui
* Removed jquery-scrollstop
* Removed jquery-mousewheel
* Removed matchmedia-polyfill
* Removed momentjs (use Intl)
* Removed opentip (use CSS)
* Removed non-community (aka Prem/Premium/License) code
* Removed ProgressJS


RainLoop 1.15 vs SnappyMail

|js/*           	|RainLoop 	|Snappy   	|
|---------------	|--------:	|--------:	|
|admin.js        	|2.158.025	|   79.040	|
|app.js          	|4.215.733	|  431.641	|
|boot.js         	|  672.433	|    1.996	|
|libs.js         	|  647.679	|  200.131	|
|polyfills.js    	|  325.908	|        0	|
|serviceworker.js	|        0	|      285	|
|TOTAL           	|8.019.778	|  713.093	|

|js/min/*       	|RainLoop 	|Snappy   	|RL gzip	|SM gzip	|RL brotli	|SM brotli	|
|---------------	|--------:	|--------:	|------:	|------:	|--------:	|--------:	|
|admin.min.js    	|  255.514	|   39.272	| 73.899	| 13.076	| 60.674  	| 11.727	|
|app.min.js      	|  516.000	|  207.038	|140.430	| 66.265	|110.657  	| 56.788	|
|boot.min.js     	|   66.456	|    1.230	| 22.553	|    768	| 20.043  	|    619	|
|libs.min.js     	|  574.626	|   96.201	|177.280	| 35.522	|151.855  	| 31.746	|
|polyfills.min.js	|   32.608	|        0	| 11.315	|      0	| 10.072  	|      0	|
|TOTAL           	|1.445.204	|  343.741	|425.477	|115.631	|353.301  	|100.880	|
|TOTAL (no admin)	|1.189.690	|  304.469	|351.061	|102.555	|292.627  	| 89.153	|

For a user its around 69% smaller and faster than traditional RainLoop.

### CSS changes

* Solve jQuery removed "features" with native css code
* Themes work in mobile mode
* Bugfix invalid/conflicting css rules
* Use flexbox
* Split app.css to have separate admin.css
* Remove oldschool 'float'
* Remove unused css
* Removed html.no-css
* Removed dev/Styles/Cmd.less
* Removed dev/Styles/Scroll.less
* Removed Internet Explorer from normalize.css
* Removed node_modules/opentip/css/opentip.css
* Removed node_modules/pikaday/css/pikaday.css
* Removed unused vendors/bootstrap/less/*
* Removed vendors/jquery-nanoscroller/nanoscroller.css
* Removed vendors/jquery-letterfx/jquery-letterfx.min.css
* Removed vendors/Progress.js/minified/progressjs.min.css
* Removed gulp-autoprefixer


|css/*       	|RainLoop	|Snappy   	|RL gzip	|SM gzip	|SM brotli	|
|------------	|-------:	|------:	|------:	|------:	|--------:	|
|app.css     	| 340.334	| 80.943	| 46.959	| 16.768	| 14.427	|
|app.min.css 	| 274.791	| 65.152	| 39.618	| 14.864	| 13.097	|
|boot.css    	|       	|  1.326	|       	|    664	|    545	|
|boot.min.css	|       	|  1.071	|       	|    590	|    474	|
|admin.css    	|       	| 29.977	|       	|  6.795	|  5.900	|
|admin.min.css	|       	| 24.101	|       	|  6.167	|  5.421	|

### PGP
RainLoop uses the old OpenPGP.js v2
SnappyMail v2.12 uses OpenPGP.js v5, GnuPG and Mailvelope.
SnappyMail is able to use and generate ECDSA and EDDSA keys, where RainLoop does not.

Since SnappyMail tries to achieve the best mobile experience, it forked OpenPGP.js to strip it down.
* remove all unused Node.js
* remove all old browsers support
See https://github.com/the-djmaze/openpgpjs for development

|OpenPGP        	|RainLoop 	|Snappy   	|RL gzip	|SM gzip	|RL brotli	|SM brotli	|
|---------------	|--------:	|--------:	|------:	|-------:	|--------:	|--------:	|
|openpgp.min.js 	|  330.742	|  539.642	|102.388	| 167.112	| 84.241  	|  137.447	|
|openpgp.worker 	|    1.499	|         	|    824	|        	|    695 	|        	|


### Squire vs CKEditor
The [Squire](https://github.com/neilj/Squire) implementation is not 100% compatible yet, but it shows the massive overhead of CKEditor.

Still TODO:

* support for tables (really needed?!?)
* support BIDI (really needed?!?)

|       	| normal	| min    	| gzip  	| min gzip	|
|--------	|-------:	|-------:	|------:	|--------:	|
|squire  	| 122.321	|  41.906	| 31.867	|   14.330	|
|ckeditor	|       ?	| 520.035	|      ?	|  155.916	|

CKEditor including the 7 asset requests (css,language,plugins,icons) is 633.46 KB / 180.47 KB (gzip).

To use the old CKEditor, you must install the plugin.
