ifvisible.js
------------

Crosbrowser & lightweight way to check if user is looking at the page or interacting with it.

#### Check out the [Demo](http://serkanyersen.github.com/ifvisible.js/demo.html) or read below for code example or Check [Annotated Sorce](http://serkanyersen.github.com/ifvisible.js/docs/ifvisible.html)


## Installation
From Bower
```
bower install ifvisible
```

For Meteor
```
mrt add ifvisible
```
> meteor package is provided by [@frozeman](https://github.com/frozeman/meteor-ifvisible.js) via [Atmosphere](https://atmosphere.meteor.com/package/ifvisible)

## Examples

```javascript

// If page is visible right now
if( ifvisible.now() ){
	// Display pop-up
	openPopUp();
}

```

Handle tab switch or browser minimize states

```javascript

ifvisible.on("blur", function(){
	// example code here..
	animations.pause();
});

ifvisible.on("focus", function(){
	// resume all animations
	animations.resume();
});

```

ifvisible.js can handle activity states too, such as being IDLE or ACTIVE on the page

```javascript

ifvisible.on("idle", function(){
	// Stop auto updating the live data
	stream.pause();
});

ifvisible.on("wakeup", function(){
	// go back updating data
	stream.resume();
});

```

Default idle duration is 60 seconds but you can change it with `setIdleDuration` method

```javascript

ifvisible.setIdleDuration(120); // Page will become idle after 120 seconds

```

You can manually trigger status events by calling them directly or you can set events with their names by giving first argument as a callback

```javascript

ifvisible.idle(); // will put page in a idle status

ifvisible.idle(function(){
	// This code will work when page goes into idle status
});

// other methods are
ifvisible.blur();
ifvisible.focus();
ifvisible.idle();
ifvisible.wakeup();

```

You can set your smart intervals with ifvisible.js, if user is IDLE or not seeing the page the interval will automatically stop itself

```javascript

// If page is visible run this function on every half seconds
ifvisible.onEvery(0.5, function(){
    // Do an animation on the logo only when page is visible
	animateLogo();

});

```
