<div align="center">
  <a href="https://github.com/the-djmaze/snappymail">
    <img src="https://snappymail.eu/static/img/logo-256x256-white.png">
  </a>
  <br>
  <h1>SnappyMail</h1>
  <br>

[![github-actions](https://github.com/the-djmaze/snappymail/actions/workflows/docker.yml/badge.svg)](https://github.com/the-djmaze/snappymail/actions/workflows/docker.yml)
[![docker-image-size](https://img.shields.io/docker/image-size/djmaze/snappymail/latest)](https://hub.docker.com/r/djmaze/snappymail/tags)

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

And don't forget to read the whole [Wiki](https://github.com/the-djmaze/snappymail/wiki).

## License

**SnappyMail** is released under
**GNU AFFERO GENERAL PUBLIC LICENSE Version 3 (AGPL)**.
http://www.gnu.org/licenses/agpl-3.0.html

Copyright (c) 2020 - 2024 SnappyMail
Copyright (c) 2013 - 2022 RainLoop

## Modifications

This fork of RainLoop has the following changes:

* Privacy/GDPR friendly (no: Social, Gravatar, Facebook, Google, Twitter, DropBox, X-Mailer)
* Admin uses password_hash/password_verify
* Auth failed attempts written to syslog
* Added Fail2ban instructions
* ES2020
* PHP 7.4+ required
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
* Removed OwnCloud
* Replaced gulp-uglify with gulp-terser
* CRLF => LF line endings
* Embed boot.js and boot.css into index.html
* Removal of old JavaScript code (things are native these days)
* Added modified [Squire](https://github.com/the-djmaze/Squire/tree/snappymail) HTML editor as replacement for CKEditor
* Updated [Sabre/VObject](https://github.com/sabre-io/vobject)
* Split Admin specific JavaScript code from User code
* Split Sieve specific JavaScript code from User code
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
* Added [Fetch Metadata Request Headers](https://www.w3.org/TR/fetch-metadata/) checks
* Reduced excessive DOM size
* Support [Kolab groupware](https://kolab.org/)
* Support many more [IMAP RFC's](https://snappymail.eu/comparison#IMAP)
* Support Sodium and OpenSSL for encryption
* Much better PGP support


### Supported browsers

This fork uses downsized/simplified versions of scripts and has no support for Internet Explorer nor Edge Legacy.
Supported are:

* Chrome 80+
* Edge 80+
* Firefox 78+
* Opera 67+
* Safari 13.1+


### Removal of old JavaScript

The result is faster and smaller download code (good for mobile networks).

* Added dev/prototype.js for some additional features
* Modified Jua.js to be without jQuery
* Replaced Autolinker with simple https/email detection
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
* Replaced OpenPGP.js v2 with OpenPGP.js v5
* Removed ifvisible.js
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


RainLoop 1.17 vs SnappyMail

|js/*           	|RainLoop 	|Snappy   	|
|---------------	|--------:	|--------:	|
|admin.js        	|2.170.153	|   84.925	|
|app.js          	|4.207.787	|  447.263	|
|boot.js         	|  868.735	|    4.343	|
|libs.js         	|  658.812	|  233.728	|
|sieve.js         	|        0	|   91.418	|
|polyfills.js    	|  334.608	|        0	|
|serviceworker.js	|        0	|      285	|
|TOTAL           	|8.240.095	|  861.962	|

|js/min/*       	|RainLoop 	|Snappy   	|RL gzip	|SM gzip	|RL brotli	|SM brotli	|
|---------------	|--------:	|--------:	|------:	|------:	|--------:	|--------:	|
|admin.min.js    	|  256.831	|   41.719	| 73.606	| 14.022	| 60.877  	| 12.567	|
|app.min.js      	|  515.367	|  202.101	|139.456	| 68.505	|110.485  	| 58.481	|
|boot.min.js     	|   84.659	|    2.231	| 26.998	|  1.271	| 23.643  	|  1.067	|
|libs.min.js     	|  584.772	|  110.646	|180.901	| 39.518	|155.182  	| 35.207	|
|sieve.min.js     	|        0	|   45.504	|      0	| 11.131	|      0  	|  9.917	|
|polyfills.min.js	|   32.837	|        0	| 11.406	|      0	| 10.175  	|      0	|
|TOTAL user      	|1.217.635	|  314.978	|358.761	|109.294	|299.485  	| 94.755	|
|TOTAL user+sieve	|1.217.635	|  360.482	|358.761	|120.425	|299.485  	|104.672	|
|TOTAL admin     	|  959.099	|  154.596	|292.911	| 54.811	|249.877  	| 48.841	|

For a user it is around 66% smaller and faster than traditional RainLoop.

### CSS changes

* Solve jQuery removed "features" with native css code
* Themes work in mobile mode
* Bugfix invalid/conflicting css rules
* Use flexbox
* Use border-box
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
|app.css     	| 340.331	| 85.073	| 46.946	| 17.792	| 15.210	|
|app.min.css 	| 274.947	| 68.272	| 39.647	| 15.615	| 13.636	|
|boot.css    	|       	|  1.326	|       	|    664	|    545	|
|boot.min.css	|       	|  1.071	|       	|    590	|    474	|
|admin.css    	|       	| 30.880	|       	|  7.045	|  6.127	|
|admin.min.css	|       	| 24.959	|       	|  6.368	|  5.615	|

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
|openpgp.min.js 	|  330.742	|  546.165	|102.388	| 169.207	| 84.241  	|  138.688	|
|openpgp.worker 	|    1.499	|         	|    824	|        	|    695 	|        	|


### Squire vs CKEditor
The [Squire](https://github.com/neilj/Squire) implementation is not 100% compatible yet, but it shows the massive overhead of CKEditor.

Still TODO:

* support for tables (really needed?!?)

|       	| normal	| min    	| gzip  	| min gzip	|
|--------	|-------:	|-------:	|------:	|--------:	|
|squire  	| 122.321	|  41.906	| 31.867	|   14.330	|
|ckeditor	|       ?	| 520.035	|      ?	|  155.916	|

CKEditor including the 7 asset requests (css,language,plugins,icons) is 633.46 KB / 180.47 KB (gzip).
