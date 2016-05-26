                    __
       __   _ __   /\_\    ____
     /'__`\/\`'__\ \/\ \  /',__\
    /\ \L\ \ \ \/__ \ \ \/\__, `\
    \ \___, \ \_\\_\_\ \ \/\____/
     \/___/\ \/_//_/\ \_\ \/___/
          \ \_\    \ \____/
           \/_/     \/___/

[qr.js][] is a pure JavaScript library for [QR code][] generation using canvas.

* [Install](#install)
* [Examples](#examples)
* [API](#api)
* [Canvas Support](#canvas-support)
* [Bugs](#bugs)
* [Questions](#questions)

## Install

Install using the package manager for your desired environment(s):

``` bash
# for node.js:
$ npm install qr-js
# OR; for the browser:
$ bower install qr-js
```

## Examples

In the browser:

``` html
<html>
  <body>
    <canvas id="qr-code"></canvas>
    <script src="/path/to/qr.min.js"></script>
    <script>
      qr.canvas({
        canvas: document.getElementById('qr-code'),
        value: 'http://neocotic.com/qr.js'
      });
    </script>
  </body>
</html>
```

In [node.js][]:

``` javascript
var qr = require('qr-js');

qr.saveSync('http://neocotic.com/qr.js', 'qrcode.png');
```

## API

### Standard Data

The following configuration data options are recognised by all of the core API methods (all of
which are optional):

<table>
  <tr>
    <th>Property</th>
    <th>Description</th>
    <th>Default</th>
  </tr>
  <tr>
    <td>background</td>
    <td>Background colour to be used</td>
    <td><code>#fff</code></td>
  </tr>
  <tr>
    <td>canvas</td>
    <td><code>&lt;canvas&gt;</code> element in which the QR code should be rendered</td>
    <td>Creates a new element</td>
  </tr>
  <tr>
    <td>foreground</td>
    <td>Foreground colour to be used</td>
    <td><code>#000</code></td>
  </tr>
  <tr>
    <td>level</td>
    <td>ECC (error correction capacity) level to be applied</td>
    <td><code>L</code></td>
  </tr>
  <tr>
    <td>size</td>
    <td>Module size of the generated QR code</td>
    <td><code>4</code></td>
  </tr>
  <tr>
    <td>value</td>
    <td>Value to be encoded in the generated QR code</td>
    <td><code>""</code></td>
  </tr>
</table>

### `canvas([data|value])`
Renders a QR code in an HTML5 `<canvas>` element for a given value.

``` javascript
// Render the QR code on a newly created canvas element
var canvas = qr.canvas('http://neocotic.com/qr.js');
// Re-render the QR code on an existing element
qr.canvas({
  canvas: canvas,
  value: 'https://github.com/neocotic/qr.js'
});
```

### `image([data|value])`
Renders a QR code in an HTML `<img>` element for a given value.

``` javascript
// Render the QR code on a newly created img element
var img = qr.image('http://neocotic.com/qr.js');
// Re-render the QR code on an existing element
qr.image({
  image: img,
  value: 'https://github.com/neocotic/qr.js'
});
```

#### Additional Data
As well as the [Standard Data](#standard-data), this method also accepts the following additional
data options:

<table>
  <tr>
    <th>Property</th>
    <th>Description</th>
    <th>Default</th>
  </tr>
  <tr>
    <td>image</td>
    <td><code>&lt;img&gt;</code> element in which the QR code should be rendered</td>
    <td>Creates a new element</td>
  </tr>
  <tr>
    <td>mime</td>
    <td>MIME type to process the QR code image</td>
    <td><code>image/png</code></td>
  </tr>
</table>

### `save([data|value][, path], callback)`
Saves a QR code, which has been rendered for a given value, to the user's file system.

``` javascript
// Render a QR code to a PNG file
qr.save('http://neocotic.com/qr.js', 'qr.png', function(err) {
  if (err) throw err;

  // ...
});
// Render a QR code to a JPEG file
qr.save({
  mime: 'image/jpeg',
  path: 'qr.jpg',
  value: 'https://github.com/neocotic/qr.js'
}, function(err) {
  if (err) throw err;

  // ...
});
```

**Note:** Currently, in the browser, this just does it's best to force a download prompt. We will
try to improve on this in the future.

#### Additional Data
As well as the [Standard Data](#standard-data), this method also accepts the following additional
data options:

<table>
  <tr>
    <th>Property</th>
    <th>Description</th>
    <th>Default</th>
  </tr>
  <tr>
    <td>mime</td>
    <td>MIME type to process the QR code image</td>
    <td><code>image/png</code></td>
  </tr>
  <tr>
    <td>path</td>
    <td>Path to which the QR code should be saved<br><strong>Ignored in browsers</strong></td>
    <td><em>Required if not specified as an argument</em></td>
  </tr>
</table>

### `saveSync([data|value][, path])`
Synchronous [`save(3)`](#savedatavalue-path-callback).

### `toDataURL([data|value])`
Returns a data URL for rendered QR code. This is a convenient shorthand for dealing with the native
`HTMLCanvasElement.prototype.toDataURL` function.

``` javascript
console.log(qr.toDataURL('http://neocotic.com/qr.js')); // "data:image/png;base64,iVBORw0KGgoAAAA..."
console.log(qr.toDataURL({
  mime: 'image/jpeg',
  value: 'https://github.com/neocotic/qr.js'
})); // "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
```

#### Additional Data
As well as the [Standard Data](#standard-data), this method also accepts the following additional
data options:

<table>
  <tr>
    <th>Property</th>
    <th>Description</th>
    <th>Default</th>
  </tr>
  <tr>
    <td>mime</td>
    <td>MIME type to process the QR code image</td>
    <td><code>image/png</code></td>
  </tr>
</table>

### Miscellaneous

#### `noConflict()`
Returns `qr` in a no-conflict state, reallocating the `qr` global variable name to its previous
owner, where possible.

This is really just intended for use within a browser.

``` html
<script src="/path/to/conflict-lib.js"></script>
<script src="/path/to/qr.min.js"></script>
<script>
  var qrNC = qr.noConflict();
  // Conflicting lib works again and use qrNC for this library onwards...
</script>
```

#### `VERSION`
The current version of `qr`.

``` javascript
console.log(qr.VERSION); // "1.1.4"
```

## Canvas Support

For browser users; their browser must support the HTML5 canvas element or the API will throw an
error immediately.

For [node.js][] users; [qr.js][] heavily depends on [node-canvas][] to support the HTML5 canvas
element in the [node.js][] environment. Unfortunately, this library is dependant on [Cairo][],
which is not managed by [npm][]. Before you are able to install [qr.js][] (and it's dependencies),
you must have [Cairo][] installed. Please see their wiki on steps on how to do this on various
platforms:

https://github.com/LearnBoost/node-canvas/wiki/_pages

## Bugs

If you have any problems with this library or would like to see the changes currently in
development you can do so here;

https://github.com/neocotic/qr.js/issues

## Questions?

Take a look at `docs/qr.html` to get a better understanding of what the code is doing.

If that doesn't help, feel free to follow me on Twitter, [@neocotic][].

However, if you want more information or examples of using this library please visit the project's
homepage;

http://neocotic.com/qr.js

[@neocotic]: https://twitter.com/neocotic
[cairo]: http://cairographics.org
[node.js]: http://nodejs.org
[node-canvas]: https://github.com/LearnBoost/node-canvas
[npm]: http://npmjs.org
[qr.js]: http://neocotic.com/qr.js
[qr code]: http://en.wikipedia.org/wiki/QR_code
