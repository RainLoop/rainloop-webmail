
(w=>{

	// Import momentjs locales function
	w.moment = {
		defineLocale: (name, config)=>{
			locale = config;
			for (let i = 0; i < 12; ++i) Date.shortMonths[i] = config.monthsShort(i+1, 'MMM');
			Date.longMonths = config.months,
			Date.longDays = config.weekdays;
			Date.shortDays = config.weekdaysMin; // config.weekdaysShort
		}
	};

	let locale = {
		longDateFormat: {
			LT   : 'h:mm A', // 'g:i A',
			L    : 'MM/DD/YYYY', // 'Y-m-d',
			LL   : 'MMMM D, YYYY', // 'F j, Y'
			LLL  : 'MMMM D, YYYY h:mm A', // 'F j, Y g:i A'
			LLLL : 'dddd, MMMM D, YYYY h:mm A' // 'l, F j, Y g:i A'
		},
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
	pad2 = v => 10 > v ? '0' + v : v,
	pad3 = v => 10 > v ? '00' + v : (100 > v ? '0' + v : v),
	getISODay = x => x.getDay() || 7,
	getDayOfYear = x => Math.floor((Date.UTC(x.getFullYear(),x.getMonth(),x.getDate())
		- Date.UTC(x.getFullYear(),0,1)) / 86400000),
	getWeek = x => {
		let d = new Date(x.getFullYear(),0,1),
			wd = getISODay(d),
			w = Math.ceil((getDayOfYear(x)+wd) / 7);
		/* ISO 8601 states that week 1 is the week with january 4th in it */
		if (4 < wd) --w;
		return (1 > w
			? getWeek(new Date(x.getFullYear()-1,11,31)) /* previous year, last week */
			: (52 < w && 4 > getISODay(x) ? 1 /* next year, first week */ : w) );
	},
	isDST = x => {
		let y=x.getFullYear();
		return x.getTimezoneOffset() != Math.max(
			new Date(y, 0, 1).getTimezoneOffset(),
			new Date(y, 6, 1).getTimezoneOffset()
		);
	};

	// Defining locale
	Date.shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	Date.longMonths = ['January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'];
	Date.shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	Date.longDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

	// Simulate PHP's date function
	Date.prototype.format = function (str, UTC) {
		if (locale.longDateFormat[str]) {
			str = locale.longDateFormat[str]
				.replace('YYYY', 'Y')
				.replace(/(^|[^M])M([^M]|$)/, '$1n$2')
				.replace('MMMM', 'F')
				.replace('MMM', 'M')
				.replace('MM', 'm')
				.replace(/(^|[^D])D([^D]|$)/, '$1j$2')
				.replace('DD', 'd')
				.replace('dddd', 'l')
				.replace('ddd', 'D')
				.replace('dd', 'D')
				.replace(/(^|[^H])H([^H]|$)/, '$1G$2')
				.replace('HH', 'H')
				.replace('h', 'g')
				.replace('hh', 'h')
				.replace('mm', 'i');
		}
		UTC = UTC || str.match(/\\Z$/);
		let x = this,
			d = UTC ? {
				D: x.getUTCDay(),
				Y: x.getUTCFullYear(),
				m: x.getUTCMonth(),
				d: x.getUTCDate(),
				H: x.getUTCHours(),
				Z: 0
			} : {
				D: x.getDay(),
				Y: x.getFullYear(),
				m: x.getMonth(),
				d: x.getDate(),
				H: x.getHours(),
				Z: -x.getTimezoneOffset()
			};
		return str
			? str.replace(/\\?[a-zA-Z]/g, m => {
				if (m[0] === '\\') { return m[1]; }
				switch (m) {
				// Day
				case 'd': return pad2(d.d);
				case 'D': return Date.shortDays[d.D];
				case 'j': return d.d;
				case 'l': return Date.longDays[d.D];
				case 'N': return getISODay(x);
				case 'w': return d.D;
				case 'z': return getDayOfYear(x);
				// Week
				case 'W': return pad2(getWeek(x));
				// Month
				case 'F': return Date.longMonths[d.m];
				case 'm': return pad2(d.m + 1);
				case 'M': return Date.shortMonths[d.m];
				case 'n': return d.m + 1;
				case 't': return 32 - new Date(x.getFullYear(), x.getMonth(), 32).getDate();
				// Year
				case 'L': return (((d.Y%4===0)&&(d.Y%100 !== 0)) || (d.Y%400===0)) ? '1' : '0';
				case 'o': return new Date(
						x.getFullYear(),
						x.getMonth(),
						x.getDate() - ((x.getDay() + 6) % 7) + 3
					).getFullYear();
				case 'Y': return d.Y;
				case 'y': return ('' + d.Y).substr(2);
				// Time
				case 'a': return d.H < 12 ? "am" : "pm";
				case 'A': return d.H < 12 ? "AM" : "PM";
				case 'g': return d.H % 12 || 12;
				case 'G': return d.H;
				case 'h': return pad2(d.H % 12 || 12);
				case 'H': return pad2(d.H);
				case 'i': return pad2(UTC?x.getUTCMinutes():x.getMinutes());
				case 's': return pad2(UTC?x.getUTCSeconds():x.getSeconds());
				case 'u': return pad3(UTC?x.getUTCMilliseconds():x.getMilliseconds());
				// Timezone
				case 'I': return UTC ? 0 : isDST(x) ? 1 : 0;
				case 'O': return UTC ? 'Z' : (d.Z > 0 ? '+' : '-') + pad2(Math.abs(d.Z / 60)) + '00';
				case 'P': return UTC ? 'Z' : (d.Z > 0 ? '+' : '-') + pad2(Math.abs(d.Z / 60)) + ':' + pad2(Math.abs(d.Z % 60));
				case 'T': return UTC ? 'UTC' : new Date(d.Y, 0, 1).toTimeString().replace(/^.+ \(?([^)]+)\)?$/, '$1');
				case 'Z': return d.Z * 60;
				// Full Date/Time
				case 'c': return x.format("Y-m-d\\TH:i:sO");
				case 'r': return x.format("D, d M Y H:i:s O");
				case 'U': return x.getTime() / 1000;
				}
				return m;
			})
			: x.toString();
	};

	// Simulate momentjs fromNow function
	Date.prototype.fromNow = function() {
		let format,
			seconds = ((new Date()).getTime() - this.getTime()) / 1000,
			str = locale.relativeTime[0 < seconds ? 'future' : 'past'];
		seconds = Math.abs(seconds);
		if (60 > seconds) {
			format = 's';
		} else if (3600 > seconds) {
			seconds = seconds / 60;
			format = 'm';
		} else if (86400 > seconds) {
			seconds = seconds / 3600;
			format = 'h';
		} else if (2628000 > seconds) {
			seconds = seconds / 86400;
			format = 'd';
		} else if (31536000 > seconds) {
			seconds = seconds / 2628000;
			format = 'M';
		} else {
			seconds = seconds / 31536000;
			format = 'y';
		}
		seconds = Math.round(seconds);
		if (1 < seconds) {
			format += format;
		}
		return str.replace('%s', locale.relativeTime[format].replace('%d', seconds));
	}

})(this);
