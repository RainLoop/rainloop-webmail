
(doc=>{
	Array.prototype.unique = function() { return this.filter((v, i, a) => a.indexOf(v) === i); };
	Array.prototype.validUnique = function(fn) {
		return this.filter((v, i, a) => (fn ? fn(v) : v) && a.indexOf(v) === i);
	};

	// full = Monday, December 12, 2022 at 12:16:21 PM Central European Standard Time
	// long = December 12, 2022 at 12:16:21 PM GMT+1
	// medium = Dec 12, 2022, 12:16:21 PM
	// short = 12/12/22, 12:16 PM
	let formats = {
		LT   : {timeStyle: 'short'},
		LLL  : {dateStyle: 'long', timeStyle: 'short'}
	},
	pad2 = v => 10 > v ? '0' + v : v;

	// Format momentjs/PHP date formats to Intl.DateTimeFormat
	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat
	Date.prototype.format = function (options, UTC, hourCycle) {
		if (typeof options == 'string') {
			if ('ISO8601' == options) {
				return this.getFullYear() + '-' + pad2(1 + this.getMonth()) + '-' + pad2(this.getDate())
					+ 'T' + pad2(this.getHours()) + ':' + pad2(this.getMinutes()) + ':' + pad2(this.getSeconds());
			}
			if (formats[options]) {
				options = formats[options];
			} else {
				console.log('Date.format('+options+')');
				options = {};
			}
		}
		if (hourCycle) {
			options.hourCycle = hourCycle;
		}
		return new Intl.DateTimeFormat(doc.documentElement.lang, options).format(this);
	};

	Element.prototype.closestWithin = function(selector, parent) {
		const el = this.closest(selector);
		return (el && el !== parent && parent.contains(el)) ? el : null;
	};

	Element.fromHTML = string => {
		const template = doc.createElement('template');
		template.innerHTML = string.trim();
		return template.content.firstChild;
	};

	/**
	 * Every time the function is executed,
	 * it will delay the execution with the given amount of milliseconds.
	 */
	if (!Function.prototype.debounce) {
		Function.prototype.debounce = function(ms) {
			let func = this, timer;
			return function(...args) {
				timer && clearTimeout(timer);
				timer = setTimeout(()=>{
					func.apply(this, args)
					timer = 0;
				}, ms);
			};
		};
	}

	/**
	 * No matter how many times the event is executed,
	 * the function will be executed only once, after the given amount of milliseconds.
	 */
	if (!Function.prototype.throttle) {
		Function.prototype.throttle = function(ms) {
			let func = this, timer;
			return function(...args) {
				if (!timer) {
					timer = setTimeout(()=>{
						func.apply(this, args)
						timer = 0;
					}, ms);
				}
			};
		};
	}

})(document);
