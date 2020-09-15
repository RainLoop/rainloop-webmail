<div align="center">
  <a href="https://github.com/RainLoop/rainloop-webmail">
    <img width="200" heigth="200" src="https://www.rainloop.net/static/img/logo-256x256-tiny.png">
  </a>
  <br>
  <h1>RainLoop Webmail</h1>
  <br>
  <p>
    Simple, modern &amp; fast web-based email client.
  </p>
  <p>
    Modest system requirements, decent performance, simple installation and upgrade, no database required
    - all these make RainLoop Webmail a perfect choice for your email solution.
  </p>
  <h2></h2>
  <br>
</div>

For more information about the product, check [rainloop.net](https://www.rainloop.net/).

Information about installing the product, check the [wiki page](https://github.com/the-djmaze/rainloop-webmail/wiki/Installation-instructions).

And don't forget to read the [official documentation](https://www.rainloop.net/docs/).

## License

**RainLoop Webmail (Community edition)** is released under
**GNU AFFERO GENERAL PUBLIC LICENSE Version 3 (AGPL)**.
http://www.gnu.org/licenses/agpl-3.0.html

Copyright (c) 2019 Rainloop Team

## Modifications

This fork has the following changes:

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

### Removal of old JavaScript

This fork uses downsized/simplified versions of scripts and has no support for Internet Explorer.

The result is faster and smaller download code (good for mobile networks).

Things might work in Edge 18, Firefox 50-62 and Chrome 54-68 due to one polyfill for array.flat().

* Added dev/prototype-*.js for some additional features
* boot.js without webpack overhead
* Replaced jQuery with jQuery.slim
* Replaced ProgressJS with simple native dropin
* Replaced Autolinker with simple https/email detection
* Replaced ifvisible.js with simple drop-in replacement
* Replaced momentToNode with proper HTML5 <time>
* Replaced resize listeners with ResizeObserver
* Replaced bootstrap.js with native drop-in replacement
* Replaced dev/Common/ClientStorageDriver/* with Web Storage Objects polyfill
* Removed pikaday
* Removed underscore
* Removed polyfills
* Removed Modernizr
* Removed nanoscroll
* Removed jquery-scrollstop
* Removed jquery-mousewheel
* Removed matchmedia-polyfill
* Removed momentjs (localization still used)
* Removed opentip (use CSS)
* Removed non-community (aka Prem/Premium/License) code
* Modified Jua.js to be without jQuery
* Replaced *Ajax with *Fetch classes because we use the Fetch API, not jQuery.ajax

|js/*       	|1.14.0 	|native 	|
|-----------	|--------:	|--------:	|
|admin.js    	|2.130.942	|  935.611	|
|app.js      	|4.184.455	|2.517.449	|
|boot.js     	|  671.522	|    5.777	|
|libs.js     	|  647.614	|  327.257	|
|polyfills.js	|  325.834	|        0	|
|TOTAL      	|7.960.367	|3.786.094	|

|js/min/*       	|1.14.0   	|native   	|gzip 1.14	|gzip   	|brotli   	|
|---------------	|--------:	|--------:	|--------:	|--------:	|--------:	|
|admin.min.js    	|  252.147	|  128.146	| 73.657	| 37.448	| 32.137	|
|app.min.js      	|  511.202	|  344.299	|140.462	| 90.265	| 73.006	|
|boot.min.js     	|   66.007	|    3.101	| 22.567	|  1.576	|  1.346	|
|libs.min.js     	|  572.545	|  304.000	|176.720	| 94.870	| 83.524	|
|polyfills.min.js	|   32.452	|        0	| 11.312	|      0	|      0	|
|TOTAL          	|1.434.353	|  779.546	|424.718	|224.159	|190.013	|

654.807 bytes (200.559 gzip) is not much, but it feels faster.

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
|app.css    	| 340.334	| 253.691	| 46,959	| 36.574	| 30.777	|
|app.min.css	| 274.791	| 207.298	| 39.618	| 32.001	| 27.155	|
|boot.css    	|       	|   2.538	|       	|    837	|    668	|
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

Enable it in /data/\_data\_/\_default\_/configs/application.ini in the [labs] section add/edit: `use_squire_html_editor = On`

### PHP73 branch

There's a branch with only the PHP 7.3 changes at
https://github.com/the-djmaze/rainloop-webmail/tree/php73
