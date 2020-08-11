import { i18n } from 'Common/Translator';

let _moment = null;
let d;

/**
 * @returns {moment}
 */
function momentNow() {
	if (!d) {
		d = setTimeout(()=>d=0, 500);
		_moment = new Date();
	}
	return _moment;
}

/**
 * @returns {number}
 */
export function momentNowUnix() {
	return momentNow().getTime() / 1000;
}

/**
 * @param {Object} m
 * @returns {string}
 */
function formatCustomShortDate(m) {
	const now = momentNow();
	if (m && now) {
		switch (true) {
			case 4 >= (now.getTime() - m.getTime()) / 3600000:
				return m.fromNow();
			case now.format('L') === m.format('L'):
				return i18n('MESSAGE_LIST/TODAY_AT', {
					TIME: m.format('LT')
				});
			case new Date(now.getTime() - 86400000) // subtract 1 day
				.format('L') === m.format('L'):
				return i18n('MESSAGE_LIST/YESTERDAY_AT', {
					TIME: m.format('LT')
				});
			case now.getFullYear() === m.getFullYear():
				return m.format('d M.');
			// no default
		}
	}

	return m ? m.format('LL') : '';
}

/**
 * @param {number} timeStampInUTC
 * @param {string} formatStr
 * @returns {string}
 */
export function format(timeStampInUTC, formatStr) {
	let m = null,
		result = '';

	const now = momentNowUnix();

	timeStampInUTC = 0 < timeStampInUTC ? timeStampInUTC : 0 === timeStampInUTC ? now : 0;
	timeStampInUTC = now < timeStampInUTC ? now : timeStampInUTC;

	m = 0 < timeStampInUTC ? new Date(timeStampInUTC * 1000) : null;

	if (m && 1970 === m.getFullYear()) {
		m = null;
	}

	if (m) {
		switch (formatStr) {
			case 'FROMNOW':
				result = m.fromNow();
				break;
			case 'SHORT':
				result = formatCustomShortDate(m);
				break;
			case 'FULL':
				result = m.format('LLL');
				break;
			default:
				result = m.format(formatStr);
				break;
		}
	}

	return result;
}

/**
 * @param {Object} element
 * @returns {void}
 */
export function momentToNode(element) {
	let key = '',
		time = 0;
	const $el = jQuery(element);

	time = $el.data('moment-time');
	if (time) {
		key = $el.data('moment-format');
		if (key) {
			$el.text(format(time, key));
		}

		key = $el.data('moment-format-title');
		if (key) {
			$el.attr('title', format(time, key));
		}
	}
}

/**
 * @returns {void}
 */
export function reload() {
	setTimeout(() =>
		jQuery('.moment', document).each((index, item) => {
			momentToNode(item);
		})
	, 1);
}
