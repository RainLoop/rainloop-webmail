import { i18n } from 'Common/Translator';

let d,
	_moment = null,
	momentNow = () => {
		if (!d) {
			d = setTimeout(()=>d=0, 500);
			_moment = new Date();
		}
		return _moment;
	};

export function format(timeStampInUTC, formatStr) {
	const now = Date.now() / 1000;

	timeStampInUTC = 0 < timeStampInUTC ? Math.min(now, timeStampInUTC) : (0 === timeStampInUTC ? now : 0);

	if (31536000 < timeStampInUTC) {
		const m = new Date(timeStampInUTC * 1000);
		switch (formatStr) {
			case 'FROMNOW':
				return m.fromNow();
			case 'SHORT':
				if (4 >= (now - timeStampInUTC) / 3600)
					return m.fromNow();
				if (momentNow().format('Ymd') === m.format('Ymd'))
					return i18n('MESSAGE_LIST/TODAY_AT', {TIME: m.format('LT')});
				if (new Date((now - 86400) * 1000).format('Ymd') === m.format('Ymd'))
					return i18n('MESSAGE_LIST/YESTERDAY_AT', {TIME: m.format('LT')});
				if (momentNow().getFullYear() === m.getFullYear())
					return m.format('d M.');
				return m.format('LL');
			case 'FULL':
				return m.format('LLL');
			default:
				return m.format(formatStr);
		}
	}

	return '';
}

export function timeToNode(element, time) {
	try {
		time = time || (Date.parse(element.dateTime) / 1000);
		if (time) {
			let key, m = new Date(time * 1000);
			element.dateTime = m.format('Y-m-d\\TH:i:s');

			key = element.dataset.momentFormat;
			if (key) {
				element.textContent = format(time, key);
			}

			key = element.dataset.momentFormatTitle;
			if (key) {
				element.title = format(time, key);
			}
		}
	} catch (e) {
		// prevent knockout crashes
		console.error(e);
	}
}

/**
 * @returns {void}
 */
export function reload() {
	setTimeout(() =>
		document.querySelectorAll('[data-bind*="moment:"]').forEach(element => timeToNode(element))
	, 1);
}
