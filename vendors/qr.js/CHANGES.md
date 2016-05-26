## Version 1.1.4, 2015.11.11

* [#2](https://github.com/neocotic/qr.js/issues/2): Fix padding issues
* [#35](https://github.com/neocotic/qr.js/pull/35): Make the QR-code center-aligned
* [#38](https://github.com/neocotic/qr.js/pull/38): Update node-canvas dependency version to support Node.js v4 and above

## Version 1.1.3, 2014.09.01

* [#23](https://github.com/neocotic/qr.js/issues/23): Revert back to [GPL License][]

## Version 1.1.2, 2014.04.27

* [#20](https://github.com/neocotic/qr.js/issues/20): Fix "too many open files" bug

## Version 1.1.1, 2013.12.03

* Fix bug with IIFE

## Version 1.1.0, 2013.12.02

* [#9](https://github.com/neocotic/qr.js/issues/9): Fix RequireJS support
* [#13](https://github.com/neocotic/qr.js/issues/13): Remove [Ender][] support
* [#14](https://github.com/neocotic/qr.js/issues/14): Improve code formatting and style
* [#16](https://github.com/neocotic/qr.js/issues/16): Support different MIME types for `toDataURL` and other related functions
* [#17](https://github.com/neocotic/qr.js/issues/17): Remove unnecessary callback arguments from synchronous functions
* [#17](https://github.com/neocotic/qr.js/issues/17): Make `save` fully asynchronous
* [#17](https://github.com/neocotic/qr.js/issues/17): Add `saveSync` for synchronous saving
* [#18](https://github.com/neocotic/qr.js/issues/18): Add [Grunt][] build system
* [#18](https://github.com/neocotic/qr.js/issues/18): Generate source map as part of build
* [#18](https://github.com/neocotic/qr.js/issues/18): Improve developer documentation
* [#19](https://github.com/neocotic/qr.js/issues/19): Add support for [Bower][]
* Many small fixes and tweaks

## Version 1.0.3, 2011.12.19

* [#3](https://github.com/neocotic/qr.js/issues/3): Rename `QRCode` to `qr`
* [#3](https://github.com/neocotic/qr.js/issues/3): Remove all deprecated methods
* [#4](https://github.com/neocotic/qr.js/issues/4): Reformat code and add additional, along with some original, code comments
* [#6](https://github.com/neocotic/qr.js/issues/6): Add support for [Node.js][], [CommonJS][] and [Ender][]
* [#6](https://github.com/neocotic/qr.js/issues/6): Add optional `callback` functionality to API methods
* [#7](https://github.com/neocotic/qr.js/issues/7): Allow `data` arguments to be an object or string value
* [#8](https://github.com/neocotic/qr.js/issues/8): Add `VERSION` property to the API
* [#8](https://github.com/neocotic/qr.js/issues/8): Add `toDataURL`, `save` and `noConflict` methods to the API
* Now distributed under the [MIT License][]

## Version 1.0.2, 2011.08.31

* [#1](https://github.com/neocotic/qr.js/issues/1): Deprecate `generateCanvas` and `generateImage` and replaced with `canvas` and `image` respectively

## Version 1.0.1, 2011.08.12

* Allow customisation of colours used when rendering

[bower]: http://bower.io
[commonjs]: http://commonjs.org
[ender]: http://ender.no.de
[gpl license]: http://www.gnu.org/licenses/
[grunt]: http://gruntjs.com
[mit license]: http://en.wikipedia.org/wiki/MIT_License
[node.js]: http://nodejs.org
