
(function () {

	'use strict';

	var
		window = require('window'),
		$ = require('$'),
		_ = require('_'),
		moment = require('moment'),

		Translator = require('Common/Translator')
	;

	/**
	 * @constructor
	 */
	function Momentor()
	{
		this.format = _.bind(this.format, this);

		this.updateMomentNow = _.debounce(_.bind(function () {
			this._moment = moment();
		}, this), 500, true);

		this.updateMomentNowUnix = _.debounce(_.bind(function () {
			this._momentNow = moment().unix();
		}, this), 500, true);
	}

	Momentor.prototype._moment = null;
	Momentor.prototype._momentNow = 0;

	Momentor.prototype.momentNow = function ()
	{
		this.updateMomentNow();
		return this._moment || moment();
	};

	Momentor.prototype.momentNowUnix = function ()
	{
		this.updateMomentNowUnix();
		return this._momentNow || 0;
	};

	Momentor.prototype.searchSubtractFormatDateHelper = function (iDate)
	{
		var oM = this.momentNow();
		return oM.clone().subtract('days', iDate).format('YYYY.MM.DD');
	};

	/**
	 * @param {Object} oMoment
	 * @return {string}
	 */
	Momentor.prototype.formatCustomShortDate = function (oMoment)
	{
		var
			sResult = '',
			oMomentNow = this.momentNow()
		;

		if (oMoment && oMomentNow)
		{
			if (4 >= oMomentNow.diff(oMoment, 'hours'))
			{
				sResult = oMoment.fromNow();
			}
			else if (oMomentNow.format('L') === oMoment.format('L'))
			{
				sResult = Translator.i18n('MESSAGE_LIST/TODAY_AT', {
					'TIME': oMoment.format('LT')
				});
			}
			else if (oMomentNow.clone().subtract('days', 1).format('L') === oMoment.format('L'))
			{
				sResult = Translator.i18n('MESSAGE_LIST/YESTERDAY_AT', {
					'TIME': oMoment.format('LT')
				});
			}
			else if (oMomentNow.year() === oMoment.year())
			{
				sResult = oMoment.format('D MMM.');
			}
			else
			{
				sResult = oMoment.format('LL');
			}
		}

		return sResult;
	};

	/**
	 * @param {number} iTimeStampInUTC
	 * @param {string} sFormat
	 * @return {string}
	 */
	Momentor.prototype.format = function (iTimeStampInUTC, sFormat)
	{
		var
			oM = null,
			sResult = '',
			iNow = this.momentNowUnix()
		;

		iTimeStampInUTC = 0 < iTimeStampInUTC ? iTimeStampInUTC : (0 === iTimeStampInUTC ? iNow : 0);
		iTimeStampInUTC = iNow < iTimeStampInUTC ? iNow : iTimeStampInUTC;

		oM = 0 < iTimeStampInUTC ? moment.unix(iTimeStampInUTC) : null;

		if (oM && 1970 === oM.year())
		{
			oM = null;
		}

		if (oM)
		{
			switch (sFormat)
			{
				case 'FROMNOW':
					sResult = oM.fromNow();
					break;
				case 'SHORT':
					sResult = this.formatCustomShortDate(oM);
					break;
				case 'FULL':
					sResult = oM.format('LLL');
					break;
				default:
					sResult = oM.format(sFormat);
					break;
			}
		}

		return sResult;
	};

	/**
	 * @param {Object} oElement
	 */
	Momentor.prototype.momentToNode = function (oElement)
	{
		var
			sKey = '',
			iTime = 0,
			$oEl = $(oElement)
		;

		iTime = $oEl.data('moment-time');
		if (iTime)
		{
			sKey = $oEl.data('moment-format');

			if (sKey)
			{
				$oEl.text(this.format(iTime, sKey));
			}

			sKey = $oEl.data('moment-format-title');
			if (sKey)
			{
				$oEl.attr('title', this.format(iTime, sKey));
			}
		}
	};

	/**
	 * @param {Object} oElements
	 */
	Momentor.prototype.momentToNodes = function (oElements)
	{
		var self = this;
		_.defer(function () {
			$('.moment', oElements).each(function () {
				self.momentToNode(this);
			});
		});
	};

	Momentor.prototype.reload = function ()
	{
		this.momentToNodes(window.document);
	};

	module.exports = new Momentor();

}());
