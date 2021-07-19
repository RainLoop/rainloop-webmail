import { i18n } from 'Common/Translator';

export function timestampToString(timeStampInUTC, formatStr) {
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
				const mt = m.getTime(), date = new Date,
					dt = date.setHours(0,0,0,0);
				if (mt > dt)
					return i18n('MESSAGE_LIST/TODAY_AT', {TIME: m.format('LT')});
				if (mt > dt - 86400000)
					return i18n('MESSAGE_LIST/YESTERDAY_AT', {TIME: m.format('LT')});
				if (date.getFullYear() === m.getFullYear())
					return m.format('d M');
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
			element.dateTime = (new Date(time * 1000)).format('Y-m-d\\TH:i:s');

			let key = element.dataset.momentFormat;
			if (key) {
				element.textContent = timestampToString(time, key);
			}

			if ((key = element.dataset.momentFormatTitle)) {
				element.title = timestampToString(time, key);
			}
		}
	} catch (e) {
		// prevent knockout crashes
		console.error(e);
	}
}
