
(w=>{
	Array.isNotEmpty = array => Array.isArray(array) && array.length;
	Array.prototype.unique = function() { return this.filter((v, i, a) => a.indexOf(v) === i); };
	Array.prototype.validUnique = function(fn) {
		return this.filter((v, i, a) => (fn ? fn(v) : v) && a.indexOf(v) === i);
	};

	// Import momentjs locales function
	w.moment = {
		defineLocale: (name, config) => locale = config
	};

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
//		N: {},
//		w: {},
//		z: {},
		// Week
//		W: {},
		// Month
		F: {month: 'long'},
		m: {month: '2-digit'},
		M: {month: 'short'},
		n: {month: 'numeric'},
//		t: {},
		// Year
//		L: {},
//		o: {},
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
		// Timezone
//		O: return UTC ? 'Z' : (d.Z > 0 ? '+' : '-') + pad2(Math.abs(d.Z / 60)) + '00';
//		P: return UTC ? 'Z' : (d.Z > 0 ? '+' : '-') + pad2(Math.abs(d.Z / 60)) + :' + pad2(Math.abs(d.Z % 60));
//		T: return UTC ? 'UTC' : new Date(d.Y, 0, 1).toTimeString().replace(/^.+ \(?([^)]+)\)?$/, '$1');
		Z: {timeZone: 'UTC'}
		// Full Date/Time
//		c: {},
//		r: {},
//		U: {},
//		options.timeZoneName = 'short';
	},
	locale = {
		relativeTime : {
			future : 'in %s',
			past : '%s ago',
			s : 'a few seconds',
			ss : '%d seconds',
			m : 'a minute',
			mm : '%d minutes',
			h : 'an hour',
			hh : '%d hours',
			d : 'a day',
			dd : '%d days',
			M : 'a month',
			MM : '%d months',
			y : 'a year',
			yy : '%d years'
		}
	},
	pad2 = v => 10 > v ? '0' + v : v;

	// Simulate PHP's date function
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
		return new Intl.DateTimeFormat(document.documentElement.lang, options).format(this);
	};

	// Simulate momentjs fromNow function
	Date.prototype.fromNow = function() {
		let format = 's',
			seconds = (Date.now() - this.getTime()) / 1000,
			str = locale.relativeTime[0 < seconds ? 'past' : 'future'],
			t = [[60,'m'],[3600,'h'],[86400,'d'],[2628000,'M'],[31536000,'y']],
			i = 5;
		seconds = Math.abs(seconds);
		while (i--) {
			if (t[i][0] <= seconds) {
				seconds = seconds / t[i][0];
				format = t[i][1];
				break;
			}
		}
		seconds = Math.round(seconds);
		if (1 < seconds) {
			format += format;
		}
		return str.replace('%s', locale.relativeTime[format].replace('%d', seconds));
	};

	Element.prototype.closestWithin = function(selector, parent) {
		const el = this.closest(selector);
		return (el && el !== parent && parent.contains(el)) ? el : null;
	};

	Element.fromHTML = string => {
		const template = document.createElement('template');
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

})(this);
