/**
 * Progress.js v0.1.0
 * https://github.com/usablica/progress.js
 * MIT licensed
 *
 * Copyright (C) 2013 usabli.ca - Afshin Mehrabani (@afshinmeh)
 */

(exports => {
  //Default config/variables
  const doc = document,
    defined = v => undefined !== v;
  let progressjsId = 1;

  /**
   * ProgressJs main class
   *
   * @class ProgressJs
   */
  function ProgressJs(obj) {
    this._targetElement = defined(obj.length) ? obj : [obj];
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

    targetElement.setAttribute("data-progressjs", progressjsId);

    var progressElementContainer = doc.createElement('div');
    progressElementContainer.className = 'progressjs-progress progressjs-theme-rainloop';
    progressElementContainer.setAttribute("data-progressjs", progressjsId);

    var progressElement = doc.createElement("div");
    progressElement.className = "progressjs-inner";
    progressElementContainer.appendChild(progressElement);

    //create an element for current percent of progress bar
    var progressPercentElement = doc.createElement('div');
    progressPercentElement.className = "progressjs-percent";
    progressElement.appendChild(progressPercentElement);

    //append the element to container
    doc.querySelector('.progressjs-container').appendChild(progressElementContainer);

    _setPercentFor(targetElement, 1);

    //and increase the progressId
    ++progressjsId;
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
        //we can safety assume that all layers would be the same, so `p._targetElement[0]` is the same as `p._targetElement[1]`
        _getPercentElement(p._targetElement[0])
          .addEventListener('transitionend', p._onBeforeEndCallback, false);
      }

      p._targetElement.forEach(currentElement => {
        var percentElement = _getPercentElement(currentElement);

        if (!percentElement)
          return;

        var existingPercent = parseInt(percentElement.style.width.replace('%', ''));

        if (existingPercent < 100) {
          _setPercentFor.call(p, currentElement, 100);
        }
      });

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
