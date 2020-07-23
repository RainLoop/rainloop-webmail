//     Underscore.js 1.9.2
//     https://underscorejs.org
//     (c) 2009-2018 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.
/*
_.debounce
_.defer
_.throttle
*/

(() => {

  // Baseline setup
  // --------------

  // Create a safe reference to the Underscore object for use below.
  var _ = function() { };

  // Establish the root object, `window` (`self`) in the browser.
  // We use `self`instead of `window` for `WebWorker` support.
  (typeof self == 'object' && self.self === self && self || {})._ = _;

  // Function (ahem) Functions
  // ------------------

  // Determines whether to execute a function as a constructor
  // or a normal function with the provided arguments.
  var executeBound = function(sourceFunc, boundFunc, context, callingContext, args) {
    if (!(callingContext instanceof boundFunc)) return sourceFunc.apply(context, args);
    var fp = sourceFunc.prototype,
      self = (typeof fp !== 'object') ? {} : Object.create(fp),
      result = sourceFunc.apply(self, args);
    return (typeof result === 'object') ? result : self;
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = (() => {
    var func = (func, wait, ...args) => setTimeout(() => func.apply(null, args), wait),
      bound = function(...params) {
        var pos = 1,
          args = [params[0], 1];
        while (pos < params.length) args.push(params[pos++]);
        return executeBound(func, bound, this, this, args);
      };
    return bound;
  })();

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    if (!options) options = {};
    var timeout, context, args, result,
      previous = 0,
      later = function() {
        previous = options.leading === false ? 0 : Date.now();
        timeout = null;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      },
      throttle = (...args) => {
        var now = Date.now();
        if (!previous && options.leading === false) previous = now;
        var remaining = wait - (now - previous);
        context = this;
        if (remaining <= 0 || remaining > wait) {
          if (timeout) {
            clearTimeout(timeout);
            timeout = null;
          }
          previous = now;
          result = func.apply(context, args);
          if (!timeout) context = args = null;
        } else if (!timeout && options.trailing !== false) {
          timeout = setTimeout(later, remaining);
        }
        return result;
      };

    throttle.cancel = () => {
      clearTimeout(timeout);
      previous = 0;
      timeout = context = args = null;
    };

    return throttle;
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, result,
      later = (context, args) => {
        timeout = null;
        if (args) result = func.apply(context, args);
      },
      debounce = function(...args) {
        if (timeout) clearTimeout(timeout);
        if (immediate) {
          var callNow = !timeout;
          timeout = setTimeout(later, wait);
          if (callNow) result = func.apply(this, args);
        } else {
          var obj = this;
          timeout = setTimeout(() => later.apply(null, [obj, args]), wait);
        }

        return result;
      };

    debounce.cancel = () => {
      clearTimeout(timeout);
      timeout = null;
    };

    return debounce;
  };

})();
