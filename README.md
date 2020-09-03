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
* Ongoing removal of old JavaScript code (things are native these days)

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

|js/*       	|1.14.0 	|native 	|
|-----------	|--------:	|--------:	|
|admin.js    	|2.130.942	|  958.397	|
|app.js      	|4.184.455	|2.586.232	|
|boot.js     	|  671.522	|    6.884	|
|libs.js     	|  647.614	|  312.269	|
|polyfills.js	|  325.834	|        0	|
|TOTAL      	|7.960.367	|3.863.782	|

|js/min/*       	|1.14.0   	|native   	|gzip 1.14	|gzip   	|brotli   	|
|---------------	|--------:	|--------:	|--------:	|--------:	|--------:	|
|admin.min.js    	|  252.147	|  130.128	| 73.657	| 37.783	| 32.395	|
|app.min.js      	|  511.202	|  350.575	|140.462	| 92.070	| 73.949	|
|boot.min.js     	|   66.007	|    4.141	| 22.567	|  1.869	|  1.557	|
|libs.min.js     	|  572.545	|  295.776	|176.720	| 91.524	| 80.746	|
|polyfills.min.js	|   32.452	|        0	| 11.312	|      0	|      0	|
|TOTAL          	|1.434.353	|  780.620	|424.718	|223.246	|188.642	|

653.733 bytes (201.472 gzip) is not much, but it feels faster.

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
|app.css    	| 340.334	| 255.627	| 46,959	| 36.929	| 31.015	|
|app.min.css	| 274.791	| 208.711	| 39,618	| 32.226	| 27.364	|


### PHP73 branch

There's a branch with only the PHP 7.3 changes at
https://github.com/the-djmaze/rainloop-webmail/tree/php73
