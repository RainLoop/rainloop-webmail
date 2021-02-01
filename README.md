<div align="center">
  <a href="https://github.com/the-djmaze/snappymail">
    <img width="200" heigth="200" src="https://snappymail.eu/static/img/logo-256x256.png">
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
* PHP replaced pclZip with ZipArchive
* PHP yaml extension else use the old Spyc
* Removed BackwardCapability (class \RainLoop\Account)
* Removed ChangePassword (plugins won't work)
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

### Removal of old JavaScript

This fork uses downsized/simplified versions of scripts and has no support for Internet Explorer.

The result is faster and smaller download code (good for mobile networks).

Things might work in Edge 18, Firefox 50-62 and Chrome 54-68 due to one polyfill for array.flat().

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
* Replaced simplestatemanager with @media
* Replaced inputosaurus to native
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
|admin.js        	|2.158.025	|  119.197	|
|app.js          	|4.215.733	|  527.415	|
|boot.js         	|  672.433	|    4.842	|
|libs.js         	|  647.679	|  232.283	|
|polyfills.js    	|  325.908	|        0	|
|serviceworker.js	|        0	|      285	|
|TOTAL           	|8.019.778	|  887.214	|

|js/min/*       	|RainLoop 	|Snappy   	|RL gzip	|SM gzip	|RL brotli	|SM brotli	|
|---------------	|--------:	|--------:	|------:	|------:	|--------:	|--------:	|
|admin.min.js    	|  255.514	|   61.165	| 73.899	| 17.419	| 60.674 	| 15.447	|
|app.min.js      	|  516.000	|  256.629	|140.430	| 73.667	|110.657 	| 61.826	|
|boot.min.js     	|   66.456	|    2.630	| 22.553	|  1.375	| 20.043 	|  1.189	|
|libs.min.js     	|  574.626	|  128.352	|177.280	| 46.615	|151.855 	| 41.437	|
|polyfills.min.js	|   32.608	|        0	| 11.315	|      0	| 10.072 	|      0	|
|TOTAL           	|1.445.204	|  448.776	|425.477	|139.076	|353.301 	|119.899	|
|TOTAL (no admin)	|1.189.690	|  387.611	|351.061	|121.657	|292.627 	|104.452	|

For a user its around 65% smaller and faster than traditional RainLoop.

### CSS changes

* Solve jQuery removed "features" with native css code
* Cleanup unused css
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


|css/*       	|RainLoop	|Snappy   	|RL gzip	|SM gzip	|SM brotli	|
|------------	|-------:	|-------:	|------:	|------:	|--------:	|
|app.css     	| 340.334	| 167.876	| 46,959	| 26.292	| 22.129	|
|app.min.css 	| 274.791	| 136.861	| 39.618	| 23.066	| 19.978	|
|boot.css    	|       	|   2.534	|       	|    837	|    668	|
|boot.min.css	|       	|   2.055	|       	|    732	|    560	|


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

To use the old CKEditor, you must enable it in /data/\_data\_/\_default\_/configs/application.ini
in the [labs] section add/edit: `use_ck_html_editor = On`

### PHP73 branch

There's a RainLoop 1.14.0 branch with only the PHP 7.3 changes at
https://github.com/the-djmaze/snappymail/tree/php73
