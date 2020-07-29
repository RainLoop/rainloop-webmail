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

For more information about the product, check [rainloop.net](http://www.rainloop.net/).

Information about installing the product, check the [documentation page](http://www.rainloop.net/docs/installation/).

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
* ES2015 (removed polyfills and Modernizr)
* PHP 7.3+ required
* PHP mbstring extension required
* PHP replaced pclZip with ZipArchive
* PHP yaml extension else use the old Spyc
* Removed BackwardCapability (class \RainLoop\Account)
* Removed ChangePassword (plugins won't work)
* Removed JS nanoscroll, jquery-scrollstop, jquery-mousewheel, matchmedia-polyfill
* Removed OAuth support
* Removed POP3 support
* Removed background video support
* Removed Sentry (Application Monitoring and Error Tracking Software)
* Replaced gulp-uglify with gulp-terser
* CRLF => LF line endings
* Converted underscore.js to native code
* Ongoing removal of old JavaScript code (things are native these days)

### Removal of old JavaScript

This fork uses jQuery.slim, downsized/simplified versions of scripts and has no support for Internet Explorer.

The result is faster and smaller download code (good for mobile networks).

Things might work in Edge 15-18, Firefox 47-62 and Chrome 54-68 due to one polyfill for array.flat().

|js/*       	|1.14.0   	|native   	|
|-----------	|--------:	|--------:	|
|admin.js    	|2.130.942	|1.329.869	|
|app.js      	|4.184.455	|3.092.391	|
|boot.js     	|  671.522	|  108.460	|
|libs.js     	|  647.614	|  507.015	|
|polyfills.js	|  325.834	|        0	|
|TOTAL js   	|7.960.367	|5.037.853	|

|js/min/*       	|1.14.0   	|native   	|
|---------------	|--------:	|--------:	|
|admin.min.js    	|  252.147	|  173.226	|
|app.min.js      	|  511.202	|  405.035	|
|boot.min.js     	|   66.007	|   13.240	|
|libs.min.js     	|  572.545	|  464.161	|
|polyfills.min.js	|   32.452	|        0	|
|TOTAL js/min   	|1.434.353	|1.055.662	|

378.691 bytes is not much, but it feels faster.

### PHP73 branch

There's a branch with only the PHP 7.3 changes at
https://github.com/the-djmaze/rainloop-webmail/tree/php73
