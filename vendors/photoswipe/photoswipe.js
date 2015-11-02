/*! PhotoSwipe - v4.0.0 - 2014-12-04
* http://photoswipe.com
* Copyright (c) 2014 Dmitry Semenov; */
(function (root, factory) {
	if (typeof define === 'function' && define.amd) {
		define(factory);
	} else if (typeof exports === 'object') {
		module.exports = factory;
	} else {
		root.PhotoSwipe = factory();
	}
})(this, function () {

	'use strict';
	var PhotoSwipe = function(template, UiClass, items, options){

/*>>framework-bridge*/
/**
 *
 * Set of generic functions used by gallery.
 *
 * You're free to modify anything here as long as functionality is kept.
 *
 */
var framework = {
	features: null,

	bind: function(target, type, listener, unbind) {

		var methodName = (unbind ? 'remove' : 'add') + 'EventListener';
		type = type.split(' ');
		for(var i = 0; i < type.length; i++) {
			if(type[i]) {
				target[methodName]( type[i], listener, false);
			}
		}

	},
	isArray: function(obj) {
		return (obj instanceof Array);
	},
	createEl: function(classes, tag) {
		var el = document.createElement(tag || 'div');
		if(classes) {
			el.className = classes;
		}
		return el;
	},
	getScrollY: function() {
		var yOffset = window.pageYOffset;
		return yOffset !== undefined ? yOffset : document.documentElement.scrollTop;
	},
	unbind: function(target, type, listener) {
		framework.bind(target,type,listener,true);
	},
	removeClass: function(el, className) {
		var reg = new RegExp('(\\s|^)' + className + '(\\s|$)');
     	el.className = el.className.replace(reg, ' ').replace(/^\s\s*/, '').replace(/\s\s*$/, '');
	},
	addClass: function(el, className) {
		if( !framework.hasClass(el,className) ) {
			el.className += (el.className ? ' ' : '') + className;
		}
	},
	hasClass: function(el, className) {
		return el.className && new RegExp('(^|\\s)' + className + '(\\s|$)').test(el.className);
	},

	arraySearch: function(array, value, key) {
		var i = array.length;
		while(i--) {
			if(array[i][key] === value) {
				return i;
			}
		}
		return -1;
	},
	// getOffset: function(el) {
	// 	// http://stackoverflow.com/a/11396681/331460
	//     var bodyRect = document.body.getBoundingClientRect(),
 //    		elemRect = el.getBoundingClientRect();

	//     return { x: elemRect.left - bodyRect.left, y: elemRect.top - bodyRect.top };
	// },
	extend: function(o1, o2, preventOverwrite) {
		for (var prop in o2) {
			if (o2.hasOwnProperty(prop)) {
				if(preventOverwrite && o1.hasOwnProperty(prop)) {
					continue;
				}
			    o1[prop] = o2[prop];
			}
		}
	},
	easing: {
		sine: {
			out: function(k) {
				return Math.sin(k * (Math.PI / 2));
			},
			inOut: function(k) {
				return - (Math.cos(Math.PI * k) - 1) / 2;
			}
		},
		cubic: {
			out: function(k) {
				return --k * k * k + 1;
			}
		}
		// elastic: {
		// 	out: function ( k ) {

		// 		var s, a = 0.1, p = 0.4;
		// 		if ( k === 0 ) return 0;
		// 		if ( k === 1 ) return 1;
		// 		if ( !a || a < 1 ) { a = 1; s = p / 4; }
		// 		else s = p * Math.asin( 1 / a ) / ( 2 * Math.PI );
		// 		return ( a * Math.pow( 2, - 10 * k) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) + 1 );

		// 	},
		// },
		// back: {
		// 	out: function ( k ) {

		// 		var s = 1.70158;
		// 		return --k * k * ( ( s + 1 ) * k + s ) + 1;

		// 	}
		// }
	},

	/**
	 *
	 * @return {object}
	 *
	 * {
	 * 	raf : request animation frame function
	 * 	caf : cancel animation frame function
	 * 	transfrom : transform property key (with vendor), or null if not supported
	 * 	oldIE : IE8 or below
	 * }
	 *
	 */
	detectFeatures: function() {
		if(framework.features) {
			return framework.features;
		}
		var helperEl = framework.createEl(),
			helperStyle = helperEl.style,
			vendor = '',
			features = {};

		// IE8 and below
		features.oldIE = document.all && !document.addEventListener;

		features.touch = 'ontouchstart' in window;

		if(window.requestAnimationFrame) {
			features.raf = window.requestAnimationFrame;
			features.caf = window.cancelAnimationFrame;
		}


		features.pointerEvent = navigator.pointerEnabled || navigator.msPointerEnabled;



		if(!features.pointerEvent) { // fix false-positive detection of old Android (IE11 ua string contains "Android 4.0")

			var ua = navigator.userAgent;
			// Detect if device is iPhone or iPod and if it's older than iOS 8
			// http://stackoverflow.com/a/14223920
			// This detection is made because of buggy top/bottom toolbars that don't trigger window.resize event when appear.
			// For more info refer to _isFixedPosition variable in core.js
			if (/iP(hone|od)/.test(navigator.platform)) {
			    var v = (navigator.appVersion).match(/OS (\d+)_(\d+)_?(\d+)?/);
			    v = parseInt(v[1], 10);
			    if(v >= 1 && v < 8 ) {
			    	features.isOldIOSPhone = true;
			    }
			}
			// Detect old Android (before KitKat)
			// due to bugs related to position:fixed
			// http://stackoverflow.com/questions/7184573/pick-up-the-android-version-in-the-browser-by-javascript
	    	var match = ua.match(/Android\s([0-9\.]*)/);
	    	var androidversion =  match ? match[1] : 0;
	    	androidversion = parseFloat(androidversion);
	    	if(androidversion >= 1 && androidversion < 4.4 ) {
	    		features.isOldAndroid = true;
	    	} else if(androidversion >= 5) {
	    		features.isNewAndroid = true; // Lollipop
	    	}
	    	features.isMobileOpera = /opera mini|opera mobi/i.test(ua);

	    	// p.s. yes, yes, UA sniffing is bad, propose your solution for above bugs.

		}






		var styleChecks = ['transform', 'perspective', 'animationName'],
			vendors = ['', 'webkit','Moz','ms','O'],
			styleCheckItem,
			styleName;

		for(var i = 0; i < 4; i++) {
			vendor = vendors[i];

			for(var a = 0; a < 3; a++) {
				styleCheckItem = styleChecks[a];

				// uppercase first letter of property name, if vendor is present
				styleName = vendor + (vendor ? styleCheckItem.charAt(0).toUpperCase() + styleCheckItem.slice(1) : styleCheckItem);

				if(!features[styleCheckItem] && styleName in helperStyle ) {
					features[styleCheckItem] = styleName;
				}
			}

			if(vendor && !features.raf) {
				vendor = vendor.toLowerCase();
				features.raf = window[vendor+'RequestAnimationFrame'];
				if(features.raf) {
					features.caf = window[vendor+'CancelAnimationFrame'] || window[vendor+'CancelRequestAnimationFrame'];
				}
			}

		}




		if(!features.raf) {
			var lastTime = 0;
			features.raf = function(fn) {
				var currTime = new Date().getTime();
				var timeToCall = Math.max(0, 16 - (currTime - lastTime));
				var id = window.setTimeout(function() { fn(currTime + timeToCall); }, timeToCall);
				lastTime = currTime + timeToCall;
				return id;
			};
			features.caf = function(id) { clearTimeout(id); };
		}

		// Detect SVG support
		features.svg = !!document.createElementNS && !!document.createElementNS('http://www.w3.org/2000/svg', 'svg').createSVGRect;

		framework.features = features;

		return features;

	}
};

framework.detectFeatures();

// Override add event listener for old versions of IE
if(framework.features.oldIE) {
	framework.bind = function(target, type, listener, unbind) {
		// if ( !framework.isArray(type) ) {
		// 	type = [type];
		// }
		type = type.split(' ');

		var methodName = (unbind ? 'detach' : 'attach') + 'Event',
			evName;
	  	for(var i = 0; i < type.length; i++) {
	  		evName = type[i];
			if(evName) {

				if(typeof listener == "object" && listener.handleEvent) {
					if(!unbind) {

						listener['oldIE' + evName] = function() {
							listener.handleEvent.call(listener);
						};

					} else {
						if(!listener['oldIE' + evName]) {
							return false;
						}

					}

					target[methodName]( 'on' + evName, listener['oldIE' + evName]);
		        } else {
		        	target[methodName]( 'on' + evName, listener);
		        }


			}
		}
	};
}




/*>>framework-bridge*/

/*>>core*/
//function(template, UiClass, items, options)

/* Core module. Contains swipe and pinch-zoom logic. */


var self = this;


/**
 * Static vars, don't change unless you know what you're doing.
 */
var DOUBLE_TAP_RADIUS = 25,
	NUM_HOLDERS = 3;

/**
 * Options
 */
var _options = {
	allowPanToNext:true, // Allow navigation to next/prev item when current item is zoomed (using swipe gesture). Option is always false on non-touch devices.
	spacing: 0.12, // Spacing ratio between slides (during swipe). For example, 0.12 will render as a 12% of sliding viewport.
	bgOpacity: 1,

	mouseUsed: false,
	loop: true,
	pinchToClose: true,

	closeOnScroll: true,
	closeOnVerticalDrag: true,

	hideAnimationDuration: 333,
	showAnimationDuration: 333,
	showHideOpacity: false,

	focus: true,

	escKey: true,
	arrowKeys: true,

	mainScrollEndFriction: 0.35,
	panEndFriction: 0.35,

	// not fully implemented yet
	scaleMode: 'fit', // TODO
	modal: true, // TODO
	alwaysFadeIn: false // TODO
};
framework.extend(_options, options);



/**
 * Private helper variables & functions
 */

var _getEmptyPoint = function() { return {x:0,y:0}; };

var _isOpen,
	_isDestroying,
	_closedByScroll,
	_currentItemIndex,
	_containerStyle,
	_containerShiftIndex,
	_lastReleaseTime = 0,
	_currPanDist = _getEmptyPoint(),
	_startPanOffset = _getEmptyPoint(),
	_panOffset = _getEmptyPoint(),
	_centerPoint = _getEmptyPoint(),

	_upMoveEvents, // drag move, drag end & drag cancel events array
	_downEvents, // drag start events array
	_globalEventHandlers,


	_viewportSize = {},

	_currZoomLevel,
	_startZoomLevel,

	_translatePrefix,
	_translateSufix,

	_updateSizeInterval,



	_currPositionIndex = 0,
	_currZoomedItemIndex = 0,
	_slideSize = _getEmptyPoint(), // size of slide area, including spacing


	_scrollChanged,

	_itemHolders,
	_prevItemIndex,
	_indexDiff = 0, // difference of indexes since last content update

	_dragStartEvent,
	_dragMoveEvent,
	_dragEndEvent,
	_dragCancelEvent,
	_transformKey,
	_pointerEventEnabled,
	_isFixedPosition = true,
	_likelyTouchDevice,
	_modules = [],

	_requestAF,
	_cancelAF,
	_initalClassName,
	_initalWindowScrollY,
	_oldIE,
	_currentWindowScrollY,
	_features,
	_windowVisibleSize = {},

	// Registers PhotoSWipe module (History, Controller ...)
	_registerModule = function(name, module) {
		framework.extend(self, module.publicMethods);
		_modules.push(name);
	},

	_getLoopedId = function(index) {
		var numSlides = _getNumItems();
		if(index > numSlides - 1) {
			return index - numSlides;
		} else  if(index < 0) {
			return numSlides + index;
		}
		return index;
	},


	// Micro bind/trigger
	_listeners = {},
	_listen = function(name, fn) {
		if(!_listeners[name]) {
			_listeners[name] = [];
		}
		return _listeners[name].push(fn);
	},
	_shout = function(name) {
		console.log(name);
		var listeners = _listeners[name];

		if(listeners) {
			var args = Array.prototype.slice.call(arguments);
			args.shift();

			for(var i = 0; i < listeners.length; i++) {
				listeners[i].apply(self, args);
			}
		}
	},

	_getCurrentTime = function() {
		return new Date().getTime();
	},
	_applyBgOpacity = function(opacity) {
		_bgOpacity = opacity;
		self.bg.style.opacity = opacity * _options.bgOpacity;
	},

	_applyZoomTransform = function(styleObj,x,y,zoom) {
		styleObj[_transformKey] = _translatePrefix + x + 'px, ' + y + 'px' + _translateSufix + ' scale(' + zoom + ')';;//'scale3d(' + zoom + ',' + zoom + ',1)';//' scale(' + zoom + ')';
	},
	_applyCurrentZoomPan = function() {
		if(_currZoomElementStyle) {
			_applyZoomTransform(_currZoomElementStyle, _panOffset.x, _panOffset.y, _currZoomLevel);
		}
	},
	_applyZoomPanToItem = function(item) {
		_applyZoomTransform(item.container.style, item.initialPosition.x, item.initialPosition.y, item.initialZoomLevel);
	},
	_setTranslateX = function(x, elStyle) {
		elStyle[_transformKey] = _translatePrefix + x + 'px, 0px' + _translateSufix;
	},

	_moveMainScroll = function(x, dragging) {

		if(!_options.loop && dragging) {
			var newSlideIndexOffset = _currentItemIndex + (_slideSize.x * _currPositionIndex - x)/_slideSize.x; // if of current item during scroll (float)
			var delta = Math.round(x - _mainScrollPos.x);

			if( (newSlideIndexOffset < 0 && delta > 0) ||
				(newSlideIndexOffset >= _getNumItems()-1 && delta < 0) ) {
				x = _mainScrollPos.x + delta * _options.mainScrollEndFriction;
			}
		}

		_mainScrollPos.x = x;
		_setTranslateX(x, _containerStyle);
	},

	_calculateZoomLevel = function(touchesDistance) {
		return  1 / _startPointsDistance * touchesDistance * _startZoomLevel;
	},
	_calculatePanOffset = function(axis, zoomLevel) {
		var m = _midZoomPoint[axis] - _offset[axis];
		return _startPanOffset[axis] + _currPanDist[axis] + m - m * ( zoomLevel / _startZoomLevel );
	},
	_isEqualPoints = function(p1, p2) {
		return p1.x === p2.x && p1.y === p2.y;
	},
	_isNearbyPoints = function(touch0, touch1) {
		return (Math.abs(touch0.x - touch1.x) < DOUBLE_TAP_RADIUS && Math.abs(touch0.y - touch1.y) < DOUBLE_TAP_RADIUS);
	},
	_equalizePoints = function(p1, p2) {
		p1.x = p2.x;
		p1.y = p2.y;
		if(p2.id) {
			p1.id = p2.id;
		}
	},
	_bindEvents = function() {
		framework.bind(document, 'keydown keyup', self);

		if(!_options.mouseUsed) {
			framework.bind(document, 'mousemove', _onFirstMouseMove);
		}

		framework.bind(window, 'resize scroll', self);

		_shout('bindEvents');
	},
	_unbindEvents = function() {
		framework.unbind(window, 'resize', self);
		framework.unbind(window, 'scroll', _globalEventHandlers.scroll);
		framework.unbind(document, 'keydown keyup', self);
		framework.unbind(document, 'mousemove', _onFirstMouseMove);

		if(_isDragging) {
			framework.unbind(window, _upMoveEvents, self);
		}

		_shout('unbindEvents');
	},


	_mouseMoveTimeout = null,
	_onFirstMouseMove = function(e) {
		// Wait until mouse move event is fired at least twice during 100ms
		// We do this, because some mobile browsers trigger it on touchstart
		if(_mouseMoveTimeout ) {
			framework.unbind(document, 'mousemove', _onFirstMouseMove);
			framework.addClass(template, 'pswp--has_mouse');
			_options.mouseUsed = true;
			_shout('mouseUsed');
		}
		_mouseMoveTimeout = setTimeout(function() {
			_mouseMoveTimeout = null;
		}, 100);
	},

	_calculatePanBounds = function(zoomLevel, update) {
		var bounds = _calculateItemSize( self.currItem, _viewportSize, zoomLevel );
		if(update) {
			_currPanBounds = bounds;
		}
		return bounds;
	},

	// Return true if offset is out of the bounds
	_isOutOfBounds = function(axis, destPanBounds, destPanOffset, destZoomLevel) {
		if(destZoomLevel === self.currItem.initialZoomLevel) {
			destPanOffset[axis] = self.currItem.initialPosition[axis];
			return true;
		} else {
			destPanOffset[axis] = _calculatePanOffset(axis, destZoomLevel);

			if(destPanOffset[axis] > destPanBounds.min[axis]) {
				destPanOffset[axis] = destPanBounds.min[axis];
				return true;
			} else if(destPanOffset[axis] < destPanBounds.max[axis] ) {
				destPanOffset[axis] = destPanBounds.max[axis];
				return true;
			}
		}
		return false;
	};






// Micro animation engine
var _animations = {},
	_numAnimations = 0,
	_stopAnimation = function(name) {
		if(_animations[name]) {
			if(_animations[name].raf) {
				_cancelAF( _animations[name].raf );
			}
			_numAnimations--;
			delete _animations[name];
		}
	},
	_registerStartAnimation = function(name) {
		if(_animations[name]) {
			_stopAnimation(name);
		}
		if(!_animations[name]) {
			_numAnimations++;
			_animations[name] = {};
		}
	},
	_stopAllAnimations = function() {
		for (var prop in _animations) {

			if( _animations.hasOwnProperty( prop ) ) {
				_stopAnimation(prop);
			}

		}
	},
	_animateProp = function(name, b, endProp, d, easingFn, onUpdate, onComplete) {
		var startAnimTime = _getCurrentTime(), t;
		_registerStartAnimation(name);

		var animloop = function(){
			if ( _animations[name] ) {

				t = _getCurrentTime() - startAnimTime; // time diff
				//b - beginning (start prop)
				//d - anim duration

				if ( t >= d ) {
					_stopAnimation(name);
					onUpdate(endProp);
					if(onComplete) {
						onComplete();
					}
					return;
				}
				onUpdate( (endProp - b) * easingFn(t/d) + b );

				_animations[name].raf = _requestAF(animloop);
			}
		};
		animloop();
	},




	_showOrHideTimeout,
	/**
	 * Function manages open/close transitions of gallery
	 */
	_showOrHide = function(item, img, out, completeFn) {

		if(_showOrHideTimeout) {
			clearTimeout(_showOrHideTimeout);
		}

		_initialZoomRunning = true;
		_initialContentSet = true;

		var thumbBounds; // dimensions of small thumbnail ({x:,y:,w:}), height is optional, as calculated based on large image
		if(item.initialLayout) {
			thumbBounds = item.initialLayout;
			item.initialLayout = null;
		} else {
			thumbBounds = _options.getThumbBoundsFn && _options.getThumbBoundsFn(_currentItemIndex);
		}


		var complete = function() {

			_stopAnimation('initialZoom');
	 		if(!out) {
	 			_applyBgOpacity(1);
	 			if(img) {
	 				img.style.display = 'block';
	 			}
	 			framework.addClass(template, 'pswp--animated-in');
	 			_shout('initialZoomInEnd');
	 		}
			if(completeFn) {
				completeFn();
			}
			_initialZoomRunning = false;
		};

		var duration = out ? _options.hideAnimationDuration : _options.showAnimationDuration;



		// if bounds aren't provided, just open gallery without animation
		if(!thumbBounds || thumbBounds.x === undefined || !duration ) {
			_shout('initialZoom' + (out ? 'Out' : 'In') );

	 		_currZoomLevel = item.initialZoomLevel;
			_equalizePoints(_panOffset,  item.initialPosition );
			_applyCurrentZoomPan();


			// if(_options.showHideDuration) {
			// 	if(!out) {
			// 		complete();
			// 	}
			// 	// simple opacity transition
			// 	_showOrHideTimeout = setTimeout(function() {
			// 		if(_options.showHideOpacity) {
			// 			template.style.opacity = out ? 0 : 1;
			// 		}

			// 		if(out) {
			// 			_showOrHideTimeout = setTimeout(function() {
			// 				complete();
			// 			}, _options.showHideDuration + 20);
			// 		}

			// 	}, out ? 15 : 50);
			// } else {
				// no transition
				template.style.opacity = out ? 0 : 1;
				_applyBgOpacity(1);
				complete();
			//}

			return false;
		}



		// apply hw-acceleration to image
		if(item.miniImg) {
			item.miniImg.style.webkitBackfaceVisibility = 'hidden';
		}

		if(!out) {
			_currZoomLevel = thumbBounds.w / item.w;
			_panOffset.x = thumbBounds.x;
			_panOffset.y = thumbBounds.y - _initalWindowScrollY;

			if(_options.showHideOpacity) {
				template.style.opacity = 0.001;
				template.style.webkitBackfaceVisibility = 'hidden';
				//template.style.webkitTransition = 'opacity 0.3s linear';
			}
			_applyCurrentZoomPan();
		}

		_registerStartAnimation('initialZoom');


		if(out && !_closedByScroll) {
		 	framework.removeClass(template, 'pswp--animated-in');
		}


		_showOrHideTimeout = setTimeout(function() {

			_shout('initialZoom' + (out ? 'Out' : 'In') );


			if(!out) {

				// "in" animation always uses CSS transitions (instead of rAF)
				// CSS transition works faster here, as we may also want to animate other things, like ui on top of sliding area, which can be animated just via CSS
				_currZoomLevel = item.initialZoomLevel;
				_equalizePoints(_panOffset,  item.initialPosition );
				_applyCurrentZoomPan();
				_applyBgOpacity(1);

				if(_options.showHideOpacity) {
					template.style.opacity = 1;
				} else {
					_applyBgOpacity(1);
				}

				_showOrHideTimeout = setTimeout(complete, duration + 20);
			} else {

				// "out" animation uses rAF only when PhotoSwipe is closed by browser scroll, to recalculate position
				var destZoomLevel = thumbBounds.w / item.w,
					initialPanOffset = {
						x: _panOffset.x,
						y: _panOffset.y
					},
					initialZoomLevel = _currZoomLevel,
					scrollY = _initalWindowScrollY,
					initalBgOpacity = _bgOpacity,
					onUpdate = function(now) {
						if(_scrollChanged) {
							scrollY = framework.getScrollY();
							_scrollChanged = false;
						}

						if(now === 1) {
							_currZoomLevel = destZoomLevel;
							_panOffset.x = thumbBounds.x;
							_panOffset.y = thumbBounds.y  - scrollY;
							if(_closedByScroll) {
								complete();
							}
						} else {
							_currZoomLevel = (destZoomLevel - initialZoomLevel) * now + initialZoomLevel;
							_panOffset.x = (thumbBounds.x - initialPanOffset.x) * now + initialPanOffset.x;
							_panOffset.y = (thumbBounds.y - scrollY - initialPanOffset.y) * now + initialPanOffset.y;
						}

						_applyCurrentZoomPan();
						if(_options.showHideOpacity) {
							template.style.opacity = 1 - now;
						} else {
							_applyBgOpacity( initalBgOpacity - now * initalBgOpacity );
						}

						//_applyBgOpacity( initalBgOpacity - now * initalBgOpacity );
					};

				if(_closedByScroll) {
					_animateProp('initialZoom', 0, 1, duration, framework.easing.cubic.out/*sine.inOut*/, onUpdate);
				} else {
					onUpdate(1);
					_showOrHideTimeout = setTimeout(complete, duration + 20);
				}
			}

		}, out ? 25 : 90); // Main purpose of this delay is to give browser time to paint and
				// create composite layers of PhotoSwipe UI parts (background, controls, caption, arrows).
				// Which avoids lag at the beginning of scale transition.



		return true;
	};



var publicMethods = {

	// make a few local variables and functions public
	shout: _shout,
	listen: _listen,
	viewportSize: _viewportSize,
	options: _options,

	isMainScrollAnimating: function() {
		return _mainScrollAnimating;
	},
	getZoomLevel: function() {
		return _currZoomLevel;
	},
	getCurrentIndex: function() {
		return _currentItemIndex;
	},
	isDragging: function() {
		return _isDragging;
	},
	isZooming: function() {
		return _isZooming;
	},
	applyZoomPan: function(zoomLevel,panX,panY) {
		_panOffset.x = panX;
		_panOffset.y = panY;
		_currZoomLevel = zoomLevel;
		_applyCurrentZoomPan();
	},

	init: function() {
		if(_isOpen || _isDestroying) return;


		var i;

		self.framework = framework; // basic function
		self.template = template; // root DOM element of PhotoSwipe
		self.bg = template.children[0];

		_initalClassName = template.className;
		_isOpen = true;

		_features = framework.detectFeatures();
		_requestAF = _features.raf;
		_cancelAF = _features.caf;
		_transformKey = _features.transform;
		_oldIE = _features.oldIE;

		self.scrollWrap = template.children[1];
		self.container = self.scrollWrap.children[0];
		_containerStyle = self.container.style; // for fast access


		if(!_transformKey) {
			// Override zoom/pan/move functions in case old browser is used (most likely IE)

			_transformKey = 'left';
			framework.addClass(template, 'pswp--ie');

			_setTranslateX = function(x, elStyle) {
				elStyle.left = x + 'px';
			};
			_applyZoomPanToItem = function(item) {

				var s = item.container.style,
					w = item.fitRatio * item.w,
					h = item.fitRatio * item.h;

				s.width = w + 'px';
				s.height = h + 'px';
				s.left = item.initialPosition.x + 'px';
				s.top = item.initialPosition.y + 'px';

			};
			_applyCurrentZoomPan = function() {
				if(_currZoomElementStyle) {

					var s = _currZoomElementStyle;
					var item = self.currItem;


					var w = item.fitRatio * item.w;
					var h = item.fitRatio * item.h;

					s.width = w + 'px';
					s.height = h + 'px';


					s.left = _panOffset.x + 'px';
					s.top = _panOffset.y + 'px';
				}

			};
		} else {
			// setup 3d transforms
			var allow3dTransform = _features.perspective && !_likelyTouchDevice;
			_translatePrefix = 'translate' + (allow3dTransform ? '3d(' : '(');
			_translateSufix = _features.perspective ? ', 0px)' : ')';
		}


		// helper function that builds touch/pointer/mouse events
		var addEventNames = function(pref, down, move, up, cancel) {
			_dragStartEvent = pref + down;
			_dragMoveEvent = pref + move;
			_dragEndEvent = pref + up;
			if(cancel) {
				_dragCancelEvent = pref + cancel;
			} else {
				_dragCancelEvent = '';
			}
		};

		// Objects that hold slides (there are only 3 in DOM)
		_itemHolders = [
			{el:self.container.children[0] , wrap:0, index: -1},
			{el:self.container.children[1] , wrap:0, index: -1},
			{el:self.container.children[2] , wrap:0, index: -1}
		];

		// hide nearby item holders until initial zoom animation finishes (to avoid extra Paints)
		_itemHolders[0].el.style.display = _itemHolders[2].el.style.display = 'none';



		_pointerEventEnabled = _features.pointerEvent;
		if(_pointerEventEnabled && _features.touch) {
			// we don't need touch events, if browser supports pointer events
			_features.touch = false;
		}

		if(_pointerEventEnabled) {
			if(navigator.pointerEnabled) {
				addEventNames( 'pointer', 'down', 'move', 'up', 'cancel' );
			} else {
				// IE10 pointer events are case-sensitive
				addEventNames( 'MSPointer', 'Down', 'Move', 'Up', 'Cancel');
			}
		} else if(_features.touch) {
			addEventNames('touch', 'start', 'move', 'end', 'cancel');
			_likelyTouchDevice = true;
		} else {
			addEventNames('mouse', 'down', 'move', 'up');
		}

		_upMoveEvents = _dragMoveEvent + ' ' + _dragEndEvent  + ' ' +  _dragCancelEvent;
		_downEvents = _dragStartEvent;

		if(_pointerEventEnabled && !_likelyTouchDevice) {
			_likelyTouchDevice = (navigator.maxTouchPoints > 1) || (navigator.msMaxTouchPoints > 1);
		}
		self.likelyTouchDevice = _likelyTouchDevice; // make variable public

		// disable show/hide effects on old browsers that don't support CSS animations or transforms (like IE8-9),
		// old IOS, Android and Opera mobile. Blackberry seems to work fine, even older models.
		if(!_features.animationName || !_features.transform || _features.isOldIOSPhone || _features.isOldAndroid || _features.isMobileOpera ) {
			_options.showAnimationDuration = _options.hideAnimationDuration = 0;
		}

		for(i = 0; i < _modules.length; i++) {
			self['init' + _modules[i]]();
		}

		if(UiClass) {
			var ui = self.ui = new UiClass(self, framework);
			ui.init();
		}

		if(!_likelyTouchDevice) {
			// don't allow pan to next slide from zoomed state on Desktop
			_options.allowPanToNext = false;
		}

		// Setup events
		_globalEventHandlers = {
			resize: self.updateSize,
			scroll: function() {

				_scrollChanged = true;

				// "close" on scroll works only on desktop devices, or when mouse is used
				if(_options.closeOnScroll && _isOpen && (!self.likelyTouchDevice || _options.mouseUsed) ) {

					if(Math.abs(framework.getScrollY() - _initalWindowScrollY) > 2) { // if scrolled for more than 2px
						_closedByScroll = true;
						self.close();
					}

				}
			},
			keyup: function(e) {
				if(_options.escKey && e.keyCode === 27) { // esc key
					self.close();
				}
			},
			keydown: function(e) {
				if(_options.arrowKeys) {
					if(e.keyCode === 37) {
						self.prev();
					} else if(e.keyCode === 39) {
						self.next();
					}
				}
			}
		};
		_globalEventHandlers[_dragStartEvent] = _onDragStart;
		_globalEventHandlers[_dragMoveEvent] = _onDragMove;
		_globalEventHandlers[_dragEndEvent] = _onDragRelease; // the Kraken


		if(_dragCancelEvent) {
			_globalEventHandlers[_dragCancelEvent] = _globalEventHandlers[_dragEndEvent];
		}


		// Bind mouse events on device with detected hardware touch support, in case it supports multiple types of input.
		if(_features.touch) {
			_downEvents += ' mousedown';
			_upMoveEvents += 'mousemove mouseup';
			_globalEventHandlers.mousedown = _globalEventHandlers[_dragStartEvent];
			_globalEventHandlers.mousemove = _globalEventHandlers[_dragMoveEvent];
			_globalEventHandlers.mouseup = _globalEventHandlers[_dragEndEvent];
		}

		_shout('firstUpdate');
		_currentItemIndex = _currentItemIndex || _options.index || 0;
		// validate index
		if( isNaN(_currentItemIndex) || _currentItemIndex < 0 || _currentItemIndex >= _getNumItems() ) {
			_currentItemIndex = 0;
		}
		self.currItem = _getItemAt( _currentItemIndex );


		if(_features.isOldIOSPhone || _features.isOldAndroid) {
			_isFixedPosition = false;
		}

		if(_options.modal) {
			template.setAttribute('aria-hidden', 'false');
			if(!_isFixedPosition) {
				template.style.position = 'absolute';
				template.style.top = framework.getScrollY() + 'px';
			} else {
				template.style.position = 'fixed';
			}
		}

		if(_currentWindowScrollY === undefined) {
			_shout('initialLayout');
			_currentWindowScrollY = _initalWindowScrollY = framework.getScrollY();
		}

		// add classes to root element of PhotoSwipe
		var rootClasses = 'pswp--open ';
		if(_options.mainClass) {
			rootClasses += _options.mainClass + ' ';
		}
		if(_options.showHideOpacity) {
			rootClasses += 'pswp--animate_opacity ';
		}
		rootClasses += _likelyTouchDevice ? 'pswp--touch' : 'pswp--notouch';
		rootClasses += _features.animationName ? ' pswp--css_animation' : '';
		rootClasses += _features.svg ? ' pswp--svg' : '';
		framework.addClass(template, rootClasses);

		self.updateSize();


		// initial update
		_containerShiftIndex = -1;
		_indexDiff = null;
		for(i = 0; i < NUM_HOLDERS; i++) {
			_setTranslateX( (i+_containerShiftIndex) * _slideSize.x, _itemHolders[i].el.style);
		}



		if(!_oldIE) {
			framework.bind(self.scrollWrap, _downEvents, self); // no dragging for old IE
		}

		_listen('initialZoomInEnd', function() {
			self.setContent(_itemHolders[0], _currentItemIndex-1);
		 	self.setContent(_itemHolders[2], _currentItemIndex+1);

		 	_itemHolders[0].el.style.display = _itemHolders[2].el.style.display = 'block';

		 	if(_options.focus) {
		 		// focus causes layout, which causes lag during animation, that's why we delay it till the initial zoom transition ends
				template.focus();
		 	}


			_bindEvents();
		});

		self.setContent(_itemHolders[1], _currentItemIndex);

		self.updateCurrItem();

		_shout('afterInit');

		if(!_isFixedPosition) {
			// On all versions of iOS lower than 8.0, we check size of viewport every second
			// This is done to detect when Safari top & bottom bars appear, as this action doesn't trigger any events (like resize).
			// On iOS8 they fixed this.
			// 10 Nov 2014: iOS 7 usage ~40%. iOS 8 usage 56%.
			_updateSizeInterval = setInterval(function() {
				if(!_numAnimations && !_isDragging && !_isZooming && (_currZoomLevel === self.currItem.initialZoomLevel)  ) {
					self.updateSize();
				}
			}, 1000);
		}

		framework.addClass(template, 'pswp--visible');
	},

	// Closes the gallery, then destroy it
	close: function() {
		if(!_isOpen) return;

		_isOpen = false;
		_isDestroying = true;
		_shout('close');
		_unbindEvents();

		_showOrHide( self.currItem, null, true, self.destroy);
	},

	// destroys gallery (unbinds events, cleans up intervals and timeouts to avoid memory leaks)
	destroy: function() {
		_shout('destroy');

		if(_showOrHideTimeout) {
			clearTimeout(_showOrHideTimeout);
		}

		if(_options.modal) {
			template.setAttribute('aria-hidden', 'true');
			template.className = _initalClassName;
		}

		if(_updateSizeInterval) {
			clearInterval(_updateSizeInterval);
		}

		framework.unbind(self.scrollWrap, _downEvents, self);

		// we unbind lost event at the end, as closing animation may depend on it
		framework.unbind(window, 'scroll', self);

		_stopDragUpdateLoop();

		_stopAllAnimations();

		_listeners = null;
	},

	// TODO: pan via mousemove instead of drag?
	// mouseMovePan: function(x,y) {
	//
	// 	if(!isMouseMoving) {
	// 		forceRenderMovement = true;
	// 		isMouseMoving = true;
	// 	}
	// 	// 60 px is the starting coordinate
	// 	// e.g. if width of window is 1024px, mouse move will work from 60px to 964px (1024 - 60)
	// 	var DIST = 60;
	// 	var percentX = 1 - x / (_viewportSize.x - DIST*2) + DIST/(_viewportSize.x-DIST*2),
	// 		percentY = 1 - y / (_viewportSize.y - DIST*2) + DIST/(_viewportSize.y-DIST*2);
	// 	mouseMovePos.x = (_currPanBounds.min.x - _currPanBounds.max.x) * percentX - _currPanBounds.min.x;
	// 	mouseMovePos.y = (_currPanBounds.min.y - _currPanBounds.max.y) * percentY - _currPanBounds.min.y;
	// },

	/**
	 * Pan image to position
	 * @param  {Number}  x
	 * @param  {Number}  y
	 * @param  {Boolean} force 	Will ignore bounds if set to true.
	 */
	panTo: function(x,y,force) {
		if(!force) {
			if(x > _currPanBounds.min.x) {
				x = _currPanBounds.min.x;
			} else if(x < _currPanBounds.max.x) {
				x = _currPanBounds.max.x;
			}

			if(y > _currPanBounds.min.y) {
				y = _currPanBounds.min.y;
			} else if(y < _currPanBounds.max.y) {
				y = _currPanBounds.max.y;
			}
		}

		_panOffset.x = x;
		_panOffset.y = y;
		_applyCurrentZoomPan();
	},

	handleEvent: function (e) {
		e = e || window.event;
		if(_globalEventHandlers[e.type]) {
			_globalEventHandlers[e.type](e);
		}
	},


	goTo: function(index) {

		index = _getLoopedId(index);

		var diff = index - _currentItemIndex;
		_indexDiff = diff;

		_currentItemIndex = index;
		self.currItem = _getItemAt( _currentItemIndex );
		_currPositionIndex -= diff;

		_moveMainScroll(_slideSize.x * _currPositionIndex);


		_stopAllAnimations();
		_mainScrollAnimating = false;

		self.updateCurrItem();
	},
	next: function() {
		self.goTo( _currentItemIndex + 1);
	},
	prev: function() {
		self.goTo( _currentItemIndex - 1);
	},

	updateCurrItem: function(beforeAnimation) {

		if(_indexDiff === 0) {
			return;
		}

		var diffAbs = Math.abs(_indexDiff),
			tempHolder;

		if(beforeAnimation && diffAbs < 2) {
			return;
		}


		self.currItem = _getItemAt( _currentItemIndex );

		_shout('beforeChange', _indexDiff);

		if(diffAbs >= NUM_HOLDERS) {
			_containerShiftIndex += _indexDiff + (_indexDiff > 0 ? -NUM_HOLDERS : NUM_HOLDERS);
			diffAbs = NUM_HOLDERS;
		}
		for(var i = 0; i < diffAbs; i++) {
			if(_indexDiff > 0) {
				tempHolder = _itemHolders.shift();
				_itemHolders[NUM_HOLDERS-1] = tempHolder; // move first to last

				_containerShiftIndex++;
				_setTranslateX( (_containerShiftIndex+2) * _slideSize.x, tempHolder.el.style);
				self.setContent(tempHolder, _currentItemIndex - diffAbs + i + 1 + 1);
			} else {
				tempHolder = _itemHolders.pop();
				_itemHolders.unshift( tempHolder ); // move last to first

				_containerShiftIndex--;
				_setTranslateX( _containerShiftIndex * _slideSize.x, tempHolder.el.style);
				self.setContent(tempHolder, _currentItemIndex + diffAbs - i - 1 - 1);
			}

		}

		// reset zoom/pan on previous item
		if(_currZoomElementStyle && Math.abs(_indexDiff) === 1) {

			var prevItem = _getItemAt(_prevItemIndex);
			if(prevItem.initialZoomLevel !== _currZoomLevel) {
				_calculateItemSize(prevItem , _viewportSize );
				_applyZoomPanToItem( prevItem );

			}

		}

		// itemHolder[1] is middle (current) item
		if(_itemHolders[1].el.children.length) {
			var zoomElement = _itemHolders[1].el.children[0];
			if( framework.hasClass(zoomElement, 'pswp__zoom-wrap') ) {
				_currZoomElementStyle = zoomElement.style;
			} else {
				_currZoomElementStyle = null;
			}
		} else {
			_currZoomElementStyle = null;
		}

		// reset diff after update
		_indexDiff = 0;

		_currPanBounds = self.currItem.bounds;
		_startZoomLevel = _currZoomLevel = self.currItem.initialZoomLevel;

		_panOffset.x = _currPanBounds.center.x;
		_panOffset.y = _currPanBounds.center.y;

		_prevItemIndex = _currentItemIndex;

		_shout('afterChange');
	},




	updateSize: function(force) {

		if(!_isFixedPosition) {
			var windowScrollY = framework.getScrollY();
			if(_currentWindowScrollY !== windowScrollY) {
				template.style.top = windowScrollY + 'px';
				_currentWindowScrollY = windowScrollY;
			}
			if(!force && _windowVisibleSize.x === window.innerWidth && _windowVisibleSize.y === window.innerHeight) {
				return;
			}
			_windowVisibleSize.x = window.innerWidth;
			_windowVisibleSize.y = window.innerHeight;

			//template.style.width = _windowVisibleSize.x + 'px';
			template.style.height = _windowVisibleSize.y + 'px';
		}

		_viewportSize.x = self.scrollWrap.clientWidth;
		_viewportSize.y = self.scrollWrap.clientHeight;


		_offset = {x:0,y:_currentWindowScrollY};//framework.getOffset(template);

		_slideSize.x = _viewportSize.x + Math.round(_viewportSize.x * _options.spacing);
		_slideSize.y = _viewportSize.y;

		_moveMainScroll(_slideSize.x * _currPositionIndex);

		// don't re-calculate size on inital size update
		if(_containerShiftIndex !== undefined) {
			for(var i = 0; i < NUM_HOLDERS; i++) {
				_setTranslateX( (i+_containerShiftIndex) * _slideSize.x, _itemHolders[i].el.style);

				// update zoom level on items
				var index = _getLoopedId( _currentItemIndex - 1 + i );
				var item = _getItemAt(index);
				if(item && item.container) {
					_calculateItemSize(item, _viewportSize);
					_applyZoomPanToItem( item );
				}

			}
		}

		_startZoomLevel = _currZoomLevel = self.currItem.initialZoomLevel;
		_currPanBounds = self.currItem.bounds;

		if(_currPanBounds) {
			_panOffset.x = _currPanBounds.center.x;
			_panOffset.y = _currPanBounds.center.y;
			_applyCurrentZoomPan();
		}

		_shout('resize');
	},

	//Zoom current item to
	zoomTo: function(destZoomLevel, centerPoint, speed, easingFn, updateFn) {

		// if(destZoomLevel == 'fit') {
		// 	destZoomLevel = self.currItem.fitRatio;
		// } else if(destZoomLevel == 'fill') {
		// 	destZoomLevel = self.currItem.fillRatio;
		// }

		if(centerPoint) {
			_startZoomLevel = _currZoomLevel;
			_midZoomPoint.x = Math.abs(centerPoint.x) - _panOffset.x ;
			_midZoomPoint.y = Math.abs(centerPoint.y) - _panOffset.y ;
			_equalizePoints(_startPanOffset, _panOffset);
		}

		var destPanBounds = _calculatePanBounds(destZoomLevel, false),
			destPanOffset = {};

		_isOutOfBounds('x', destPanBounds, destPanOffset, destZoomLevel),
		_isOutOfBounds('y', destPanBounds, destPanOffset, destZoomLevel);

		var initialZoomLevel = _currZoomLevel;
		var initialPanOffset = {
			x: _panOffset.x,
			y: _panOffset.y
		};

		//_startZoomLevel = destZoomLevel;
		var onUpdate = function(now) {
			if(now === 1) {
				_currZoomLevel = destZoomLevel;
				_panOffset.x = destPanOffset.x;
				_panOffset.y = destPanOffset.y;
			} else {
				_currZoomLevel = (destZoomLevel - initialZoomLevel) * now + initialZoomLevel;
				_panOffset.x = (destPanOffset.x - initialPanOffset.x) * now + initialPanOffset.x;
				_panOffset.y = (destPanOffset.y - initialPanOffset.y) * now + initialPanOffset.y;
			}

			if(updateFn) {
				updateFn(now);
			}

			_applyCurrentZoomPan();
		};

		if(speed) {
			_animateProp('customZoomTo', 0, 1, speed, easingFn || framework.easing.sine.inOut, onUpdate);
		} else {
			onUpdate(1);
		}
	}


};






/*>>core*/

/*>>down-move-up-handlers*/
/**
 * Mouse/touch/pointer event handlers.
 *
 * separated from @core.js for readability
 */

var MIN_SWIPE_DISTANCE = 30,
	DIRECTION_CHECK_OFFSET = 10; // amount of pixels to drag to determine direction of swipe

var _gestureStartTime,
	_gestureCheckSpeedTime,

	// pool of objects that are used during dragging of zooming
	p = {}, // first point
	p2 = {}, // second point (for zoom gesture)
	delta = {},


	_currPoint = {},
	_startPoint = {},

	_currPointers = [],
	_startMainScrollPos = {},

	_releaseAnimData,

	_posPoints = [], // array of points during dragging, used to determine type of gesture

	_isZoomingIn,

	_tempPoint = {},

	_verticalDragInitiated,

	_isDragging, // at least one pointer is down
	_isMultitouch, // at least two _pointers are down
	_zoomStarted, // zoom level changed during zoom gesture
	_moved,
	_dragAnimFrame,
	_mainScrollShifted,
	_currentPoints, // array of current touch points
	_isZooming,
	_currPointsDistance,
	_startPointsDistance,
	_currPanBounds,
	_mainScrollPos = _getEmptyPoint(),
	_currZoomElementStyle,
	_mainScrollAnimating, // true, if animation after swipe gesture is running
	_midZoomPoint = _getEmptyPoint(),
	_currCenterPoint = _getEmptyPoint(),
	_direction,
	_offset,
	_isFirstMove,
	_opacityChanged,
	_bgOpacity,
	_wasOverInitialZoom,

	_calculatePointsDistance = function(p1, p2) {
		_tempPoint.x = Math.abs( p1.x - p2.x );
		_tempPoint.y = Math.abs( p1.y - p2.y );
		return Math.sqrt(_tempPoint.x * _tempPoint.x + _tempPoint.y * _tempPoint.y);
	},


	_stopDragUpdateLoop = function() {
		if(_dragAnimFrame) {
			_cancelAF(_dragAnimFrame);
			_dragAnimFrame = null;
		}
	},
	_dragUpdateLoop = function() {
		if(_isDragging) {
			_dragAnimFrame = _requestAF(_dragUpdateLoop);
			_renderMovement();
		}
	},
	_canPan = function() {
		return !(_options.scaleMode === 'fit' && _currZoomLevel ===  self.currItem.initialZoomLevel);
	},
	_preventObj = {},
	_preventDefaultEventBehavior = function(e, isDown) {

		_preventObj.prevent = e.target.tagName !== 'A';
		_shout('preventDragEvent', e, isDown, _preventObj);
		return _preventObj.prevent;

	},
	_convertTouchToPoint = function(touch, p) {
		p.x = touch.pageX;
		p.y = touch.pageY;
		p.id = touch.identifier;
		return p;
	},
	_findCenterOfPoints = function(p1, p2, pCenter) {
		pCenter.x = (p1.x + p2.x) * 0.5;
		pCenter.y = (p1.y + p2.y) * 0.5;
	},
	_pushPosPoint = function(time, x, y) {
		if(time - _gestureCheckSpeedTime > 50) {
			var o = _posPoints.length > 2 ? _posPoints.shift() : {};
			o.x = x;
			o.y = y;
			_posPoints.push(o);
			_gestureCheckSpeedTime = time;
		}
	},

	_calculateVerticalDragOpacityRatio = function() {
		var yOffset = _panOffset.y - self.currItem.initialPosition.y; // difference between initial and current position
		return 1 -  Math.abs( yOffset / (_viewportSize.y / 2)  );
	},


	// points pool, reused during touch events
	_ePoint1 = {},
	_ePoint2 = {},
	_tempPointsArr = [],
	_tempCounter,
	_getTouchPoints = function(e) {
		// clean up previous points, without recreating array
		while(_tempPointsArr.length > 0) {
		    _tempPointsArr.pop();
		}

		if(!_pointerEventEnabled) {
			if(e.type.indexOf('touch') > -1) {

				if(e.touches && e.touches.length > 0) {
					_tempPointsArr[0] = _convertTouchToPoint(e.touches[0], _ePoint1);
					if(e.touches.length > 1) {
						_tempPointsArr[1] = _convertTouchToPoint(e.touches[1], _ePoint2);
					}
				}

			} else {
				_ePoint1.x = e.pageX;
				_ePoint1.y = e.pageY;
				_ePoint1.id = '';
				_tempPointsArr[0] = _ePoint1;//_ePoint1;
			}
		} else {
			_tempCounter = 0;
			// we can use forEach, as pointer events are supported only in modern browsers
			_currPointers.forEach(function(p) {
				if(_tempCounter === 0) {
					_tempPointsArr[0] = p;
				} else if(_tempCounter === 1) {
					_tempPointsArr[1] = p;
				}
				_tempCounter++;

			});
		}
		return _tempPointsArr;
	},

	_panOrMoveMainScroll = function(axis, delta) {


		var panFriction;

		var overDiff = 0;
		var newOffset = _panOffset[axis] + delta[axis];
		var startOverDiff;
		var dir = delta[axis] > 0;


		var newMainScrollPosition = _mainScrollPos.x + delta.x;
		var mainScrollDiff = _mainScrollPos.x - _startMainScrollPos.x;



		// calculate fdistance over the bounds and friction
		if(newOffset > _currPanBounds.min[axis] || newOffset < _currPanBounds.max[axis]) {
			panFriction = _options.panEndFriction;
			//  Linear increasing of friction, so at 1/4 of viewport it's at max value. Looks not as nice as was expected. Left for history.
			//	panFriction = (1 - (_panOffset[axis] + delta[axis] + panBounds.min[axis]) / (_viewportSize[axis] / 4) );
		} else {
			panFriction = 1;
		}


		newOffset = _panOffset[axis] + delta[axis] * panFriction;



		var newPanPos;
		var newMainScrollPos;


		// move main scroll or start panning
		if(_options.allowPanToNext || _currZoomLevel === self.currItem.initialZoomLevel) {


			if(!_currZoomElementStyle) {

				newMainScrollPos = newMainScrollPosition;

			} else if(_direction === 'h' && axis === 'x' && !_zoomStarted ) {

				if(dir) {
					if(newOffset > _currPanBounds.min[axis]) {
						panFriction = _options.panEndFriction;
						overDiff = _currPanBounds.min[axis] - newOffset;
						startOverDiff = _currPanBounds.min[axis] - _startPanOffset[axis];
					}

					// drag right
					if( (startOverDiff <= 0 || mainScrollDiff < 0) && _getNumItems() > 1 ) {
						newMainScrollPos = newMainScrollPosition;
						if(mainScrollDiff < 0 && newMainScrollPosition > _startMainScrollPos.x) {
							newMainScrollPos = _startMainScrollPos.x;
						}
					} else {
						if(_currPanBounds.min.x !== _currPanBounds.max.x) {
							newPanPos = newOffset;
						}

					}

				} else {

					if(newOffset < _currPanBounds.max[axis] ) {
						panFriction =_options.panEndFriction;
						overDiff = newOffset - _currPanBounds.max[axis];
						startOverDiff = _startPanOffset[axis] - _currPanBounds.max[axis];
					}

					if( (startOverDiff <= 0 || mainScrollDiff > 0) && _getNumItems() > 1 ) {
						newMainScrollPos = newMainScrollPosition;

						if(mainScrollDiff > 0 && newMainScrollPosition < _startMainScrollPos.x) {
							newMainScrollPos = _startMainScrollPos.x;
						}

					} else {
						if(_currPanBounds.min.x !== _currPanBounds.max.x) {
							newPanPos = newOffset;
						}
					}

				}


				//
			}

			if(axis === 'x') {

				if(newMainScrollPos !== undefined) {
					_moveMainScroll(newMainScrollPos, true);


					if(newMainScrollPos === _startMainScrollPos.x) {
						_mainScrollShifted = false;
					} else {
						_mainScrollShifted = true;
					}

				}

				if(_currPanBounds.min.x !== _currPanBounds.max.x) {

					if(newPanPos !== undefined) {
						_panOffset.x = newPanPos;
					} else if(!_mainScrollShifted) {
						_panOffset.x += delta.x * panFriction;
					}

				} //else {
				//	return true;
				//}

				return newMainScrollPos !== undefined;
			}

		}

		// if(!_mainScrollAnimating) {
		// 	_panOffset[axis] = newOffset;

		if(!_mainScrollAnimating) {

			if(!_mainScrollShifted) {

				//if(_currPanBounds.min.x !== _currPanBounds.max.x && _currPanBounds.min.y !== _currPanBounds.max.y) {
				//	_panOffset[axis] += delta[axis] * panFriction;
				//}


				//if(_currPanBounds.min[axis] !== _currPanBounds.max[axis] ) {
				if(_currZoomLevel > self.currItem.fitRatio) {
					_panOffset[axis] += delta[axis] * panFriction;

				}

				// if(_currPanBounds.min.y !== _currPanBounds.max.y ) {
				// 	_panOffset.y += delta.y * panFriction;
				// }
			}


		}


		// }

		// if(axis{
		// 	_panOffset.y = _panOffset.y + delta.y * panFriction;
		// }

	},


	/**
	 * Pointerdown/touchstart/mousedown handler
	 */
	_onDragStart = function(e) {


		if(_initialZoomRunning) {
			e.preventDefault();
			return;
		}




		if(_preventDefaultEventBehavior(e, true)) {
			e.preventDefault();
		}



		_shout('pointerDown');

		if(_pointerEventEnabled) {
			var pointerIndex = framework.arraySearch(_currPointers, e.pointerId, 'id');
			if(pointerIndex < 0) {
				pointerIndex = _currPointers.length;
			}
			_currPointers[pointerIndex] = {x:e.pageX, y:e.pageY, id: e.pointerId};
		}



		var startPointsList = _getTouchPoints(e),
			numPoints = startPointsList.length;

		_currentPoints = null;

		_stopAllAnimations();

		// init drag
		if(!_isDragging || numPoints === 1) {



			_isDragging = _isFirstMove = true;
			framework.bind(window, _upMoveEvents, self);

			_isZoomingIn = _wasOverInitialZoom = _opacityChanged = _verticalDragInitiated = _mainScrollShifted = _moved = _isMultitouch = _zoomStarted = false;
			_direction = null;

			_shout('firstTouchStart', startPointsList);

			_equalizePoints(_startPanOffset, _panOffset);

			_currPanDist.x = _currPanDist.y = 0;
			_equalizePoints(_currPoint, startPointsList[0]);
			_equalizePoints(_startPoint, _currPoint);

			//_equalizePoints(_startMainScrollPos, _mainScrollPos);
			_startMainScrollPos.x = _slideSize.x * _currPositionIndex;

			_posPoints = [{
				x: _currPoint.x,
				y: _currPoint.y
			}];

			_gestureCheckSpeedTime = _gestureStartTime = _getCurrentTime();

			//_mainScrollAnimationEnd(true);
			_calculatePanBounds( _currZoomLevel, true );

			// Start rendering
			_stopDragUpdateLoop();
			_dragUpdateLoop();

		}

		// init zoom
		if(!_isZooming && numPoints > 1 && !_mainScrollAnimating && !_mainScrollShifted) {
			_startZoomLevel = _currZoomLevel;
			_zoomStarted = false; // true if zoom changed at least once

			_isZooming = _isMultitouch = true;
			_currPanDist.y = _currPanDist.x = 0;

			_equalizePoints(_startPanOffset, _panOffset);

			_equalizePoints(p, startPointsList[0]);
			_equalizePoints(p2, startPointsList[1]);

			_findCenterOfPoints(p, p2, _currCenterPoint);

			_midZoomPoint.x = Math.abs(_currCenterPoint.x) - _panOffset.x;
			_midZoomPoint.y = Math.abs(_currCenterPoint.y) - _panOffset.y;
			_currPointsDistance = _startPointsDistance = _calculatePointsDistance(p, p2);
		}


	},
	/**
	 * Pointermove/touchmove/mousemove handler
	 */
	_onDragMove = function(e) {

		e.preventDefault();

		if(_pointerEventEnabled) {
			var pointerIndex = framework.arraySearch(_currPointers, e.pointerId, 'id');
			if(pointerIndex > -1) {
				var p = _currPointers[pointerIndex];
				p.x = e.pageX;
				p.y = e.pageY;
			}
		}

		if(_isDragging) {
			var touchesList = _getTouchPoints(e);
			if(!_direction && !_moved && !_isZooming) {
				var diff = Math.abs(touchesList[0].x - _currPoint.x) - Math.abs(touchesList[0].y - _currPoint.y);
				// check the direction of movement
				if(Math.abs(diff) >= DIRECTION_CHECK_OFFSET) {
					_direction = diff > 0 ? 'h' : 'v';
					_currentPoints = touchesList;
				}
			} else {
				_currentPoints = touchesList;
			}
		}

		// if(_direction === 'h' || !_direction) {
		// 	e.preventDefault();
		// } else {

		// }
	},
	//
	_renderMovement =  function() {

		if(!_currentPoints) {
			return;
		}

		var numPoints = _currentPoints.length;

		if(numPoints === 0) {
			return;
		}

		_equalizePoints(p, _currentPoints[0]);

		delta.x = p.x - _currPoint.x;
		delta.y = p.y - _currPoint.y;



		if(_isZooming && numPoints > 1) {
			// Handle behaviour for more than 1 point


			_currPoint.x = p.x;
			_currPoint.y = p.y;


			// check if one of two points changed
			if( !delta.x && !delta.y && _isEqualPoints(_currentPoints[1], p2) ) {
				return;
			}

			_equalizePoints(p2, _currentPoints[1]);


			if(!_zoomStarted) {
				_zoomStarted = true;
				_shout('zoomGestureStarted');
			}



			// Distance between two points
			var pointsDistance = _calculatePointsDistance(p,p2);

			var zoomLevel = _calculateZoomLevel(pointsDistance);


			// slightly over the of initial zoom level
			if(zoomLevel > self.currItem.initialZoomLevel + self.currItem.initialZoomLevel / 15) {
				_wasOverInitialZoom = true;
			}

			// Apply the friction if zoom level is out of the bounds
			var zoomFriction = 1;
			if ( zoomLevel < self.currItem.minZoom ) {

				if(_options.pinchToClose && !_wasOverInitialZoom && _startZoomLevel <= self.currItem.initialZoomLevel) {
					// fade out background if zooming out
					var minusDiff = self.currItem.minZoom - zoomLevel;
					var percent = 1 - minusDiff / (self.currItem.minZoom / 1.2);
					_applyBgOpacity(percent);
					_shout('onPinchClose', percent)
					_opacityChanged = true;
				} else {

					// 0.35 - extra zoom level below the min. E.g. if min is x1, real min will be 1 - 0.35 = 0.65
					zoomFriction = (self.currItem.minZoom - zoomLevel) / (self.currItem.minZoom /*0.35*/);
					if(zoomFriction > 1) {
						zoomFriction = 1;
					}
					zoomLevel = self.currItem.minZoom - (zoomFriction) * (self.currItem.minZoom / 3);

				}

			} else if ( zoomLevel > self.currItem.maxZoom ) {
				// 1.5 - extra zoom level above the max. E.g. if max is x6, real max 6 + 1.5 = 7.5
				zoomFriction = (zoomLevel - self.currItem.maxZoom) / ( self.currItem.minZoom * 6 /* 1.5 */ );
				if(zoomFriction > 1) {
					zoomFriction = 1;
				}
				zoomLevel = self.currItem.maxZoom + (zoomFriction) * (self.currItem.minZoom);
			}

			if(zoomFriction !== 1) {

				if(zoomFriction < 0) {
					zoomFriction = 0;
				}

			}

			// distance between touch points after friction is applied
			_currPointsDistance = pointsDistance;

			// _centerPoint - The point in the middle of two pointers
			_findCenterOfPoints(p, p2, _centerPoint);





			// paning with two pointers pressed
			_currPanDist.x += _centerPoint.x - _currCenterPoint.x;
			_currPanDist.y += _centerPoint.y - _currCenterPoint.y;
			_equalizePoints(_currCenterPoint, _centerPoint);

			_panOffset.x = _calculatePanOffset('x', zoomLevel);
			_panOffset.y = _calculatePanOffset('y', zoomLevel);

			_isZoomingIn = zoomLevel > _currZoomLevel;

			_currZoomLevel = zoomLevel;

			_applyCurrentZoomPan();

		} else {

			// handle behavior for one point (dragging or panning)

			// return if direction wasn't detected, or panning isn't possible
			// if(!_direction || (_direction === 'v' && !_canPan())  ) {
			// 	return;
			// }

			if(!_direction) {
				return;
			}



			// var verticalSwipe = false;
			// if(_direction === 'v') {
			// 	if(_options.vSwipeToClose) {

			// 		verticalSwipe = true;
			// 		//return;
			// 	} else if(!_canPan()) {
			// 		return;
			// 	}
			// }


			if(_isFirstMove) {
				_isFirstMove = false;

				//
				if( Math.abs(delta.x) >= DIRECTION_CHECK_OFFSET) {
					delta.x -= _currentPoints[0].x - _startPoint.x;
				}

				if( Math.abs(delta.y) >= DIRECTION_CHECK_OFFSET) {
					delta.y -= _currentPoints[0].y - _startPoint.y;
				}
			}




			_currPoint.x = p.x;
			_currPoint.y = p.y;



			// do nothing if pointers position hasn't changed
			if(delta.x === 0 && delta.y === 0) {
				return;
			}



			if(_direction === 'v' && _options.closeOnVerticalDrag) {
				if(!_canPan()) {

					_currPanDist.y += delta.y;
					_panOffset.y += delta.y;

					//var yOffset = _panOffset.y - self.currItem.initialPosition.y; // difference between initial and current position
					var opacityRatio = _calculateVerticalDragOpacityRatio();  //1 -  Math.abs( yOffset / (_viewportSize.y / 2)  );

					//if(opacityRatio === 1) {
						_verticalDragInitiated = true;
					//}
					_shout('onVerticalDrag', opacityRatio);

					_applyBgOpacity(opacityRatio);
					_applyCurrentZoomPan();
					return ;
				}
			}

			_pushPosPoint(_getCurrentTime(), p.x, p.y);

			_moved = true;

			// if(verticalSwipe) {
			// 	_panOffset.y += delta.y;
			// 	var yOffsetDiff = Math.abs(_panOffset.y - self.currItem.initialPosition.y);
			// 	var bgOpacity = 1 - Math.min(yOffsetDiff,450)/450;
			// 	_shout('onVerticalDrag', bgOpacity);
			// 	_applyBgOpacity(bgOpacity);
			// 	//template.style.opacity = bgOpacity;
			// 	_applyCurrentZoomPan();
			// 	return;
			// }

			// if(_mainScrollShifted) {
			// 	_moveMainScrollBy(delta);
			// 	return;
			// }

			_currPanBounds = self.currItem.bounds;

			var mainScrollChanged = _panOrMoveMainScroll('x', delta);
			if(!mainScrollChanged) {
				_panOrMoveMainScroll('y', delta);
			}
			//if(!_mainScrollShifted) {

				_applyCurrentZoomPan();
			//}



		}

	},

	/**
	 * Pointerup/pointercancel/touchend/touchcancel/mouseup event handler
	 */
	_onDragRelease = function(e) {

		_shout('pointerUp');

		if(_preventDefaultEventBehavior(e, false)) {
			e.preventDefault();
		}

		var releasePoint;

		if(_pointerEventEnabled) {
			var pointerIndex = framework.arraySearch(_currPointers, e.pointerId, 'id');
			if(pointerIndex > -1) {
				releasePoint = _currPointers.splice(pointerIndex, 1)[0];

				if(navigator.pointerEnabled) {
					releasePoint.type = e.pointerType || 'mouse';
				} else {

					var MSPOINTER_TYPES = {
						4: 'mouse', /* event.MSPOINTER_TYPE_MOUSE */
						2: 'touch', /* event.MSPOINTER_TYPE_TOUCH */
						3: 'pen' /* event.MSPOINTER_TYPE_PEN */
					};
					releasePoint.type = MSPOINTER_TYPES[e.pointerType];
					if(!releasePoint.type) {
						releasePoint.type = e.pointerType || 'mouse';
					}

				}

			}
		}

		var touchList = _getTouchPoints(e),
			gestureType,
			numPoints = touchList.length;


		if(e.type === 'mouseup') {
			numPoints = 0;
		}



		// Do nothing if there were 3 touch points or more
		if(numPoints === 2) {
			_currentPoints = null;
			return true;
		}

		// if second pointer released
		if(numPoints === 1) {
			_equalizePoints(_startPoint, touchList[0]);
		}


		// pointer hasn't moved, send "tap release" point
		if(numPoints === 0 && !_direction && !_mainScrollAnimating) {
			if(!releasePoint) {
				if(e.type === 'mouseup') {
					releasePoint = {x: e.pageX, y: e.pageY, type:'mouse'};
				} else if(e.changedTouches && e.changedTouches[0]) {
					releasePoint = {x: e.changedTouches[0].pageX, y: e.changedTouches[0].pageY, type:'touch'};
				}
			}
			_shout('touchRelease', e, releasePoint);
		}



		// Difference in time between releasing of two last touch points (zoom gesture)
		var releaseTimeDiff = -1;

		// Gesture completed, no pointers left
		if(numPoints === 0) {
			_isDragging = false;
			framework.unbind(window, _upMoveEvents, self);

			_stopDragUpdateLoop();

			if(_isZooming) {
				// Two points released at the same time
				releaseTimeDiff = 0;
			} else if(_lastReleaseTime !== -1) {
				releaseTimeDiff = _getCurrentTime() - _lastReleaseTime;
			}
		}
		_lastReleaseTime = numPoints === 1 ? _getCurrentTime() : -1;

		if(releaseTimeDiff !== -1 && releaseTimeDiff < 150) {
			gestureType = 'zoom';
		} else {
			gestureType = 'swipe';
		}




		if(_isZooming && numPoints < 2) {
			_isZooming = false;


			// Only second point released
			if(numPoints === 1) {
				gestureType = 'zoomPointerUp';
			}
			_shout('zoomGestureEnded');
		}



		_currentPoints = null;
		if(!_moved && !_zoomStarted && !_mainScrollAnimating && !_verticalDragInitiated) {
			// nothing to animate
			return;
		}

		_stopAllAnimations();


		if(!_releaseAnimData) {
			_releaseAnimData = _initDragReleaseAnimationData();
		}

		_releaseAnimData.calculateSwipeSpeed('x');


		if(_verticalDragInitiated) {

			var opacityRatio = _calculateVerticalDragOpacityRatio();

			if(opacityRatio < 0.6) {
				self.close();
			} else {
				//_panOffset.y = self.currItem.initialPosition.y;
				//animateProp('verticalDrag', _mainScrollPos.x, animateToX, finishAnimDuration, framework.easing.cubic.out);

				var initalPanY = _panOffset.y,
					initialBgOpacity = _bgOpacity;

				_animateProp('verticalDrag', 0, 1,/*_panOffset.y, self.currItem.initialPosition.y,*/ 300, framework.easing.cubic.out, function(now) {

					_panOffset.y = (self.currItem.initialPosition.y - initalPanY) * now + initalPanY;

					_applyBgOpacity(  (1 - initialBgOpacity) * now + initialBgOpacity );
					_applyCurrentZoomPan();
				});

				_shout('onVerticalDrag', 1);
			}



			return;
		}


		// main scroll
		if(  (_mainScrollShifted || _mainScrollAnimating) && numPoints === 0) {
			var itemChanged = _finishSwipeMainScrollGesture(gestureType, _releaseAnimData);
			if(itemChanged) {
				return;
			}
			gestureType = 'zoomPointerUp';
		}


		// prevent zoom/pan animation when main scroll animation runs
		if(_mainScrollAnimating) {
			return;
		}


		// Complete simple zoom gesture (reset zoom level if it's out of the bounds)
		if(gestureType !== 'swipe') {
			_completeZoomGesture();
			return;
		}

		// Complete pan gesture if main scroll is not shifted, and it's possible to pan current image
		if(!_mainScrollShifted && _currZoomLevel > self.currItem.fitRatio) {
			_completePanGesture(_releaseAnimData);
		}
	},


	/**
	 * Returns object with data & functions for drag release
	 * It's created only once and then reused
	 * @return {Object}
	 */
	_initDragReleaseAnimationData  = function() {
		// temp local vars
		var lastFlickDuration,
			tempReleasePos;

		// s = this
		var s = {
			lastFlickOffset: {},
			lastFlickDist: {},
			lastFlickSpeed: {},
			slowDownRatio:  {},
			slowDownRatioReverse:  {},
			speedDecelerationRatio:  {},
			speedDecelerationRatioAbs:  {},
			distanceOffset:  {},
			backAnimDestination: {},
			backAnimStarted: {},
			calculateSwipeSpeed: function(axis) {


				if( _posPoints.length > 1) {
					lastFlickDuration = _getCurrentTime() - _gestureCheckSpeedTime + 50;
					tempReleasePos = _posPoints[_posPoints.length-2][axis];
				} else {
					lastFlickDuration = _getCurrentTime() - _gestureStartTime; // total gesture duration
					tempReleasePos = _startPoint[axis];
				}
				s.lastFlickOffset[axis] = _currPoint[axis] - tempReleasePos;
				s.lastFlickDist[axis] = Math.abs(s.lastFlickOffset[axis]);
				if(s.lastFlickDist[axis] > 20) {
					s.lastFlickSpeed[axis] = s.lastFlickOffset[axis] / lastFlickDuration;
				} else {
					s.lastFlickSpeed[axis] = 0;
				}
				if( Math.abs(s.lastFlickSpeed[axis]) < 0.1 ) {
					s.lastFlickSpeed[axis] = 0;
				}

				s.slowDownRatio[axis] = 0.95;
				s.slowDownRatioReverse[axis] = 1 - s.slowDownRatio[axis];
				s.speedDecelerationRatio[axis] = 1;
			},

			calculateOverBoundsAnimOffset: function(axis, speed) {
				if(!s.backAnimStarted[axis]) {

					if(_panOffset[axis] > _currPanBounds.min[axis]) {
						s.backAnimDestination[axis] = _currPanBounds.min[axis];

					} else if(_panOffset[axis] < _currPanBounds.max[axis]) {
						s.backAnimDestination[axis] = _currPanBounds.max[axis];
					}

					if(s.backAnimDestination[axis] !== undefined) {
						s.slowDownRatio[axis] = 0.7;
						s.slowDownRatioReverse[axis] = 1 - s.slowDownRatio[axis];
						if(s.speedDecelerationRatioAbs[axis] < 0.05) {
							s.lastFlickSpeed[axis] = 0;
							s.backAnimStarted[axis] = true;
							_animateProp('bounceZoomPan'+axis,_panOffset[axis], s.backAnimDestination[axis], speed || 300, framework.easing.sine.out, function(pos) {
								_panOffset[axis] = pos;
								_applyCurrentZoomPan();
							});

						}
					}
				}
			},

			// Reduces the speed by slowDownRatio (per 10ms)
			calculateAnimOffset: function(axis) {
				if(!s.backAnimStarted[axis]) {
					s.speedDecelerationRatio[axis] = s.speedDecelerationRatio[axis] * (s.slowDownRatio[axis] + s.slowDownRatioReverse[axis] - s.slowDownRatioReverse[axis] * s.timeDiff / 10);
					s.speedDecelerationRatioAbs[axis] = Math.abs(s.lastFlickSpeed[axis] * s.speedDecelerationRatio[axis]);
					s.distanceOffset[axis] = s.lastFlickSpeed[axis] * s.speedDecelerationRatio[axis] * s.timeDiff;
					_panOffset[axis] += s.distanceOffset[axis];
				}
			},

			panAnimLoop: function() {
				if ( _animations.zoomPan ) {
					_animations.zoomPan.raf = _requestAF(s.panAnimLoop);

					s.now = _getCurrentTime();
					s.timeDiff = s.now - s.lastNow;
					s.lastNow = s.now;

					s.calculateAnimOffset('x');
					s.calculateAnimOffset('y');

					_applyCurrentZoomPan();

					s.calculateOverBoundsAnimOffset('x');
					s.calculateOverBoundsAnimOffset('y');


					if (s.speedDecelerationRatioAbs.x < 0.05 && s.speedDecelerationRatioAbs.y < 0.05) {
						_stopAnimation('zoomPan');
						return;
					}
				}

			}
		};
		return s;
	},

	_completePanGesture = function(animData) {
		// calculate swipe speed for Y axis (paanning)
		animData.calculateSwipeSpeed('y');

		_currPanBounds = self.currItem.bounds;

		animData.backAnimDestination = {};
		animData.backAnimStarted = {};

		// Avoid acceleration animation if speed is too low
		if(Math.abs(animData.lastFlickSpeed.x) <= 0.05 && Math.abs(animData.lastFlickSpeed.y) <= 0.05 ) {
			animData.speedDecelerationRatioAbs.x = animData.speedDecelerationRatioAbs.y = 0;

			// Run pan drag release animation. E.g. if you drag image and release finger without momentum.
			animData.calculateOverBoundsAnimOffset('x');
			animData.calculateOverBoundsAnimOffset('y');
			return true;
		}

		// Animation loop that controls the acceleration after pan gesture ends
		_registerStartAnimation('zoomPan');
		animData.lastNow = _getCurrentTime();
		animData.panAnimLoop();
	},


	_finishSwipeMainScrollGesture = function(gestureType, _releaseAnimData) {
		var itemChanged;
		if(!_mainScrollAnimating) {
			_currZoomedItemIndex = _currentItemIndex;
		}



		var itemsDiff;

		if(gestureType === 'swipe') {
			var totalShiftDist = _currPoint.x - _startPoint.x;

			// if container is shifted for more than MIN_SWIPE_DISTANCE, and last flick gesture was in right direction
			if(totalShiftDist > MIN_SWIPE_DISTANCE && (_releaseAnimData.lastFlickDist.x < 10 || _releaseAnimData.lastFlickOffset.x > 20)  ) {
				// go to prev item
				itemsDiff = -1;
			} else if(totalShiftDist < -MIN_SWIPE_DISTANCE && (_releaseAnimData.lastFlickDist.x < 10 || _releaseAnimData.lastFlickOffset.x < -20) ) {

				itemsDiff = 1;
			}
		}

		var nextCircle;

		if(itemsDiff) {

			_currentItemIndex += itemsDiff;

			if(_currentItemIndex < 0) {
				_currentItemIndex = _options.loop ? _getNumItems()-1 : 0;
				nextCircle = true;
			} else if(_currentItemIndex >= _getNumItems()) {
				_currentItemIndex = _options.loop ? 0 : _getNumItems()-1;
				nextCircle = true;
			}

			if(!nextCircle || _options.loop) {
				_indexDiff += itemsDiff;
				_currPositionIndex -= itemsDiff;
				itemChanged = true;
			}



		}

		var animateToX = _slideSize.x * _currPositionIndex;
		var animateToDist = Math.abs( animateToX - _mainScrollPos.x );
		var finishAnimDuration;


		if(!itemChanged && animateToX > _mainScrollPos.x !== _releaseAnimData.lastFlickSpeed.x > 0) {
			finishAnimDuration = 333; // return to current speed (e.g. when dragging from slide #0 to #-1)
		} else {
			finishAnimDuration = Math.abs(_releaseAnimData.lastFlickSpeed.x) > 0 ? animateToDist / Math.abs(_releaseAnimData.lastFlickSpeed.x) : 333;
			finishAnimDuration = Math.min(finishAnimDuration, 400);
			finishAnimDuration = Math.max(finishAnimDuration, 250);
		}

		if(_currZoomedItemIndex === _currentItemIndex) {
			itemChanged = false;
		}

		_mainScrollAnimating = true;




		_animateProp('mainScroll', _mainScrollPos.x, animateToX, finishAnimDuration, framework.easing.cubic.out,
			_moveMainScroll,
			function() {
				_stopAllAnimations();
				_mainScrollAnimating = false;
				_currZoomedItemIndex = -1;

				if(itemChanged || _currZoomedItemIndex !== _currentItemIndex) {
					self.updateCurrItem();
				}

				_shout('mainScrollAnimComplete');
			}
		);


		if(itemChanged) {
			self.updateCurrItem(true);
		}

		return itemChanged;
	},

	/**
	 * Resets zoom if it's out of bounds
	 */
	_completeZoomGesture = function() {
		var destZoomLevel = _currZoomLevel;

		if ( _currZoomLevel < self.currItem.minZoom ) {
			destZoomLevel = self.currItem.minZoom;
		} else if ( _currZoomLevel > self.currItem.maxZoom ) {
			destZoomLevel = self.currItem.maxZoom;
		}

		var destOpacity = 1,
			onUpdate,
			initialOpacity = _bgOpacity;

		if(_opacityChanged && !_isZoomingIn && !_wasOverInitialZoom && _currZoomLevel < self.currItem.minZoom) {
			_closedByScroll = true;
			self.close();
			return true;
		}

		if(_opacityChanged) {
			onUpdate = function(now) {

				_applyBgOpacity(  (destOpacity - initialOpacity) * now + initialOpacity );

			};
		}


		self.zoomTo(destZoomLevel, 0, 300,  framework.easing.cubic.out, onUpdate);
		return true;
	};



/*>>down-move-up-handlers*/

/*>>items-controller*/
/**
*
* Controller manages gallery items, their dimensions, and their content.
*
*/

var _items,
	_tempPanAreaSize = {},
	_tempRealElSize = {},
	_imagesToAppendPool = [],
	_initialContentSet,
	_initialZoomRunning,
	_controllerDefaultOptions = {
		index: 0,
		errorMsg: '<div class="pswp__error-msg"><a href="%url%" target="_blank">The image</a> could not be loaded.</div>',
		forceProgressiveLoading: false, // TODO
		preload: [1,1],
		getNumItemsFn: function() {
			return _items.length;
		}
	};


var _getItemAt,
	_getNumItems,
	_initialIsLoop,
	_calculateItemSize = function(item, viewportSize, zoomLevel) {

		if (item.src) {
			var isInitial = !zoomLevel;

			if(isInitial) {
				if(!item.vGap) {
					item.vGap = {top:0,bottom:0};
				}
				// allows overriding vertical margin for individual items
				_shout('parseVerticalMargin', item);
			}


			_tempPanAreaSize.x = viewportSize.x;
			_tempPanAreaSize.y = viewportSize.y - item.vGap.top - item.vGap.bottom;

			if (isInitial) {
				var hRatio = _tempPanAreaSize.x / item.w;
				var vRatio = _tempPanAreaSize.y / item.h;

				item.fitRatio = hRatio < vRatio ? hRatio : vRatio;
				item.fillRatio = hRatio > vRatio ? hRatio : vRatio;

				var scaleMode = _options.scaleMode;

				if (scaleMode == 'orig') {
					zoomLevel = 1;
				} else if (scaleMode == 'fit') {
					zoomLevel = item.fitRatio;
				} else if (scaleMode == 'fill') {
					zoomLevel = item.fillRatio;
				}

				if (zoomLevel > 1) {
					zoomLevel = 1;
				}
				item.initialZoomLevel = zoomLevel;
				item.maxZoom = 2;
				item.doubleTapZoom = zoomLevel * 2 > 1 ? zoomLevel * 2 : 1;
				item.minZoom = zoomLevel;

				if(!item.bounds) {
					item.bounds = { center:{}, max:{}, min:{} }; // reuse bounds object
				}


			}

			if(!zoomLevel) {
				return;
			}


			_tempRealElSize.x = item.w * zoomLevel;
			_tempRealElSize.y = item.h * zoomLevel;


			var bounds = item.bounds;

			// position of element when it's centered
			bounds.center.x = Math.round((_tempPanAreaSize.x - _tempRealElSize.x) / 2);
			bounds.center.y = Math.round((_tempPanAreaSize.y - _tempRealElSize.y) / 2) + item.vGap.top;


			// maximum pan position
			bounds.max.x = (_tempRealElSize.x > _tempPanAreaSize.x) ? Math.round(_tempPanAreaSize.x - _tempRealElSize.x) : bounds.center.x;
			bounds.max.y = (_tempRealElSize.y > _tempPanAreaSize.y) ? Math.round(_tempPanAreaSize.y - _tempRealElSize.y) + item.vGap.top : bounds.center.y;

			// minimum pan position
			bounds.min.x = (_tempRealElSize.x > _tempPanAreaSize.x) ? 0 : bounds.center.x;
			bounds.min.y = (_tempRealElSize.y > _tempPanAreaSize.y) ? item.vGap.top : bounds.center.y;

			if (isInitial && zoomLevel === item.initialZoomLevel) {
				item.initialPosition = bounds.center;
			}

			return bounds;
		} else {
			// has no img TODO
		}

		return false;
	},




	_appendImage = function(index, item, baseDiv, img, preventAnimation, keepPlaceholder) {
		var animate;

		// fade in loaded image only when current holder is active, or might be visible
		if(!preventAnimation && (_likelyTouchDevice || _options.alwaysFadeIn) && (index === _currentItemIndex || self.isMainScrollAnimating() || (self.isDragging() && !self.isZooming()) ) ) {
			animate = true;
		}

		if(img) {
			if(animate) {
				img.style.opacity = 0;
			}

			item.imageAppended = true;

			baseDiv.appendChild(img);



			if(animate) {
				setTimeout(function() {
				 	img.style.opacity = 1;
				 	if(keepPlaceholder) {
				 		setTimeout(function() {
							// hide image placeholder "behind"
							if(item && item.loaded && item.placeholder) {
								item.placeholder.style.display = 'none';
								item.placeholder = null;
							}
						}, 500);
				 	}

				 }, 50);
			}
		}
	},



	_preloadImage = function(item) {
		item.loading = true;
		item.loaded = false;
		var img = item.img = framework.createEl('pswp__img', 'img');
		var onComplete = function() {
			item.loading = false;
			item.loaded = true;

			if(item.loadComplete) {
				item.loadComplete(item);
			} else {
				item.img = null; // no need to store image object
			}
			img.onload = img.onerror = null;
			img = null;
		};
		img.onload = onComplete;
		img.onerror = function() {
			item.loadError = true;
			onComplete();
		};


		img.src = item.src;// + '?a=' + Math.random();

		return img;
	},
	_displayError = function(item, holder) {
		if(item.loadError) {
			holder.el.innerHTML = _options.errorMsg.replace('%url%',  item.src );
			return true;
		}
	},
	_appendImagesPool = function() {
		if(_imagesToAppendPool.length) {
			var poolItem;

			for(var i = 0; i < _imagesToAppendPool.length; i++) {
				poolItem = _imagesToAppendPool[i];
				if( poolItem.holder.index === poolItem.index ) {
					_appendImage(poolItem.index, poolItem.item, poolItem.baseDiv, poolItem.img);
				}
			}
			_imagesToAppendPool = [];
		}
	};



_registerModule('Controller', {

	publicMethods: {

		lazyLoadItem: function(index) {
			index = _getLoopedId(index);
			var item = _getItemAt(index);

			if(!item || item.loaded || item.loading) {
				return;
			}

			_shout('gettingData', index, item);
			_preloadImage(item);
		},
		initController: function() {
			framework.extend(_options, _controllerDefaultOptions, true);
			self.items = _items = items;
			_getItemAt = self.getItemAt;
			_getNumItems = _options.getNumItemsFn; //self.getNumItems;



			_initialIsLoop = _options.loop;
			if(_getNumItems() < 3) {
				_options.loop = false; // disable loop if less then 3 items
			}

			_listen('beforeChange', function(diff) {

				var p = _options.preload,
					isNext = diff === null ? true : (diff > 0),
					preloadBefore = Math.min(p[0], _getNumItems() ),
					preloadAfter = Math.min(p[1], _getNumItems() ),
					i;


				for(i = 1; i <= (isNext ? preloadAfter : preloadBefore); i++) {
					self.lazyLoadItem(_currentItemIndex+i);
				}
				for(i = 1; i <= (isNext ? preloadBefore : preloadAfter); i++) {
					self.lazyLoadItem(_currentItemIndex-i);
				}
			});

			_listen('initialLayout', function() {
				self.currItem.initialLayout = _options.getThumbBoundsFn && _options.getThumbBoundsFn(_currentItemIndex);
			});

			_listen('mainScrollAnimComplete', _appendImagesPool);
			_listen('initialZoomInEnd', _appendImagesPool);



			_listen('destroy', function() {
				var item;
				for(var i = 0; i < _items.length; i++) {
					item = _items[i];
					// remove reference to DOM elements, for GC
					if(item.container) {
						item.container = null;
					}
					if(item.placeholder) {
						item.placeholder = null;
					}
					if(item.img) {
						item.img = null;
					}
					if(item.preloader) {
						item.preloader = null;
					}
					if(item.loadError) {
						item.loaded = item.loadError = false;
					}
				}
				_imagesToAppendPool = null;
			});
		},


		getItemAt: function(index) {
			if (index >= 0) {
				return _items[index];
			}
			return false;
		},



		allowProgressiveImg: function() {

			// 1. Progressive image loading isn't working on webkit/blink when hw-acceleration (e.g. translateZ) is applied to IMG element.
			//    That's why in PhotoSwipe parent element gets zoom transform, not image itself.
			//
			// 2. Progressive image loading sometimes blinks in webkit/blink when applying animation to parent element.
			//    That's why it's disabled on touch devices (mainly because of swipe transition)
			//
			// 3. Progressive image loading sometimes doesn't work in IE (up to 11).

			// Don't allow progressive loading on non-large touch devices
			return _options.forceProgressiveLoading || !_likelyTouchDevice || _options.mouseUsed || screen.width > 1200; // 1200 to eliminate touch devices with large screen (like Chromebook Pixel)
		},

		setContent: function(holder, index) {

			if(_options.loop) {
				index = _getLoopedId(index);
			}

			var item = self.getItemAt(index),
				img;


			if(item) {

				// allow to override data
				_shout('gettingData', index, item);

//				holder.setAttribute('data-pswp-id', index);
				holder.index = index;

				if( _displayError(item, holder) ) {
					item.initialPosition.x = item.initialPosition.y = 0;
					item.initialZoomLevel = item.maxZoom = item.minZoom = 1;
					_currZoomElementStyle = null;
					item.w = 50;
					item.h = 50;
					_applyZoomPanToItem(item);
					return;
				}


				// base container DIV is created only once for each of 3 holders
				var baseDiv;// = (prevItem && prevItem.container)  ? prevItem.container : framework.createEl('pswp__zoom-wrap');
				// if(prevItem && prevItem.container) {
				// 	baseDiv = prevItem.container;
				// 	if(baseDiv.parentNode) {
				// 		baseDiv.parentNode.removeChild(baseDiv);
				// 	}
				// 	baseDiv.innerHTML = '';
				// 	prevItem.container = null;
				// } else {
				// 	baseDiv = framework.createEl('pswp__zoom-wrap');
				// }
				// if(!holder.wrap) {
				// 	holder.wrap = framework.createEl('pswp__zoom-wrap');
				// } else {

				// 	holder.removeChild(holder.wrap);
				// 	holder.wrap.innerHTML = '';
				// }
				baseDiv = framework.createEl('pswp__zoom-wrap');//holder.wrap;

				// allow to override image source, size, etc.
				// if(_options.assignItemData) {
				// 	_options.assignItemData(item);
				// }


				// if(prevItem) {
				// 	prevItem.container = null;
				// 	baseDiv.parentNode.removeChild(baseDiv);
				// 	baseDiv.innerHTML = '';
				// }

				item.container = baseDiv;

				if(!item.loaded) {

					item.loadComplete = function(item) {

						// gallery closed before image finished loading
						if(!_isOpen) {
							return;
						}

						// if(!_initialZoomRunning && item.placeholder) {
						// 	item.placeholder.style.display = 'none';
						// }

						if(!img) {
							img = item.img;
						}
						// Apply hw-acceleration only after image is loaded.
						// This is webkit progressive image loading bugfix.
						// https://bugs.webkit.org/show_bug.cgi?id=108630
						// https://code.google.com/p/chromium/issues/detail?id=404547
						img.style.webkitBackfaceVisibility = 'hidden';



						// check if holder hasn't changed while image was loading
						if( holder.index === index ) {
							if( _displayError(item, holder) ) {
								return;
							}
							if( !item.imageAppended /*_likelyTouchDevice*/ ) {
								if(_mainScrollAnimating || _initialZoomRunning) {
									_imagesToAppendPool.push({item:item, baseDiv:baseDiv, img:img, index:index, holder:holder});
								} else {
									_appendImage(index, item, baseDiv, img, _mainScrollAnimating || _initialZoomRunning);
								}
							} else {
								// remove preloader & mini-img
								if(!_initialZoomRunning && item.placeholder) {
									item.placeholder.style.display = 'none';
									item.placeholder = null;
								}
							}
						}

						item.loadComplete = null;

						_shout('imageLoadComplete', index, item);
					};



					img = item.img;

					if(framework.features.transform) {

						var placeholder = framework.createEl('pswp__img pswp__img--placeholder' + (item.msrc ? '' : ' pswp__img--placeholder--blank') , item.msrc ? 'img' : '');
						if(item.msrc) {
							placeholder.src = item.msrc;
						}

						placeholder.style.width = item.w + 'px';
						placeholder.style.height = item.h + 'px';

						baseDiv.appendChild(placeholder);
						item.placeholder = placeholder;

					}


					if( self.allowProgressiveImg() ) {
						// just append image
						if(!_initialContentSet /*&& index === _currentItemIndex*/) {
							_imagesToAppendPool.push({item:item, baseDiv:baseDiv, img:img, index:index, holder:holder});
						} else {
							_appendImage(index, item, baseDiv, img, true, true);
						}
					}

					if(!item.loading) {
						_preloadImage(item);
					}





				} else {
					// image object is created every time, due to bugs of image loading & delay when switching images
					img = framework.createEl('pswp__img', 'img');
					img.style.webkitBackfaceVisibility = 'hidden';
					img.style.opacity = 1;
					img.src = item.src;
					_appendImage(index, item, baseDiv, img, true);
				}

				_calculateItemSize(item, _viewportSize);


				if(!_initialContentSet && index === _currentItemIndex) {
					_currZoomElementStyle = baseDiv.style;
					_showOrHide(item, img);
				} else {
					_applyZoomPanToItem(item);
				}

				holder.el.innerHTML = '';
				holder.el.appendChild(baseDiv);

			} else {
				holder.el.innerHTML = '';
			}

		}






	}
});



// TODO: use webworker to lazy-load images?
//
// 		var blob = new Blob([ ""+
// "   onmessage = function(e) {"+
// "		var urls = e.data,"+
// "        	done = urls.length,"+
// "        	onload = function () {"+
// "            	if (--done === 0) {"+
// "                	self.postMessage('Done!');"+
// "                self.close();"+
// "            	}"+
// "        	};"+

// "    	urls.forEach(function (url) {"+
// "        	var xhr = new XMLHttpRequest();"+
// "        	xhr.responseType = 'blob';"+
// "        	xhr.onload = xhr.onerror = onload;"+
// "        	xhr.open('GET', url, true);"+
// "        	xhr.send();"+
// "    	});"+
// " 	}" ]);

// 		var blobURL = window.URL.createObjectURL(blob);

// 		var imgs = [];
//         for(var i = 0; i < items.length; i++) {
//         	imgs.push(items[i].src);
//         }

// 		_worker = new Worker(blobURL);
// 		_worker.onmessage = function(e) {
// 		};
// 		_worker.postMessage(imgs);

  //       for(var i = 0; i < items.length; i++) {
  //       	var img = new Image();
  //       	img.src = items[i].src;
  //       }


/*>>items-controller*/

/*>>tap*/
/* Module dispatches tap event (pswpTap), and manages double-tap */


var tapTimer,
	tapReleasePoint = {},
	_dispatchTapEvent = function(origEvent, releasePoint, pointerType) {


	    var evt = document.createEvent( 'CustomEvent' );
	    evt.initCustomEvent( 'pswpTap', true, true, {origEvent:origEvent, target:origEvent.target, releasePoint: releasePoint, pointerType:pointerType || 'touch'} );
	    origEvent.target.dispatchEvent( evt );

	};

_registerModule('Tap', {

	publicMethods: {

		initTap: function() {
			_listen('firstTouchStart', self.onTapStart);
			_listen('touchRelease', self.onTapRelease);
			_listen('destroy', function() {
				tapReleasePoint = {};
				tapTimer = null;
			});
		},
		onTapStart: function(touchList) {

			if(touchList.length > 1) {
				clearTimeout(tapTimer);
				tapTimer = null;
			}
		},
		onTapRelease: function(e, releasePoint) {

			if(!releasePoint) {
				return;
			}

			if(!_moved && !_isMultitouch && !_numAnimations) {

				var p0 = releasePoint;
				if(tapTimer) {
					clearTimeout(tapTimer);
					tapTimer = null;

					// Check if taped on the same place
					if ( _isNearbyPoints(p0, tapReleasePoint) ) {
						//self.onDoubleTap(p0);
						_shout('doubleTap', p0);
						return;
				    }
				}

				var clickedTagName = e.target.tagName.toLowerCase();

				if(releasePoint.type === 'mouse') {
					_dispatchTapEvent(e, releasePoint, 'mouse');
					return;
				}

				// avoid double tap delay on buttons and elements that have class pswp__single-tap
				if(clickedTagName === 'button' || framework.hasClass(e.target, 'pswp__single-tap') ) {
					//_shout('tap', data);
					_dispatchTapEvent(e, releasePoint);
					return;
				}



				_equalizePoints(tapReleasePoint, p0);

				tapTimer = setTimeout(function() {
					_dispatchTapEvent(e, releasePoint);
					tapTimer = null;
				}, 300);
			}
		}

	}
});


/*>>tap*/

/*>>desktop-zoom*/
/**
 * Zooming image on desktop and paning it with mouse wheel or trackpad.
 */

var _wheelDelta;
	// _trackpadSwipeThrottleTimeout,
	// _trackpadSwipePrev,
	// _trackpadLastEventTime,
	// _trackpadRunning,
	// _trackpadLastActionTime,
	// _trackpadDir;
	//_didAction;

_registerModule('DesktopZoom', {

	publicMethods: {
		handleMouseWheel: function(e) {

			if(_currZoomLevel <= self.currItem.fitRatio) {
				return true;
			}
			e.preventDefault();
			e.stopPropagation(); // allow just one event to fire

			// https://developer.mozilla.org/en-US/docs/Web/Events/wheel
			_wheelDelta.x = 0;

 			if('deltaX' in e) {
 				_wheelDelta.x = e.deltaX;
 				_wheelDelta.y = e.deltaY;
 			} else if('wheelDelta' in e) {
        		if(e.wheelDeltaX) {
        			_wheelDelta.x = -0.16 * e.wheelDeltaX;
        		}
        		if(e.wheelDeltaY) {
        			_wheelDelta.y = -0.16 * e.wheelDeltaY;
        		} else {
        			_wheelDelta.y = -0.16 * e.wheelDelta;
        		}
        	} else if('detail' in e) {
				_wheelDelta.y = e.detail;
        	} else {
        		return;
        	}


        	// TODO: use rAF instead of mousewheel?
			_calculatePanBounds(_currZoomLevel, true);
			self.panTo(_panOffset.x - _wheelDelta.x, _panOffset.y - _wheelDelta.y);


    		// Experimental attempt to implement touchpad swipe gesture.
    		// Didn't work as good as expected due to enreliable deceleration speed across different touchpads.
    		// left for history
    		//
    		// if(!_trackpadDir) {
    		// 	if(!_wheelDelta.y) {
    		// 		_trackpadDir = 'x';
    		// 	} else {
    		// 		if(Math.abs(_wheelDelta.y - _wheelDelta.x) > 10) {
        	// 			_trackpadDir = _wheelDelta.y > _wheelDelta.x ? 'y' : 'x';
        	// 		}
    		// 	}
    		// }
    		// if(!_trackpadDir) {
    		// 	return;
    		// }
    		// var delta = _wheelDelta[_trackpadDir];
    		// if(delta && Math.abs(delta) > 10) {

        	// 	var timeDiff = _getCurrentTime() - _trackpadLastEventTime;
        	// 	_trackpadLastEventTime = _getCurrentTime();

        	// 	if(timeDiff < 200 && _trackpadSwipePrev === (delta > 0)) {
        	// 		return;
        	// 	}

        	// 	_trackpadSwipePrev = (delta > 0);
        	// 	self[_trackpadSwipePrev ? 'next' : 'prev' ]();
    		// }
		},
		toggleDesktopZoom: function(centerPoint) {

			centerPoint = centerPoint || {x:_viewportSize.x/2, y:_viewportSize.y/2 + _initalWindowScrollY };
			var zoomOut = _currZoomLevel === 1;

			self.mouseZoomedIn = !zoomOut;


			self.zoomTo(zoomOut ? self.currItem.initialZoomLevel : 1, centerPoint, 333);
			framework[ (!zoomOut ? 'add' : 'remove') + 'Class'](template, 'pswp--zoomed-in');
		},
		setupDesktopZoom: function(onInit) {

			_wheelDelta = {};
			var events = 'wheel mousewheel DOMMouseScroll';


			_listen('bindEvents', function() {
				framework.bind(template, events,  self.handleMouseWheel);
			});
			_listen('unbindEvents', function() {
				if(_wheelDelta) {
					framework.unbind(template, events, self.handleMouseWheel);
				}
			});

			self.mouseZoomedIn = false;

			var hasDraggingClass,
				updateZoomable = function() {
					if(self.mouseZoomedIn) {
						framework.removeClass(template, 'pswp--zoomed-in');
						self.mouseZoomedIn = false;
					}
					if(_currZoomLevel < 1) {
						framework.addClass(template, 'pswp--zoom-allowed');
					} else {
						framework.removeClass(template, 'pswp--zoom-allowed');
					}
					removeDraggingClass();
				},
				removeDraggingClass = function() {
					if(hasDraggingClass) {
						framework.removeClass(template, 'pswp--dragging');
						hasDraggingClass = false;
					}
				};

			_listen('resize' , updateZoomable);
			_listen('afterChange' , updateZoomable);
			_listen('pointerDown', function() {
				if(self.mouseZoomedIn) {
					hasDraggingClass = true;
					framework.addClass(template, 'pswp--dragging');
				}
			});
			_listen('pointerUp', removeDraggingClass);

			if(!onInit) {
				updateZoomable();
			}

		},
		initDesktopZoom: function() {

			if(_oldIE) {
				// no zoom for old IE (<=8)
				return;
			}

			if(_likelyTouchDevice) {
				_listen('mouseUsed', function() {
					self.setupDesktopZoom();
				});
			} else {
				self.setupDesktopZoom(true);
			}




		}

	}
});


/*>>desktop-zoom*/

/*>>history*/
/* Hisotry module (back button to close gallery, unique URL for each slide) */

var _historyDefaultOptions = {
	history: true,
	galleryUID: 1
};

var _historyUpdateTimeout,
	_hashChangeTimeout,
	_hashAnimCheckTimeout,
	_hashChangedByScript,
	_hashChangedByHistory,
	_hashReseted,
	_initialHash,
	_historyChanged,
	_closedFromURL,
	_urlChangedOnce,
	_windowLoc,
	_getHash = function() {
		return _windowLoc.hash.substring(1);
	},
	_cleanHistoryTimeouts = function() {

		if(_historyUpdateTimeout) {
			clearTimeout(_historyUpdateTimeout);
		}

		if(_hashAnimCheckTimeout) {
			clearTimeout(_hashAnimCheckTimeout);
		}
	},

	// pid - Picture index
	// gid - Gallery index
	_parseItemIndexFromURL = function() {
		var hash = _getHash(),
			params = {};

		if(hash.length < 5) { // pid=1
			return params;
		}

	    var vars = hash.split('&');
	    for (var i = 0; i < vars.length; i++) {
	    	if(!vars[i]) {
	    		continue;
	    	}
	        var pair = vars[i].split('=');
	        if(pair.length < 2) {
	        	continue;
	        }
	        params[pair[0]] = pair[1];
	    }
	    params.pid = parseInt(params.pid,10)-1;
	    if( params.pid < 0 ) {
	    	params.pid = 0;
	    }
	    return params;
	},
	_updateHash = function() {

		if(_hashAnimCheckTimeout) {
			clearTimeout(_hashAnimCheckTimeout);
		}


		if(_numAnimations || _isDragging) {
			// changing browser URL forces layout/paint in some browsers, which causes noticable lag during animation
			// that's why we update hash only when no animations running
			_hashAnimCheckTimeout = setTimeout(_updateHash, 500);
			return;
		}

		if(_hashChangedByScript) {
			clearTimeout(_hashChangeTimeout);
		} else {
			_hashChangedByScript = true;
		}


		var newHash = _initialHash + '&'  +  'gid=' + _options.galleryUID + '&' + 'pid=' + (_currentItemIndex + 1);

		if(!_historyChanged) {
			if(_windowLoc.hash.indexOf(newHash) === -1) {
				_urlChangedOnce = true;
			}
			_windowLoc.hash = newHash;
			// first time - add new hisory record, then just replace
		} else {
			var newURL = _windowLoc.href.split('#')[0] + '#' +  newHash;

			_windowLoc.replace( newURL );
		}


		_historyChanged = true;
		_hashChangeTimeout = setTimeout(function() {
			_hashChangedByScript = false;
		}, 60);
	};





_registerModule('History', {



	publicMethods: {
		initHistory: function() {

			framework.extend(_options, _historyDefaultOptions, true);

			if( !_options.history ) {
				return;
			}


			_windowLoc = window.location;
			_urlChangedOnce = false;
			_closedFromURL = false;
			_historyChanged = false;
			_initialHash = _getHash();


			if(_initialHash.indexOf('gid=') > -1) {
				_initialHash = _initialHash.split('&gid=')[0];
				_initialHash = _initialHash.split('?gid=')[0];
			}


			_listen('afterChange', self.updateURL);
			_listen('unbindEvents', function() {
				framework.unbind(window, 'hashchange', self.onHashChange);
			});


			var returnToOriginal = function() {
				_hashReseted = true;
				if(!_closedFromURL) {

					if(_urlChangedOnce) {
					    history.back();
					} else {
						if(_initialHash) {
							_windowLoc.hash = _initialHash;
						} else {
						    if ('pushState' in history) {
						    	// remove hash from url without refreshing it or scrolling to top
						    	history.pushState("", document.title, _windowLoc.pathname + _windowLoc.search);
						    } else {
						        _windowLoc.hash = "";
						    }
						}
					}

				}

				_cleanHistoryTimeouts();
			};


			_listen('unbindEvents', function() {
				if(_closedByScroll) {
					// if PhotoSwipe is closed by scroll, we go "back" before the closing animation starts
					// this is done to keep the scroll position
					returnToOriginal();
				}
			});
			_listen('destroy', function() {
				if(!_hashReseted) {
					returnToOriginal();
				}
			});
			_listen('firstUpdate', function() {
				_currentItemIndex = _parseItemIndexFromURL().pid;
			});




			var index = _initialHash.indexOf('pid=');
			if(index > -1) {
				_initialHash = _initialHash.substring(0, index);
				if(_initialHash.slice(-1) === '&') {
					_initialHash = _initialHash.slice(0, -1);
				}
			}


 			setTimeout(function() {
 				if(_isOpen) { // hasn't destroyed yet
 					framework.bind(window, 'hashchange', self.onHashChange);
 				}
			}, 40);

		},
		onHashChange: function() {

			if(_getHash() === _initialHash) {
				_closedFromURL = true;
				self.close();
				return;
			}
			if(!_hashChangedByScript) {
				_hashChangedByHistory = true;
				self.goTo( _parseItemIndexFromURL().pid );
				_hashChangedByHistory = false;
			}

		},
		updateURL: function() {

			// Delay the update of URL, to avoid lag during transition,
			// and to not to trigger actions like "refresh page sound" or "blinking favicon" to often

			_cleanHistoryTimeouts();


			if(_hashChangedByHistory) {
				return;
			}

			if(!_historyChanged) {
				_updateHash(); // first time
			} else {
				_historyUpdateTimeout = setTimeout(_updateHash, 800);
			}
		}

	}
});


/*>>history*/
	 framework.extend(self, publicMethods); };
	return PhotoSwipe;
});