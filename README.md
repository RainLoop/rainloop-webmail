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

Copyright (c) 2020 SnappyMail

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

### Removal of old JavaScript

This fork uses downsized/simplified versions of scripts and has no support for Internet Explorer.

The result is faster and smaller download code (good for mobile networks).

Things might work in Edge 18, Firefox 50-62 and Chrome 54-68 due to one polyfill for array.flat().

* Added dev/prototype-*.js for some additional features
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
* Removed momentjs (localization still used)
* Removed opentip (use CSS)
* Removed non-community (aka Prem/Premium/License) code


RainLoop 1.14 vs SnappyMail

|js/*       	|RainLoop 	|Snappy   	|
|-----------	|--------:	|--------:	|
|admin.js    	|2.130.942	|  776.615	|
|app.js      	|4.184.455	|2.430.639	|
|boot.js     	|  671.522	|    5.285	|
|libs.js     	|  647.614	|  255.041	|
|polyfills.js	|  325.834	|        0	|
|TOTAL      	|7.960.367	|3.467.580	|

|js/min/*       	|RainLoop 	|Snappy   	|Rain gzip	|gzip     	|brotli   	|
|---------------	|--------:	|--------:	|--------:	|--------:	|--------:	|
|admin.min.js    	|  252.147	|  104.046	| 73.657	| 27.739	| 24.058	|
|app.min.js      	|  511.202	|  329.887	|140.462	| 84.844	| 68.843	|
|boot.min.js     	|   66.007	|    2.935	| 22.567	|  1.510	|  1.285	|
|libs.min.js     	|  572.545	|  149.712	|176.720	| 52.703	| 46.853	|
|polyfills.min.js	|   32.452	|        0	| 11.312	|      0	|      0	|
|TOTAL           	|1.434.353	|  586.580	|424.718	|166.796	|141.039	|
|TOTAL (no admin)	|1.182.206	|  482.534	|351.061	|139.057	|116.981	|

For a user its around 60% smaller and faster than traditional RainLoop.

### CSS changes

* Solve jQuery removed "features" with native css code.
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


|css/*       	|1.14.0   	|native   	|gzip 1.14	|gzip   	|brotli   	|
|--------------	|-------:	|-------:	|------:	|------:	|------:	|
|app.css    	| 340.334	| 186.119	| 46,959	| 28.731	| 24.189	|
|app.min.css	| 274.791	| 152.283	| 39.618	| 25.276	| 21.801	|
|boot.css    	|       	|   2.534	|       	|    837	|    668	|
|boot.min.css	|       	|   2.055	|       	|    732	|    560	|


### Squire vs CKEditor
The [Squire](https://github.com/neilj/Squire) implementation is not 100% compatible yet, but is shows the massive overhead of CKEditor.

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
