# Mouse Wheel ChangeLog

## 3.1.4

* Always set the deltaY
* Add back in the deltaX and deltaY support for older Firefox versions

## 3.1.3

* Include `MozMousePixelScroll` in the to fix list to avoid inconsistent behavior in older Firefox

## 3.1.2

* Include grunt utilities for development purposes (jshint and uglify)
* Include support for browserify
* Some basic cleaning up

## 3.1.1

* Fix rounding issue with deltas less than zero


## 3.1.0

* Fix Firefox 17+ issues by using new wheel event
* Normalize delta values
* Adds horizontal support for IE 9+ by using new wheel event
* Support AMD loaders


## 3.0.6

* Fix issue with delta being 0 in Firefox


## 3.0.5

* jQuery 1.7 compatibility


## 3.0.4

* Fix IE issue


## 3.0.3

* Added `deltaX` and `deltaY` for horizontal scrolling support (Thanks to Seamus Leahy)


## 3.0.2

* Fixed delta being opposite value in latest Opera
* No longer fix `pageX`, `pageY` for older Mozilla browsers
* Removed browser detection
* Cleaned up the code


## 3.0.1

* Bad release... creating a new release due to plugins.jquery.com issue :(


## 3.0

* Uses new special events API in jQuery 1.2.2+
* You can now treat `mousewheel` as a normal event and use `.bind`, `.unbind` and `.trigger`
* Using jQuery.data API for expandos


## 2.2

* Fixed `pageX`, `pageY`, `clientX` and `clientY` event properties for Mozilla based browsers


## 2.1.1

* Updated to work with jQuery 1.1.3
* Used one instead of bind to do unload event for clean up


## 2.1

* Fixed an issue with the unload handler


## 2.0

* Major reduction in code size and complexity (internals have change a whole lot)


## 1.0

* Fixed Opera issue
* Fixed an issue with children elements that also have a mousewheel handler
* Added ability to handle multiple handlers
