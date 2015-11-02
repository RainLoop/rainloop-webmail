[![Bower version](https://badge.fury.io/bo/vide.svg)](http://badge.fury.io/bo/vide)
[![Travis](https://travis-ci.org/VodkaBears/Vide.svg?branch=master)](https://travis-ci.org/VodkaBears/Vide)
[![devDependency Status](https://david-dm.org/vodkabears/vide/dev-status.svg)](https://david-dm.org/vodkabears/vide#info=devDependencies)
Vide
====

Easy as hell jQuery plugin for video backgrounds.

## Notes

* All modern desktop browsers are supported.
* IE9+
* iOS plays video from a browser only in the native player. So video for iOS is disabled, only fullscreen poster will be used.
* Some android devices play video, some not — go figure. So video for android is disabled, only fullscreen poster will be used.

## Instructions

Download it from [GitHub](https://github.com/VodkaBears/Vide/releases/latest) or via Bower:
`bower install vide`

Include plugin: `<script src="js/jquery.vide.min.js"></script>`

Prepare your video in several formats like '.webm', '.mp4' for cross browser compatability, also add a poster with `.jpg`, `.png` or `.gif` extension:
```
path/
├── to/
│   ├── video.mp4
│   ├── video.ogv
│   ├── video.webm
│   └── video.jpg
```

Add `data-vide-bg` attribute with a path to the video and poster without extension, video and poster must have the same name. Add `data-vide-options` to pass vide options, if you need it. By default video is muted, looped and starts automatically.
```html
<div style="width: 1000px; height: 500px;"
    data-vide-bg="path/to/video" data-vide-options="loop: false, muted: false, position: 0% 0%">
</div>
```

Also you can set extended path:
```html
<div style="width: 1000px; height: 500px;"
    data-vide-bg="mp4: path/to/video1, webm: path/to/video2, ogv: path/to/video3, poster: path/to/poster" data-vide-options="posterType: jpg, loop: false, muted: false, position: 0% 0%">
</div>
```

In some situations it can be helpful to initialize it with JS because Vide doesn't have mutation observers:
```js
$("#myBlock").vide("path/to/video");
$("#myBlock").vide("path/to/video", {
...options...
});
$("#myBlock").vide({
    mp4: path/to/video1,
    webm: path/to/video2,
    ogv: path/to/video3,
    poster: path/to/poster
}, {
...options...
});
$("#myBlock").vide("extended path as a string", "options as a string");
```

Easy as hell.

## Options

Below is a complete list of options and matching default values:

```js
$("#yourElement").vide({
    volume: 1,
    playbackRate: 1,
    muted: true,
    loop: true,
    autoplay: true,
    position: "50% 50%", // Similar to the CSS `background-position` property.
    posterType: "detect", // Poster image type. "detect" — auto-detection; "none" — no poster; "jpg", "png", "gif",... - extensions.
    resizing: true // Auto-resizing, read: https://github.com/VodkaBears/Vide#resizing
});
```

## Methods

Below is a complete list of methods:

```js
// Get instance of the plugin
var instance = $("#yourElement").data("vide");

// Get video element of the background. Do what you want.
instance.getVideoObject();

// Resize video background.
// It calls automatically, if window resize (or element, if you will use something like https://github.com/cowboy/jquery-resize).
instance.resize();

// Destroy plugin instance
instance.destroy();
```

## Resizing

The Vide plugin resizes if the window resizes. If you will use something like https://github.com/cowboy/jquery-resize, it will resize automatically when the container resizes. Or simply use `resize()` method whenever you need.

Set the `resizing` option to false to disable auto-resizing.

## Encoding video

http://diveintohtml5.info/video.html#miro

## Ruby Gem

[Vider](https://github.com/wazery/vider) by Islam Wazery.

## License

```
The MIT License (MIT)

Copyright (c) 2014 Ilya Makarov, http://vodkabears.github.io

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
