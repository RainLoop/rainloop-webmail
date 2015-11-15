
import {window, $, _, moment} from 'common';
import Translator from 'Common/Translator';

class Momentor
{
	constructor()
	{
		this._moment = null;
		this._momentNow = 0;

		this.updateMomentNow = _.debounce(() => {
			this._moment = moment();
		}, 500, true);

		this.updateMomentNowUnix = _.debounce(() => {
			this._momentNow = moment().unix();
		}, 500, true);

		this.format = _.bind(this.format, this);
	}

	momentNow() {
		this.updateMomentNow();
		return this._moment || moment();
	}

	momentNowUnix() {
		this.updateMomentNowUnix();
		return this._momentNow || 0;
	}

	/**
	 * @param {number} date
	 * @return {string}
	 */
	searchSubtractFormatDateHelper(date) {
		return this.momentNow().clone().subtract('days', date).format('YYYY.MM.DD');
	}

	/**
	 * @param {Object} m
	 * @return {string}
	 */
	formatCustomShortDate(m) {

		const now = this.momentNow();
		if (m && now)
		{
			switch(true)
			{
				case 4 >= now.diff(m, 'hours'):
					return m.fromNow();
				case now.format('L') === m.format('L'):
					return Translator.i18n('MESSAGE_LIST/TODAY_AT', {
						'TIME': m.format('LT')
					});
				case now.clone().subtract('days', 1).format('L') === m.format('L'):
					return Translator.i18n('MESSAGE_LIST/YESTERDAY_AT', {
						'TIME': m.format('LT')
					});
				case now.year() === m.year():
					return m.format('D MMM.');
			}
		}

		return m ? m.format('LL') : '';
	}

	/**
	 * @param {number} timeStampInUTC
	 * @param {string} format
	 * @return {string}
	 */
	format(timeStampInUTC, format) {

		let
			m = null,
			result = ''
		;

		const now = this.momentNowUnix();

		timeStampInUTC = 0 < timeStampInUTC ? timeStampInUTC : (0 === timeStampInUTC ? now : 0);
		timeStampInUTC = now < timeStampInUTC ? now : timeStampInUTC;

		m = 0 < timeStampInUTC ? moment.unix(timeStampInUTC) : null;

		if (m && 1970 === m.year())
		{
			m = null;
		}

		if (m)
		{
			switch (format)
			{
				case 'FROMNOW':
					result = m.fromNow();
					break;
				case 'SHORT':
					result = this.formatCustomShortDate(m);
					break;
				case 'FULL':
					result = m.format('LLL');
					break;
				default:
					result = m.format(format);
					break;
			}
		}

		return result;
	}

	/**
	 * @param {Object} element
	 */
	momentToNode(element) {

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
				$el.text(this.format(time, key));
			}

			key = $el.data('moment-format-title');
			if (key)
			{
				$el.attr('title', this.format(time, key));
			}
		}
	}

	/**
	 * @param {Object} elements
	 */
	momentToNodes(elements) {
		_.defer(() => {
			$('.moment', elements).each((index, item) => {
				this.momentToNode(item);
			});
		});
	}

	reload() {
		this.momentToNodes(window.document);
	}
}

module.exports = new Momentor();
