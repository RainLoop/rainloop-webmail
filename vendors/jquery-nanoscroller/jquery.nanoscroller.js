/*! nanoScrollerJS - v0.7
* http://jamesflorentino.github.com/nanoScrollerJS/
* Copyright (c) 2013 James Florentino; Licensed under MIT
*
* modified by RainLoop Team
*/

(function($, window, document) {
  "use strict";

  var BROWSER_IS_IE7, BROWSER_SCROLLBAR_WIDTH, DOMSCROLL, DOWN, DRAG, KEYDOWN, KEYUP, MOUSEDOWN, MOUSEMOVE, MOUSEUP, MOUSEWHEEL, NanoScroll, PANEDOWN, RESIZE, SCROLL, SCROLLBAR, TOUCHMOVE, UP, WHEEL, defaults, getBrowserScrollbarWidth;
  defaults = {
    /**
      a classname for the pane element.
      @property paneClass
      @type {string}
      @default 'pane'
    */

    paneClass: 'pane',
    /**
      a classname for the slider element.
      @property sliderClass
      @type {string}
      @default 'slider'
    */

    sliderClass: 'slider',
    /**
      a classname for the content element.
      @property contentClass
      @type {string}
      @default 'content'
    */

    contentClass: 'content',
    /**
      a setting to enable native scrolling in iOS devices.
      @property iOSNativeScrolling
      @type {boolean}
      @default false
    */

    iOSNativeScrolling: false,
    /**
      a setting to prevent the rest of the page being
      scrolled when user scrolls the `.content` element.
      @property preventPageScrolling
      @type {boolean}
      @default false
    */

    preventPageScrolling: false,
    /**
      a setting to disable binding to the resize event.
      @property disableResize
      @type {boolean}
      @default false
    */

    disableResize: false,
    /**
      a setting to make the scrollbar always visible.
      @property alwaysVisible
      @type {boolean}
      @default false
    */

    alwaysVisible: false,
    /**
      a default timeout for the `flash()` method.
      @property flashDelay
      @type {number}
      @default 1500
    */

    flashDelay: 1500,
    /**
      a minimum height for the `.slider` element.
      @property sliderMinHeight
      @type {number}
      @default 20
    */

    sliderMinHeight: 20,
    /**
      a maximum height for the `.slider` element.
      @property sliderMaxHeight
      @type {?number}
      @default null
    */

    sliderMaxHeight: null
  };
  /**
    @property SCROLLBAR
    @type {string}
    @static
    @final
    @private
  */

  SCROLLBAR = 'scrollbar';
  /**
    @property SCROLL
    @type {string}
    @static
    @final
    @private
  */

  SCROLL = 'scroll';
  /**
    @property MOUSEDOWN
    @type {string}
    @final
    @private
  */

  MOUSEDOWN = 'mousedown';
  /**
    @property MOUSEMOVE
    @type {string}
    @static
    @final
    @private
  */

  MOUSEMOVE = 'mousemove';
  /**
    @property MOUSEWHEEL
    @type {string}
    @final
    @private
  */

  MOUSEWHEEL = 'mousewheel';
  /**
    @property MOUSEUP
    @type {string}
    @static
    @final
    @private
  */

  MOUSEUP = 'mouseup';
  /**
    @property RESIZE
    @type {string}
    @final
    @private
  */

  RESIZE = 'resize';
  /**
    @property DRAG
    @type {string}
    @static
    @final
    @private
  */

  DRAG = 'drag';
  /**
    @property UP
    @type {string}
    @static
    @final
    @private
  */

  UP = 'up';
  /**
    @property PANEDOWN
    @type {string}
    @static
    @final
    @private
  */

  PANEDOWN = 'panedown';
  /**
    @property DOMSCROLL
    @type {string}
    @static
    @final
    @private
  */

  DOMSCROLL = 'DOMMouseScroll';
  /**
    @property DOWN
    @type {string}
    @static
    @final
    @private
  */

  DOWN = 'down';
  /**
    @property WHEEL
    @type {string}
    @static
    @final
    @private
  */

  WHEEL = 'wheel';
  /**
    @property KEYDOWN
    @type {string}
    @static
    @final
    @private
  */

  KEYDOWN = 'keydown';
  /**
    @property KEYUP
    @type {string}
    @static
    @final
    @private
  */

  KEYUP = 'keyup';
  /**
    @property TOUCHMOVE
    @type {string}
    @static
    @final
    @private
  */

  TOUCHMOVE = 'touchmove';
  /**
    @property BROWSER_IS_IE7
    @type {boolean}
    @static
    @final
    @private
  */

  BROWSER_IS_IE7 = window.navigator.appName === 'Microsoft Internet Explorer' && /msie 7./i.test(window.navigator.appVersion) && window.ActiveXObject;
  /**
    @property BROWSER_SCROLLBAR_WIDTH
    @type Number
    @static
    @default null
    @private
  */

  BROWSER_SCROLLBAR_WIDTH = null;
  /**
    Returns browser's native scrollbar width
    @method getBrowserScrollbarWidth
    @return {number} the scrollbar width in pixels
    @static
    @private
  */

  getBrowserScrollbarWidth = function() {
    var outer, outerStyle, scrollbarWidth;
    outer = document.createElement('div');
    outerStyle = outer.style;
    outerStyle.position = 'absolute';
    outerStyle.width = '100px';
    outerStyle.height = '100px';
    outerStyle.overflow = SCROLL;
    outerStyle.top = '-9999px';
    outer.className = 'nano-visibility-hidden';
    document.body.appendChild(outer);
    scrollbarWidth = outer.offsetWidth - outer.clientWidth;
    document.body.removeChild(outer);
    return scrollbarWidth;
  };
  /**
    @class NanoScroll
    @param element {HTMLElement|Node} the main element
    @param options {Object} nanoScroller's options
    @constructor
  */

  NanoScroll = (function() {

    function NanoScroll(el, options) {
      this.el = el;
      this.options = options;
      BROWSER_SCROLLBAR_WIDTH || (BROWSER_SCROLLBAR_WIDTH = getBrowserScrollbarWidth());
      this.$el = $(this.el);
      this.doc = $(document);
      this.win = $(window);
      this.$content = this.$el.children("." + options.contentClass);
      this.$content.attr('tabindex', 0);
      this.content = this.$content[0];
      if (this.options.iOSNativeScrolling && (this.el.style.WebkitOverflowScrolling != null)) {
        this.nativeScrolling();
      } else {
        this.generate();
      }
      this.createEvents();
      this.addEvents();
      this.reset();
    }

    /**
      Prevents the rest of the page being scrolled
      when user scrolls the `.content` element.
      @method preventScrolling
      @param e {Event}
      @param direction {String} Scroll direction (up or down)
      @private
    */


    NanoScroll.prototype.preventScrolling = function(e, direction) {
      if (!this.isActive && !this.isActive2) {
       return;
      }
      if (e.type === DOMSCROLL) {
        if (direction === DOWN && e.originalEvent.detail > 0 || direction === UP && e.originalEvent.detail < 0) {
          e.preventDefault();
        }
      } else if (e.type === MOUSEWHEEL) {
        if (!e.originalEvent || !e.originalEvent.wheelDelta) {
          return;
        }
        if (
          direction === DOWN && e.originalEvent.wheelDelta < 0 ||
          direction === UP && e.originalEvent.wheelDelta > 0 ||
          direction === 'down2' && e.originalEvent.wheelDelta < 0 ||
          direction === 'up2' && e.originalEvent.wheelDelta > 0
        ) {
          e.preventDefault();
        }
      }
    };

    /**
      Enable iOS native scrolling
    */


    NanoScroll.prototype.scrollClassTimer = 0;

    NanoScroll.prototype.scrollClassTrigger = function() {

		window.clearTimeout(this.scrollClassTimer);

		var _this = this;

		_this.$el.addClass('nano-scrollevent');
		_this.pane.addClass('activescroll');
		_this.pane2.addClass('activescroll');

		this.scrollClassTimer = window.setTimeout(function () {
			_this.$el.removeClass('nano-scrollevent');
			_this.pane.removeClass('activescroll');
			_this.pane2.removeClass('activescroll');
		}, 1000);
    };

    NanoScroll.prototype.nativeScrolling = function() {
      this.$content.css({
        WebkitOverflowScrolling: 'touch'
      });
      this.iOSNativeScrolling = true;
      this.isActive = true;
      this.isActive2 = true;
    };

    /**
      Updates those nanoScroller properties that
      are related to current scrollbar position.
      @method updateScrollValues
      @private
    */


    NanoScroll.prototype.updateScrollValues = function() {
      var content, limit = 8;
      content = this.content;
      this.maxScrollTop = content.scrollHeight - content.clientHeight;
      this.maxScroll2Left = content.scrollWidth - content.clientWidth;
      this.contentScrollTop = content.scrollTop;
      this.contentScroll2Left = content.scrollLeft;
      if (!this.iOSNativeScrolling) {
        this.maxSliderTop = this.paneHeight - this.sliderHeight;
        this.maxSlider2Left = this.pane2Width - this.slider2Width;
        this.sliderTop = this.contentScrollTop * this.maxSliderTop / this.maxScrollTop;
        this.slider2Left = this.contentScroll2Left * this.maxSlider2Left / this.maxScroll2Left;

        if (limit < this.sliderTop) {
          this.$el.addClass('nano-scrolllimit-top');
        } else {
          this.$el.removeClass('nano-scrolllimit-top');
        }

        if (this.contentScrollTop + limit >= this.maxScrollTop) {
          this.$el.removeClass('nano-scrolllimit-bottom');
        } else {
          this.$el.addClass('nano-scrolllimit-bottom');
        }
      }
	  };

    /**
      Creates event related methods
      @method createEvents
      @private
    */


    NanoScroll.prototype.createEvents = function() {
      var _this = this;
      this.events = {
        down: function(e) {
          _this.isBeingDragged = true;
          _this.offsetY = e.pageY - _this.slider.offset().top;
          _this.pane.addClass('active');
          _this.doc.bind(MOUSEMOVE, _this.events[DRAG]).bind(MOUSEUP, _this.events[UP]);
          return false;
        },
        down2: function(e) {
          _this.isBeingDragged2 = true;
          _this.offsetX = e.pageX - _this.slider2.offset().left;
          _this.pane2.addClass('active');
          _this.doc.bind(MOUSEMOVE, _this.events['drag2']).bind(MOUSEUP, _this.events['up2']);
          return false;
        },
        drag: function(e) {
          _this.sliderY = e.pageY - _this.$el.offset().top - _this.offsetY;
          _this.scroll();
          _this.updateScrollValues();
          if (_this.contentScrollTop >= _this.maxScrollTop) {
            _this.$el.trigger('scrollend');
          } else if (_this.contentScrollTop === 0) {
            _this.$el.trigger('scrolltop');
          }
          return false;
        },
        drag2: function(e) {
          _this.slider2X = e.pageX - _this.$el.offset().left - _this.offsetX;
          _this.scroll();
          _this.updateScrollValues();
/*          if (_this.contentScrollLeft >= _this.maxScrollLeft) {
            _this.$el.trigger('scrollend');
          } else if (_this.contentScrollLeft === 0) {
            _this.$el.trigger('scrolltop');
          }*/
          return false;
        },
        up: function() {
          _this.isBeingDragged = false;
          _this.pane.removeClass('active');
          _this.doc.unbind(MOUSEMOVE, _this.events[DRAG]).unbind(MOUSEUP, _this.events[UP]);
          return false;
        },
        up2: function() {
          _this.isBeingDragged2 = false;
          _this.pane2.removeClass('active');
          _this.doc.unbind(MOUSEMOVE, _this.events['drag2']).unbind(MOUSEUP, _this.events['up2']);
          return false;
        },
        resize: function() {
          _this.reset();
        },
        panedown: function(e) {
          _this.sliderY = (e.offsetY || e.originalEvent.layerY) - (_this.sliderHeight * 0.5);
          _this.scroll();
          _this.events.down(e);
          return false;
        },
        panedown2: function(e) {
          _this.slider2X = (e.offsetX || e.originalEvent.layerX) - (_this.slider2Width * 0.5);
          _this.scroll();
          _this.events.down2(e);
          return false;
        },
        scroll: function(e) {
          if (_this.isBeingDragged || _this.isBeingDragged2) {
            return;
          }

          _this.updateScrollValues();
          if (!_this.iOSNativeScrolling) {
            _this.sliderY = _this.sliderTop;
            _this.slider.css({
              top: _this.sliderTop
            });
            _this.slider2X = _this.slider2Left;
            _this.slider2.css({
              left: _this.slider2Left
            });
          }
          if (!e) {
            return;
          }

          if (e.shiftKey) {
            if (_this.contentScroll2Left >= _this.maxScroll2Left) {
              if (_this.options.preventPageScrolling) {
                _this.preventScrolling(e, 'down2');
              }
              _this.$el.trigger('scrollright');
            } else if (_this.contentScroll2Left === 0) {
              if (_this.options.preventPageScrolling) {
                _this.preventScrolling(e, 'up2');
              }
              _this.$el.trigger('scrollleft');
            }
          } else {
            if (_this.contentScrollTop >= _this.maxScrollTop) {
              if (_this.options.preventPageScrolling) {
                _this.preventScrolling(e, DOWN);
              }
              _this.$el.trigger('scrollend');
            } else if (_this.contentScrollTop === 0) {
              if (_this.options.preventPageScrolling) {
                _this.preventScrolling(e, UP);
              }
              _this.$el.trigger('scrolltop');
            }
          }

		  if (!_this.iOSNativeScrolling) {
			_this.scrollClassTrigger();
		  }
        },
		  /**
			* @param {{wheelDeltaY:number, delta:number}} e
			*/
        wheel: function(e) {
          if (!e || undefined === e.wheelDeltaY || undefined === e.delta) {
            return;
          }
			_this.sliderY += -e.wheelDeltaY || -e.delta;
	       _this.scroll();
          return false;
        }
      };
    };

    /**
      Adds event listeners with jQuery.
      @method addEvents
      @private
    */


    NanoScroll.prototype.addEvents = function() {
      var events;
      this.removeEvents();
      events = this.events;
      if (!this.options.disableResize) {
        this.win.bind(RESIZE, events[RESIZE]);
      }
      if (!this.iOSNativeScrolling) {
        this.slider.bind(MOUSEDOWN, events[DOWN]);
        this.slider2.bind(MOUSEDOWN, events['down2']);
        this.pane.bind(MOUSEDOWN, events[PANEDOWN]);//.bind("" + MOUSEWHEEL + " " + DOMSCROLL, events[WHEEL]);
        this.pane2.bind(MOUSEDOWN, events['panedown2']);//.bind("" + MOUSEWHEEL + " " + DOMSCROLL, events[WHEEL]);
      }
      this.$content.bind("" + SCROLL + " " + MOUSEWHEEL + " " + DOMSCROLL + " " + TOUCHMOVE, events[SCROLL]);
    };

    /**
      Removes event listeners with jQuery.
      @method removeEvents
      @private
    */


    NanoScroll.prototype.removeEvents = function() {
      var events;
      events = this.events;
      this.win.unbind(RESIZE, events[RESIZE]);
      if (!this.iOSNativeScrolling) {
        this.slider.unbind();
        this.pane.unbind();
        this.slider2.unbind();
        this.pane2.unbind();
      }
      this.$content.unbind("" + SCROLL + " " + MOUSEWHEEL + " " + DOMSCROLL + " " + TOUCHMOVE, events[SCROLL]);
    };

    /**
      Generates nanoScroller's scrollbar and elements for it.
      @method generate
      @chainable
      @private
    */


    NanoScroll.prototype.generate = function() {
      var contentClass, cssRule, options, paneClass, sliderClass;
      options = this.options;
      paneClass = options.paneClass, sliderClass = options.sliderClass, contentClass = options.contentClass;
      if (!this.$el.find("." + paneClass).length && !this.$el.find("." + sliderClass).length) {
        this.$el.append("<div class=\"" + paneClass + "\"><div class=\"" + sliderClass + "\" /></div>");
      }
      if (!this.$el.find(".pane2").length && !this.$el.find(".slider2").length) {
        this.$el.append("<div class=\"pane2\"><div class=\"slider2\" /></div>");
      }
      this.slider = this.$el.find("." + sliderClass);
      this.slider2 = this.$el.find(".slider2");
      this.pane = this.$el.find("." + paneClass);
      this.pane2 = this.$el.find(".pane2");
      if (BROWSER_SCROLLBAR_WIDTH) {
        cssRule = this.$el.css('direction') === 'rtl' ? {
           left: -BROWSER_SCROLLBAR_WIDTH,
          bottom: -BROWSER_SCROLLBAR_WIDTH
        } : {
          right: -BROWSER_SCROLLBAR_WIDTH,
          bottom: -BROWSER_SCROLLBAR_WIDTH
        };
        this.$el.addClass('has-scrollbar');
      }
      if (cssRule != null) {
        this.$content.css(cssRule);
      }
      return this;
    };

    /**
      @method restore
      @private
    */


    NanoScroll.prototype.restore = function() {
      this.stopped = false;
      this.pane.show();
      this.pane2.show();
      this.addEvents();
    };

    /**
      Resets nanoScroller's scrollbar.
      @method reset
      @chainable
      @example
          $(".nano").nanoScroller();
    */


    NanoScroll.prototype.reset = function() {
      var content, contentHeight, contentStyle, contentStyleOverflowY, paneBottom, paneHeight, paneOuterHeight, paneTop, sliderHeight,
			contentStyleOverflowX, contentWidth, pane2Width, pane2Right, pane2Left, pane2OuterWidth, slider2Width;
      if (this.iOSNativeScrolling) {
        this.contentHeight = this.content.scrollHeight;
        this.contentWidth = this.content.scrollWidth;
        return;
      }
      if (!this.$el.find("." + this.options.paneClass).length) {
        this.generate().stop();
      }
      if (!this.$el.find(".pane2").length) {
        this.generate().stop();
      }
      if (this.stopped) {
        this.restore();
      }
      content = this.content;
      contentStyle = content.style;
      contentStyleOverflowY = contentStyle.overflowY;
      contentStyleOverflowX = contentStyle.overflowX;
      if (BROWSER_IS_IE7) {
        this.$content.css({
          height: this.$content.height()
        });
      }
      contentHeight = content.scrollHeight + BROWSER_SCROLLBAR_WIDTH;
      contentWidth = content.scrollWidth + BROWSER_SCROLLBAR_WIDTH;
      paneHeight = this.pane.outerHeight();
      pane2Width = this.pane2.outerWidth();
      paneTop = parseInt(this.pane.css('top'), 10);
      pane2Left = parseInt(this.pane2.css('left'), 10);
      paneBottom = parseInt(this.pane.css('bottom'), 10);
      pane2Right = parseInt(this.pane2.css('right'), 10);
      paneOuterHeight = paneHeight + paneTop + paneBottom;
      pane2OuterWidth = pane2Width + pane2Left + pane2Right;
      sliderHeight = Math.round(paneOuterHeight / contentHeight * paneOuterHeight);
      slider2Width = Math.round(pane2OuterWidth / contentWidth * pane2OuterWidth);
      if (sliderHeight < this.options.sliderMinHeight) {
        sliderHeight = this.options.sliderMinHeight;
      } else if ((this.options.sliderMaxHeight != null) && sliderHeight > this.options.sliderMaxHeight) {
        sliderHeight = this.options.sliderMaxHeight;
      }
      if (slider2Width < this.options.sliderMinHeight) {
        slider2Width = this.options.sliderMinHeight;
      } else if ((this.options.sliderMaxHeight != null) && slider2Width > this.options.sliderMaxHeight) {
        slider2Width = this.options.sliderMaxHeight;
      }
      if (contentStyleOverflowY === SCROLL && contentStyle.overflowX !== SCROLL) {
        sliderHeight += BROWSER_SCROLLBAR_WIDTH;
      }
      if (contentStyleOverflowX === SCROLL && contentStyle.overflowY !== SCROLL) {
        slider2Width += BROWSER_SCROLLBAR_WIDTH;
      }
      this.maxSliderTop = paneOuterHeight - sliderHeight;
      this.maxSlider2Left = pane2OuterWidth - slider2Width;
      this.contentHeight = contentHeight;
      this.contentWidth = contentWidth;
      this.paneHeight = paneHeight;
      this.pane2Width = pane2Width;
      this.paneOuterHeight = paneOuterHeight;
      this.pane2OuterWidth = pane2OuterWidth;
      this.sliderHeight = sliderHeight;
      this.slider2Width = slider2Width;
      this.slider.height(sliderHeight);
      this.slider2.width(slider2Width);
      this.events.scroll();
      this.pane.show();
      this.pane2.show();
      this.isActive = true;
      if ((content.scrollHeight === content.clientHeight) || (this.pane.outerHeight(true) >= content.scrollHeight && contentStyleOverflowY !== SCROLL)) {
        this.pane.hide();
        this.isActive = false;
      } else if (this.el.clientHeight === content.scrollHeight && contentStyleOverflowY === SCROLL) {
        this.slider.hide();
      } else {
        this.slider.show();
      }
		this.isActive2 = true;
      if ((content.scrollWidth === content.clientWidth) || (this.pane2.outerWidth(true) >= content.scrollWidth - 30 && contentStyleOverflowX !== SCROLL)) {
        this.pane2.hide();
        this.isActive2 = false;
      } else if (this.el.clientWidth === content.scrollWidth && contentStyleOverflowX === SCROLL) {
        this.slider2.hide();
      } else {
        this.slider2.show();
      }
      this.pane.css({
        opacity: (this.options.alwaysVisible ? 1 : ''),
        visibility: (this.options.alwaysVisible ? 'visible' : '')
      });
      this.pane2.css({
        opacity: (this.options.alwaysVisible ? 1 : ''),
        visibility: (this.options.alwaysVisible ? 'visible' : '')
      });
      return this;
    };

    /**
      @method scroll
      @private
      @example
          $(".nano").nanoScroller({ scroll: 'top' });
    */


    NanoScroll.prototype.scroll = function() {
      if (!this.isActive && !this.isActive2) {
        return;
      }

		if (this.isActive) {
			this.sliderY = Math.max(0, this.sliderY);
			this.sliderY = Math.min(this.maxSliderTop, this.sliderY);
			this.$content.scrollTop((this.paneHeight - this.contentHeight + BROWSER_SCROLLBAR_WIDTH) * this.sliderY / this.maxSliderTop * -1);
		}

		if (this.isActive2) {
			this.slider2X = Math.max(0, this.slider2X);
			this.slider2X = Math.min(this.maxSlider2Left, this.slider2X);
			this.$content.scrollLeft((this.pane2Width - this.contentWidth + BROWSER_SCROLLBAR_WIDTH) * this.slider2X / this.maxSlider2Left * -1);
		}
      if (!this.iOSNativeScrolling) {

			if (this.isActive) {
				this.slider.css({
				  top: this.sliderY
				});
			}
			if (this.isActive2) {
				this.slider2.css({
				  left: this.slider2X
				});
			}
      }
      return this;
    };

    /**
      Scroll at the bottom with an offset value
      @method scrollBottom
      @param offsetY {Number}
      @chainable
      @example
          $(".nano").nanoScroller({ scrollBottom: value });
    */


    NanoScroll.prototype.scrollBottom = function(offsetY) {
      if (!this.isActive && !this.isActive2) {
        return;
      }
      this.reset();
      this.$content.scrollTop(this.contentHeight - this.$content.height() - offsetY).trigger(MOUSEWHEEL);
      return this;
    };

    /**
      Scroll at the top with an offset value
      @method scrollTop
      @param offsetY {Number}
      @chainable
      @example
          $(".nano").nanoScroller({ scrollTop: value });
    */


    NanoScroll.prototype.scrollTop = function(offsetY) {
      if (!this.isActive && !this.isActive2) {
        return;
      }
      this.reset();
      this.$content.scrollTop(+offsetY).trigger(MOUSEWHEEL);
      return this;
    };

    /**
      Scroll to an element
      @method scrollTo
      @param node {Node} A node to scroll to.
      @chainable
      @example
          $(".nano").nanoScroller({ scrollTo: $('#a_node') });
    */


    NanoScroll.prototype.scrollTo = function(node) {
      if (!this.isActive && !this.isActive2) {
        return;
      }
      this.reset();
      this.scrollTop($(node).get(0).offsetTop);
      return this;
    };

    /**
      To stop the operation.
      This option will tell the plugin to disable all event bindings and hide the gadget scrollbar from the UI.
      @method stop
      @chainable
      @example
          $(".nano").nanoScroller({ stop: true });
    */


    NanoScroll.prototype.stop = function() {
      this.stopped = true;
      this.removeEvents();
      this.pane.hide();
      return this;
    };

    /**
      To flash the scrollbar gadget for an amount of time defined in plugin settings (defaults to 1,5s).
      Useful if you want to show the user (e.g. on pageload) that there is more content waiting for him.
      @method flash
      @chainable
      @example
          $(".nano").nanoScroller({ flash: true });
    */


    NanoScroll.prototype.flash = function() {
      var _this = this;
      if (!this.isActive && !this.isActive2) {
        return;
      }
      this.reset();
      this.pane.addClass('flashed');
      setTimeout(function() {
        _this.pane.removeClass('flashed');
      }, this.options.flashDelay);
      return this;
    };

    return NanoScroll;

  })();
  $.fn.nanoScroller = function(settings) {
    return this.each(function() {
      var options, scrollbar;
      if (!(scrollbar = this.nanoscroller)) {
        options = $.extend({}, defaults, settings);
        this.nanoscroller = scrollbar = new NanoScroll(this, options);
      }
      if (settings && typeof settings === "object") {
        $.extend(scrollbar.options, settings);
        if (settings.scrollBottom) {
          return scrollbar.scrollBottom(settings.scrollBottom);
        }
        if (settings.scrollTop) {
          return scrollbar.scrollTop(settings.scrollTop);
        }
        if (settings.scrollTo) {
          return scrollbar.scrollTo(settings.scrollTo);
        }
        if (settings.scroll === 'bottom') {
          return scrollbar.scrollBottom(0);
        }
        if (settings.scroll === 'top') {
          return scrollbar.scrollTop(0);
        }
        if (settings.scroll && settings.scroll instanceof $) {
          return scrollbar.scrollTo(settings.scroll);
        }
        if (settings.stop) {
          return scrollbar.stop();
        }
        if (settings.flash) {
          return scrollbar.flash();
        }
      }
      return scrollbar.reset();
    });
  };
})(jQuery, window, document);
