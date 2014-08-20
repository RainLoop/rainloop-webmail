/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		$ = require('./External/jquery.js'),
		JSON = require('./External/JSON.js'),
		Consts = require('./Common/Consts.js'),
		Utils = require('./Common/Utils.js')
	;

	/**
	 * @constructor
	 */
	function CookieDriver()
	{

	}

	CookieDriver.supported = function ()
	{
		return true;
	};

	/**
	 * @param {string} sKey
	 * @param {*} mData
	 * @returns {boolean}
	 */
	CookieDriver.prototype.set = function (sKey, mData)
	{
		var
			mCokieValue = $.cookie(Consts.Values.ClientSideCookieIndexName),
			bResult = false,
			mResult = null
		;

		try
		{
			mResult = null === mCokieValue ? null : JSON.parse(mCokieValue);
			if (!mResult)
			{
				mResult = {};
			}

			mResult[sKey] = mData;
			$.cookie(Consts.Values.ClientSideCookieIndexName, JSON.stringify(mResult), {
				'expires': 30
			});

			bResult = true;
		}
		catch (oException) {}

		return bResult;
	};

	/**
	 * @param {string} sKey
	 * @returns {*}
	 */
	CookieDriver.prototype.get = function (sKey)
	{
		var
			mCokieValue = $.cookie(Consts.Values.ClientSideCookieIndexName),
			mResult = null
		;

		try
		{
			mResult = null === mCokieValue ? null : JSON.parse(mCokieValue);
			if (mResult && !Utils.isUnd(mResult[sKey]))
			{
				mResult = mResult[sKey];
			}
			else
			{
				mResult = null;
			}
		}
		catch (oException) {}

		return mResult;
	};

	module.exports = CookieDriver;

}(module));