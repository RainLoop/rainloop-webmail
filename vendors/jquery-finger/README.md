# jQuery Finger <sup>0.1.0-alpha</sup>

jQuery tap & gestures, fingers in the nose.

**jQuery Finger** unifies click and touch events by removing the **300ms delay** on touch devices. It also provide a common
set of events to handle basic gestures such as **drag** and **flick**.<br>
Very small (< 0.5kb gzipped), it is focused on **performance** and **KISS**, is well tested and also supports jQuery **delegated events**.

[![Build Status](https://travis-ci.org/ngryman/jquery.finger.png)](https://travis-ci.org/ngryman/jquery.finger)
[![Dependency Status](https://gemnasium.com/ngryman/jquery.finger.png)](https://gemnasium.com/ngryman/jquery.finger)
[![githalytics.com alpha](https://cruel-carlota.pagodabox.com/cec9f8a0012c619d46fc5398ab2f3046 "githalytics.com")](http://githalytics.com/ngryman/jquery.finger)

## Getting Started

Download the [production version][min] *(470 bytes gzipped)* or the [development version][max] *(4163 bytes)*.<br>
You can also install it via [Jam] or [Bower].

[min]: https://raw.github.com/ngryman/jquery.finger/master/dist/jquery.finger.min.js
[max]: https://raw.github.com/ngryman/jquery.finger/master/dist/jquery.finger.js
[Jam]: http://jamjs.org
[Bower]: http://twitter.github.io/bower

In your web page:

```html
<script src="jquery.js"></script>
<script src="dist/jquery.finger.min.js"></script>
<script>
  // direct event
  $('.touchme').on('tap', function() {
    console.log('direct');
  });

  // delegated event
  $('body').on('tap', '.touchme', function() {
    console.log('delegated');
  });
});
</script>
```

## Documentation

### Gestures

**jQuery Finger** focuses on one finger events:

          | tap | doubletap | press | drag | flick |
----------|-----|-----------|-------|------|-------|
Available |  ✔ |     ✔     |   ✔  |  ✔  |   ✔  |

### Thresholds

You can tweak how **jQuery Finger** handles events by modifying thresholds found in the `$.Finger` object.

#### `pressDuration`

This is the time the user will have to hold in order to fire a `press` event.
If this time is not reached, a `tap` event will be fired instead.
This defaults to `300`ms.

#### `doubleTapInterval`

This is the maximum time between two `tap` events to fire a `doubletap` event.
If this time is reached, two distinct `tap` events will be fired instead.
This defaults to `300`ms.

#### `flickDuration`

This is the maximum time the user will have to swipe in order to fire a `flick` event.
If this time is reached, a `drag` event will be fired instead.
This defaults to `150`ms.

#### `motionThreshold`

This is the number of pixel the user will have to move in order to fire motion events (drag or flick).
If this time is not reached, no motion will be handled and `tap`, `doubletap` or `press` event will be fired.
This defaults to `5`px.

### Additional event parameters

**jQuery Finger** enhances the default event object when there is motion (drag & flick). It gives information about
the pointer position and motion:
 - **x**: the `x` page coordinate.
 - **y**: the `y` page coordinate.
 - **dx**: this `x` *delta* (amount of pixels moved) since the last event.
 - **dy**: this `y` delta since the last event.
 - **adx**: this `x` absolute delta since the last event.
 - **ady**: this `y` absolute delta since the last event.
 - **orientation**:
   - `horizontal`: motion was detected as an horizontal one. This can be tweaked with `$.Finger.motionThreshold`.
   - `vertical`: motion was detected as a vertical one. This can be tweaked with `$.Finger.motionThreshold`.
 - **direction**:
   - `1`: motion has a positive direction, either left to right for horizontal, or top to bottom for vertical.
   - `-1`: motion has a negative direction, either right to left for horizontal, or bottom to top for vertical.

### Prevent default

You can prevent default browser behavior when binding events with **jQuery Finger**.<br>
By specifying it, be aware that you will prevent **every native behavior** such as *following links*, *scrolling*,
*selecting text* and more ([details]).

There are two way of preventing default behavior.

[details]: http://supportforums.blackberry.com/t5/Web-and-WebWorks-Development/How-to-prevent-default-touch-and-mouse-events-in-the-BlackBerry/ta-p/1223685

#### Globally

You can tell to prevent default behavior for every event binded with **jQuery Finger** like this:
```javascript
$.Finger.preventDefault = true;
```

#### Specifically

You can tell to prevent default behavior just for a particular event like this:
```javascript
$('body').on('tap', '.touchme', { preventDefault: true }, function() {
	// ...
});
```

## Examples

### Remove the 300ms delay on every links of your page

```javascript
$('body').on('tap', 'a', { preventDefault: true }, function() {
	window.location = $(this).attr('href');
});
```

### Delegated events for dynamically loaded elements (AJAX):

```javascript
$('body').on('tap', '.toggle', function() {
	$(this).toggleClass('is-selected');
});
```

### Swipe to reveal

```javascript
$('#menu').on('flick', function(e) {
	if ('horizontal' == e.orientation) {
		if (1 == e.direction) {
			$(this).addClass('is-opened');
		}
		else {
			$(this).removeClass('is-opened');
		}
	}
});
```

## Notes

 - **jQuery Finger** uses [VirtualPointer] in its test suite to simulate mouse and touch events.
 - On Chrome 25+, `preventDefault` does not work as expected because `ontouchstart` is defined. To make it work, you
 have to manually prevent the default behavior in the `mousedown` or `click` event.

[VirtualPointer]: https://github.com/ngryman/virtual-pointer

## Instacode

<p align="center">
  <img src="http://instacod.es/file/65854">
</p>

## Release History

```
v0.1.0-alpha
 - ie8 legacy support.
 - fixed prevent default event parameter.

v0.0.11
 - `press` event is now fired by `timeout` instead of `touchend`.

v0.0.10
 - fixed events fired multiple times (#1).
 - added `preventDefault` support.
 - internal refactoring for size and performance.

v0.0.9
  - fixed incorrect event type.
  - added to jam.
  - added to bower.

v0.0.8
  - fixed bugs on delegated events.
  - better cross-browser support (still needs some work/tests).
  - internal refactoring for consistency and performance.

v0.0.7
  - various cross browsers fixes.

v0.0.6
  - updated description.

v0.0.5
  - updated jquery manifest and published on http://plugins.jquery.com.

v0.0.4
  - added `drag` and `flick` gestures.
  - enhanced `event` object.
  - internal refactoring for consistency.

v0.0.3
  - migration to **grunt** 0.4.
  - migration to **mocha** / **chaijs** for tests.

v0.0.2
  - added `doubletap` and `press` gestures.
  - internal refactoring for consistency and performance.

v0.0.1
  - `tap` gesture first implementation.
```

## Author

| [![twitter/ngryman](http://gravatar.com/avatar/2e1c2b5e153872e9fb021a6e4e376ead?size=70)](http://twitter.com/ngryman "Follow @ngryman on Twitter") |
|---|
| [Nicolas Gryman](http://ngryman.sh) |
