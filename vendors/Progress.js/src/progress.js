/**
 * Progress.js v0.1.0
 * https://github.com/usablica/progress.js
 * MIT licensed
 *
 * Copyright (C) 2013 usabli.ca - Afshin Mehrabani (@afshinmeh)
 */

(exports => {
  //Default config/variables
  const VERSION = '0.1.0',
    win = window,
    doc = document,
    defined = v => undefined !== v;

  /**
   * ProgressJs main class
   *
   * @class ProgressJs
   */
  function ProgressJs(obj) {

    this._targetElement = defined(obj.length) ? obj : [obj];

    if (!defined(win._progressjsId))
      win._progressjsId = 1;

    if (!defined(win._progressjsIntervals))
      win._progressjsIntervals = {};

    this._options = {
      //progress bar theme
      theme: 'rainloop',
      //overlay mode makes an overlay layer in the target element
      overlayMode: false,
      //to consider CSS3 transitions in events
      considerTransition: true
    };
  }

  /**
   * Set progress bar for specific element
   *
   * @api private
   * @method _setProgress
   * @param {Object} targetElement
   */
  function _setProgress(targetElement) {

    //if the target element already as `data-progressjs`, ignore the init
    if (targetElement.hasAttribute("data-progressjs"))
      return;

    //get target element position
    var targetElementOffset = _getOffset.call(this, targetElement);

    targetElement.setAttribute("data-progressjs", win._progressjsId);

    var progressElementContainer = doc.createElement('div');
    progressElementContainer.className = 'progressjs-progress progressjs-theme-' + this._options.theme;


    //set the position percent elements, it depends on targetElement tag
    progressElementContainer.style.position = targetElement.tagName.toLowerCase() === 'body' ? 'fixed' : 'absolute';

    progressElementContainer.setAttribute("data-progressjs", win._progressjsId);
    var progressElement = doc.createElement("div");
    progressElement.className = "progressjs-inner";

    //create an element for current percent of progress bar
    var progressPercentElement = doc.createElement('div');
    progressPercentElement.className = "progressjs-percent";
    progressPercentElement.innerHTML = "1%";

    progressElement.appendChild(progressPercentElement);

    if (this._options.overlayMode && targetElement.tagName.toLowerCase() === 'body') {
      //if we have `body` for target element and also overlay mode is enable, we should use a different
      //position for progress bar container element
      progressElementContainer.style.left   = 0;
      progressElementContainer.style.right  = 0;
      progressElementContainer.style.top    = 0;
      progressElementContainer.style.bottom = 0;
    } else {
      //set progress bar container size and offset
      progressElementContainer.style.left  = targetElementOffset.left + 'px';
      progressElementContainer.style.top   = targetElementOffset.top + 'px';
      progressElementContainer.style.width = targetElementOffset.width + 'px';

      if (this._options.overlayMode) {
        progressElementContainer.style.height = targetElementOffset.height + 'px';
      }
    }

    progressElementContainer.appendChild(progressElement);

    //append the element to container
    var container = doc.querySelector('.progressjs-container');
    container.appendChild(progressElementContainer);

    _setPercentFor(targetElement, 1);

    //and increase the progressId
    ++win._progressjsId;
  }

  /**
   * Set percent for specific element
   *
   * @api private
   * @method _setPercentFor
   * @param {Object} targetElement
   * @param {Number} percent
   */
  function _setPercentFor(targetElement, percent) {
    //prevent overflow!
    if (percent >= 100)
      percent = 100;

    if (targetElement.hasAttribute("data-progressjs")) {
      //setTimeout for better CSS3 animation applying in some cases
      setTimeout(() => {

        var percentElement = _getPercentElement(targetElement);
        percentElement.style.width = parseInt(percent) + '%';

        percentElement  = percentElement.querySelector(".progressjs-percent");
        var existingPercent = parseInt(percentElement.innerHTML.replace('%', ''));

        //start increase/decrease the percent element with animation
        ((percentElement, existingPercent, currentPercent) => {

          var increasement = true;
          if (existingPercent > currentPercent) {
            increasement = false;
          }

          var intervalIn = 10;
          function changePercentTimer(percentElement, existingPercent, currentPercent) {
            //calculate the distance between two percents
            var distance = Math.abs(existingPercent - currentPercent);
            if (distance < 3) {
              intervalIn = 30;
            } else if (distance < 20) {
              intervalIn = 20;
            } else {
              intervalIn = 1;
            }

            if ((existingPercent - currentPercent) != 0) {
              //set the percent
              percentElement.innerHTML = (increasement ? (++existingPercent) : (--existingPercent)) + '%';
              setTimeout(() => changePercentTimer(percentElement, existingPercent, currentPercent), intervalIn);
            }
          }

          changePercentTimer(percentElement, existingPercent, currentPercent);

        })(percentElement, existingPercent, parseInt(percent));

      }, 50);
    }
  }

  /**
   * Get the progress bar element
   *
   * @api private
   * @method _getPercentElement
   * @param {Object} targetElement
   */
  function _getPercentElement(targetElement) {
    var progressjsId = parseInt(targetElement.getAttribute('data-progressjs'));
    return doc.querySelector('.progressjs-container > .progressjs-progress[data-progressjs="' + progressjsId + '"] > .progressjs-inner');
  }

  /**
   * Get an element position on the page
   * Thanks to `meouw`: http://stackoverflow.com/a/442474/375966
   *
   * @api private
   * @method _getOffset
   * @param {Object} element
   * @returns Element's position info
   */
  function _getOffset(element) {
    var elementPosition = {}, _x = 0, _y = 0;

    if (element.tagName.toLowerCase() === 'body') {
      //set width
      elementPosition.width = element.clientWidth;
      //set height
      elementPosition.height = element.clientHeight;
    } else {
      //set width
      elementPosition.width = element.offsetWidth;
      //set height
      elementPosition.height = element.offsetHeight;
    }

    //calculate element top and left
    while (element && !isNaN(element.offsetLeft) && !isNaN(element.offsetTop)) {
      _x += element.offsetLeft;
      _y += element.offsetTop;
      element = element.offsetParent;
    }
    //set top
    elementPosition.top = _y;
    //set left
    elementPosition.left = _x;

    return elementPosition;
  }

  var progressJs = function (targetElm) {
    if (typeof (targetElm) === 'object') {
      //Ok, create a new instance
      return new ProgressJs(targetElm);
    }
    if (typeof (targetElm) === 'string') {
      //select the target element with query selector
      var targetElement = doc.querySelectorAll(targetElm);

      if (targetElement) {
        return new ProgressJs(targetElement);
      }
      throw new Error('There is no element with given selector.');
    }
    return new ProgressJs(doc.body);
  };

  /**
   * Current ProgressJs version
   *
   * @property version
   * @type String
   */
  progressJs.version = VERSION;

  //Prototype
  progressJs.fn = ProgressJs.prototype = {
    start: function() {
      //first check if we have an container already, we don't need to create it again
      if (!doc.querySelector(".progressjs-container")) {
        //create the container for progress bar
        var containerElement = doc.createElement("div");
        containerElement.className = "progressjs-container";
        doc.body.appendChild(containerElement);
      }
      var p = this;
      p._targetElement.forEach(item => _setProgress.call(p, item));
      return p;
    },
    set: function(percent) {
      var p = this;
      p._targetElement.forEach(item => _setPercentFor.call(p, item, percent));
      return p;
    },
    end: function() {
      var p = this;
      //call onBeforeEnd callback
      if (defined(p._onBeforeEndCallback)) {
        if (p._options.considerTransition === true) {
          //we can safety assume that all layers would be the same, so `p._targetElement[0]` is the same as `p._targetElement[1]`
          _getPercentElement(p._targetElement[0])
            .addEventListener('transitionend', p._onBeforeEndCallback, false);
        } else {
          p._onBeforeEndCallback.call(p);
        }
      }

      var progressjsId = parseInt(p._targetElement[0].getAttribute('data-progressjs'));

      p._targetElement.forEach(currentElement => {
        var percentElement = _getPercentElement(currentElement);

        if (!percentElement)
          return;

        var existingPercent = parseInt(percentElement.style.width.replace('%', ''));

        var timeoutSec = 1;
        if (existingPercent < 100) {
          _setPercentFor.call(p, currentElement, 100);
          timeoutSec = 500;
        }

        //I believe I should handle this situation with eventListener and `transitionend` event but I'm not sure
        //about compatibility with IEs. Should be fixed in further versions.
        ((percentElement, currentElement) => {
          setTimeout(() => {
            percentElement.parentNode.className += " progressjs-end";

            setTimeout(() => {
              //remove the percent element from page
              percentElement.parentNode.parentNode.removeChild(percentElement.parentNode);
              //and remove the attribute
              currentElement.removeAttribute("data-progressjs");
            }, 1000);
          }, timeoutSec);
        })(percentElement, currentElement);
      });

      //clean the setInterval for autoIncrease function
      if (win._progressjsIntervals[progressjsId]) {
        //`delete` keyword has some problems in IE
        try {
          clearInterval(win._progressjsIntervals[progressjsId]);
          win._progressjsIntervals[progressjsId] = null;
          delete win._progressjsIntervals[progressjsId];
        } catch(ex) { }
      }
      return p;
    },
    onbeforeend: function(providedCallback) {
      this._onBeforeEndCallback = providedCallback;
      return this;
    }
  };

  exports.progressJs = progressJs;
  return progressJs;
})(this);
