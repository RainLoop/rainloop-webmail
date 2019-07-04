import window from 'window';
import _ from '_';
import $ from '$';
import moment from 'moment';
import { i18n } from 'Common/Translator';

let _moment = null;
let _momentNow = 0;

const updateMomentNow = _.debounce(
	() => {
		_moment = moment();
	},
	500,
	true
);

const updateMomentNowUnix = _.debounce(
	() => {
		_momentNow = moment().unix();
	},
	500,
	true
);

/**
 * @returns {moment}
 */
export function momentNow() {
	updateMomentNow();
	return _moment || moment();
}

/**
 * @returns {number}
 */
export function momentNowUnix() {
	updateMomentNowUnix();
	return _momentNow || 0;
}

/**
 * @param {number} date
 * @returns {string}
 */
export function searchSubtractFormatDateHelper(date) {
	return momentNow()
		.clone()
		.subtract(date, 'days')
		.format('YYYY.MM.DD');
}

/**
 * @param {Object} m
 * @returns {string}
 */
function formatCustomShortDate(m) {
	const now = momentNow();
	if (m && now) {
		switch (true) {
			case 4 >= now.diff(m, 'hours'):
				return m.fromNow();
			case now.format('L') === m.format('L'):
				return i18n('MESSAGE_LIST/TODAY_AT', {
					TIME: m.format('LT')
				});
			case now
				.clone()
				.subtract(1, 'days')
				.format('L') === m.format('L'):
				return i18n('MESSAGE_LIST/YESTERDAY_AT', {
					TIME: m.format('LT')
				});
			case now.year() === m.year():
				return m.format('D MMM.');
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

	m = 0 < timeStampInUTC ? moment.unix(timeStampInUTC) : null;

	if (m && 1970 === m.year()) {
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
	const $el = $(element);

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
	_.defer(() => {
		$('.moment', window.document).each((index, item) => {
			momentToNode(item);
		});
	});
}
