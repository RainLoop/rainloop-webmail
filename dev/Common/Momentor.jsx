
import {window, $, _, moment} from 'common';
import {i18n} from 'Common/Translator';

let _moment = null;
let _momentNow = 0;

const updateMomentNow = _.debounce(() => {
	_moment = moment();
}, 500, true);

const updateMomentNowUnix = _.debounce(() => {
	_momentNow = moment().unix();
}, 500, true);

export function momentNow()
{
	updateMomentNow();
	return _moment || moment();
}

export function momentNowUnix()
{
	updateMomentNowUnix();
	return _momentNow || 0;
}

/**
 * @param {number} date
 * @return {string}
 */
export function searchSubtractFormatDateHelper(date)
{
	return momentNow().clone().subtract('days', date).format('YYYY.MM.DD');
}

/**
 * @param {Object} m
 * @return {string}
 */
function formatCustomShortDate(m)
{
	const now = momentNow();
	if (m && now)
	{
		switch(true)
		{
			case 4 >= now.diff(m, 'hours'):
				return m.fromNow();
			case now.format('L') === m.format('L'):
				return i18n('MESSAGE_LIST/TODAY_AT', {
					TIME: m.format('LT')
				});
			case now.clone().subtract('days', 1).format('L') === m.format('L'):
				return i18n('MESSAGE_LIST/YESTERDAY_AT', {
					TIME: m.format('LT')
				});
			case now.year() === m.year():
				return m.format('D MMM.');
		}
	}

	return m ? m.format('LL') : '';
}

/**
 * @param {number} timeStampInUTC
 * @param {string} formatStr
 * @return {string}
 */
export function format(timeStampInUTC, formatStr)
{

	let
		m = null,
		result = ''
	;

	const now = momentNowUnix();

	timeStampInUTC = 0 < timeStampInUTC ? timeStampInUTC : (0 === timeStampInUTC ? now : 0);
	timeStampInUTC = now < timeStampInUTC ? now : timeStampInUTC;

	m = 0 < timeStampInUTC ? moment.unix(timeStampInUTC) : null;

	if (m && 1970 === m.year())
	{
		m = null;
	}

	if (m)
	{
		switch (formatStr)
		{
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
 */
export function momentToNode(element)
{
	var
		key = '',
		time = 0,
		$el = $(element)
	;

	time = $el.data('moment-time');
	if (time)
	{
		key = $el.data('moment-format');
		if (key)
		{
			$el.text(format(time, key));
		}

		key = $el.data('moment-format-title');
		if (key)
		{
			$el.attr('title', format(time, key));
		}
	}
}

export function reload()
{
	_.defer(() => {
		$('.moment', window.document).each((index, item) => {
			momentToNode(item);
		});
	});
}
