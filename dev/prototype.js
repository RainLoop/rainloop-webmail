
(doc=>{
	Array.isNotEmpty = array => Array.isArray(array) && array.length;
	Array.prototype.unique = function() { return this.filter((v, i, a) => a.indexOf(v) === i); };
	Array.prototype.validUnique = function(fn) {
		return this.filter((v, i, a) => (fn ? fn(v) : v) && a.indexOf(v) === i);
	};

	Date.defineRelativeTimeFormat = config => relativeTime = config;

	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat
	let formats = {
		LT   : {hour: 'numeric', minute: 'numeric'},
		L    : {},
		LL   : {year: 'numeric', month: 'short', day: 'numeric'},
		LLL  : {year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric'},
		LLLL : {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric'},
		'd M': {day: '2-digit', month: 'short'}
	},
	phpFormats = {
		// Day
		d: {day: '2-digit'},
		D: {weekday: 'short'},
		j: {day: 'numeric'},
		l: {weekday: 'long'},
		// Month
		F: {month: 'long'},
		m: {month: '2-digit'},
		M: {month: 'short'},
		n: {month: 'numeric'},
		Y: {year: 'numeric'},
		y: {year: '2-digit'},
		// Time
		a: {hour12: true},
		A: {hour12: true},
		g: {hour: 'numeric', hourCycle: 'h12'},
		G: {hour: 'numeric'},
		h: {hour: '2-digit', hourCycle: 'h12'},
		H: {hour: '2-digit'},
		i: {minute: '2-digit'},
		s: {second: '2-digit'},
		u: {fractionalSecondDigits: 3},
		Z: {timeZone: 'UTC'}
	},
	relativeTime = {
		// see /rainloop/v/0.0.0/app/localization/relativetimeformat/
	},
	pad2 = v => 10 > v ? '0' + v : v;

	// Format momentjs/PHP date formats to Intl.DateTimeFormat
	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat
	Date.prototype.format = function (str, UTC) {
		if ('Y-m-d\\TH:i:s' == str) {
			return this.getFullYear() + '-' + pad2(1 + this.getMonth()) + '-' + pad2(this.getDate())
				+ 'T' + pad2(this.getHours()) + ':' + pad2(this.getMinutes()) + ':' + pad2(this.getSeconds());
		}
		let options = {};
		if (formats[str]) {
			options = formats[str];
		} else {
			console.log('Date.format('+str+', '+(UTC?'true':'false')+')');
			if (UTC) {
				str += 'Z';
			}
			let i = str.length;
			while (i--) {
				phpFormats[str[i]] && Object.entries(phpFormats[str[i]]).forEach(([k,v])=>options[k]=v);
			}
			formats[str] = options;
		}
		return new Intl.DateTimeFormat(doc.documentElement.lang, options).format(this);
	};

	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/RelativeTimeFormat
	Date.prototype.fromNow = function() {
		let unit = 'second',
			value = (this.getTime() - Date.now()) / 1000,
			t = [[60,'minute'],[3600,'hour'],[86400,'day'],[2628000,'month'],[31536000,'year']],
			i = 5,
			abs = Math.abs(value);
		while (i--) {
			if (t[i][0] <= abs) {
				value = Math.round(value / t[i][0]);
				unit = t[i][1];
				break;
			}
		}
		if (Intl.RelativeTimeFormat) {
			let rtf = new Intl.RelativeTimeFormat(doc.documentElement.lang);
			return rtf.format(value, unit);
		}
		abs = Math.abs(value);
		let rtf = relativeTime.long[unit][0 > value ? 'past' : 'future'],
			plural = relativeTime.plural(abs);
		return (rtf[plural] || rtf).replace('{0}', abs);
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
