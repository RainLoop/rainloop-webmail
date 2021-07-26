<div align="center">
  <a href="https://github.com/the-djmaze/snappymail">
    <img src="https://snappymail.eu/static/img/logo-256x256.png">
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

Copyright (c) 2020 - 2021 SnappyMail
Copyright (c) 2013 - 2021 RainLoop

## Modifications

This fork of RainLoop has the following changes:

* Privacy/GDPR friendly (no: Social, Gravatar, Facebook, Google, Twitter, DropBox, OwnCloud, X-Mailer)
* Admin uses password_hash/password_verify
* Auth failed attempts written to syslog
* Added Fail2ban instructions
* ES2015
* PHP 7.3+ required
* PHP mbstring extension required
* PHP replaced pclZip with PharData and ZipArchive
* PHP yaml extension else use the old Spyc
* Added option to remove background/font colors from messages for real "dark mode"
* Removed BackwardCapability (class \RainLoop\Account)
* Removed ChangePassword (re-implemented as plugin)
* Removed OAuth support
* Removed POP3 support
* Removed background video support
* Removed Sentry (Application Monitoring and Error Tracking Software)
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

### Supported browsers

This fork uses downsized/simplified versions of scripts and has no support for Internet Explorer nor Edge Legacy.
Supported are:

* Chrome 69
* Edge 79
* Firefox 69
* Opera 56
* Safari 12


### Removal of old JavaScript

The result is faster and smaller download code (good for mobile networks).

* Added dev/prototype.js for some additional features
* boot.js without webpack overhead
* Modified Jua.js to be without jQuery
* Replaced ProgressJS with simple native dropin
* Replaced Autolinker with simple https/email detection
* Replaced ifvisible.js with simple drop-in replacement
* Replaced momentToNode with proper HTML5 <time>
* Replaced resize listeners with ResizeObserver
* Replaced bootstrap.js with native drop-in replacement
* Replaced dev/Common/ClientStorageDriver/* with Web Storage Objects polyfill
* Replaced *Ajax with *Fetch classes because we use the Fetch API, not jQuery.ajax
* Replaced knockoutjs 3.4 with a modified 3.5.1
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


RainLoop 1.15 vs SnappyMail

|js/*           	|RainLoop 	|Snappy   	|
|---------------	|--------:	|--------:	|
|admin.js        	|2.158.025	|   91.598	|
|app.js          	|4.215.733	|  454.046	|
|boot.js         	|  672.433	|    3.147	|
|libs.js         	|  647.679	|  218.139	|
|polyfills.js    	|  325.908	|        0	|
|serviceworker.js	|        0	|      285	|
|TOTAL           	|8.019.778	|  767.215	|

|js/min/*       	|RainLoop 	|Snappy   	|RL gzip	|SM gzip	|RL brotli	|SM brotli	|
|---------------	|--------:	|--------:	|------:	|------:	|--------:	|--------:	|
|admin.min.js    	|  255.514	|   47.631	| 73.899	| 14.320	| 60.674  	| 12.796	|
|app.min.js      	|  516.000	|  233.722	|140.430	| 68.676	|110.657  	| 58.037	|
|boot.min.js     	|   66.456	|    1.751	| 22.553	|  1.025	| 20.043  	|    858	|
|libs.min.js     	|  574.626	|  106.273	|177.280	| 38.502	|151.855  	| 34.428	|
|polyfills.min.js	|   32.608	|        0	| 11.315	|      0	| 10.072  	|      0	|
|TOTAL           	|1.445.204	|  389.377	|425.477	|122.523	|353.301  	|106.119	|
|TOTAL (no admin)	|1.189.690	|  341.746	|351.061	|108.203	|292.627  	| 93.323	|

For a user its around 69% smaller and faster than traditional RainLoop.

|OpenPGP        	|RainLoop 	|Snappy   	|RL gzip	|SM gzip	|RL brotli	|SM brotli	|
|---------------	|--------:	|--------:	|------:	|------:	|--------:	|--------:	|
|openpgp.min.js 	|  330.742	|  293.972	|102.388	| 93.030	| 84.241  	| 77.142	|
|openpgp.worker 	|    1.499	|    1.125	|    824	|    567	|    695 	|    467	|

### CSS changes

* Solve jQuery removed "features" with native css code
* Themes work in mobile mode
* Bugfix invalid/conflicting css rules
* Use flexbox
* Split app.css to have seperate admin.css
* Remove oldschool 'float'
* Remove unused css
* Removed html.no-css
* Removed dev/Styles/Cmd.less
* Removed dev/Styles/Scroll.less
* Removed Internet Explorer from normalize.css
* Removed node_modules/opentip/css/opentip.css
* Removed node_modules/pikaday/css/pikaday.css
* Removed vendors/bootstrap/less/breadcrumbs.less
* Removed vendors/bootstrap/less/navbar.less
* Removed vendors/bootstrap/less/popovers.less
* Removed vendors/bootstrap/less/progress-bars.less
* Removed vendors/bootstrap/less/scaffolding.less
* Removed vendors/bootstrap/less/sprites.less
* Removed vendors/bootstrap/less/tooltip.less
* Removed vendors/jquery-nanoscroller/nanoscroller.css
* Removed vendors/jquery-letterfx/jquery-letterfx.min.css
* Removed vendors/Progress.js/minified/progressjs.min.css
* Removed gulp-autoprefixer


|css/*       	|RainLoop	|Snappy   	|RL gzip	|SM gzip	|SM brotli	|
|------------	|-------:	|------:	|------:	|------:	|--------:	|
|app.css     	| 340.334	| 98.323	| 46,959	| 17.821	| 15.355	|
|app.min.css 	| 274.791	| 80.298	| 39.618	| 15.963	| 14.045	|
|boot.css    	|       	|  1.326	|       	|    664	|    545	|
|boot.min.css	|       	|  1.071	|       	|    590	|    474	|
|admin.css    	|       	| 40.369	|       	|  8.467	|  7.389	|
|admin.min.css	|       	| 31.901	|       	|  7.430	|  6.599	|


### Squire vs CKEditor
The [Squire](https://github.com/neilj/Squire) implementation is not 100% compatible yet, but it shows the massive overhead of CKEditor.

Still TODO:

* support for tables (really needed?!?)
* support BIDI (really needed?!?)

|       	| normal	| min    	| gzip  	| min gzip	|
|--------	|-------:	|-------:	|------:	|--------:	|
|squire  	| 128.826	|  47.074	| 33.671	|   15.596	|
|ckeditor	|       ?	| 520.035	|      ?	|  155.916	|

CKEditor including the 7 asset requests (css,language,plugins,icons) is 633.46 KB / 180.47 KB (gzip).

To use the old CKEditor, you must install the plugin.
