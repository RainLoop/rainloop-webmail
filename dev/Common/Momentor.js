import { i18n } from 'Common/Translator';

export function format(timeStampInUTC, formatStr) {
	const now = Date.now(),
		time = 0 < timeStampInUTC ? Math.min(now, timeStampInUTC * 1000) : (0 === timeStampInUTC ? now : 0);

	if (31536000000 < time) {
		const m = new Date(time);
		switch (formatStr) {
			case 'FROMNOW':
				return m.fromNow();
			case 'SHORT': {
				if (4 >= (now - time) / 3600000)
					return m.fromNow();
				const ymd = m.format('Ymd'), date = new Date;
				if (date.format('Ymd') === ymd)
					return i18n('MESSAGE_LIST/TODAY_AT', {TIME: m.format('LT')});
				if (new Date(now - 86400000).format('Ymd') === ymd)
					return i18n('MESSAGE_LIST/YESTERDAY_AT', {TIME: m.format('LT')});
				if (date.getFullYear() === m.getFullYear())
					return m.format('d M.');
				return m.format('LL');
			}
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

addEventListener('reload-time', () => setTimeout(() =>
		document.querySelectorAll('[data-bind*="moment:"]').forEach(element => timeToNode(element))
	, 1)
);
