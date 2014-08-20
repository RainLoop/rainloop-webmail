/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		window = require('./External/window.js'),
		JSON = require('./External/JSON.js'),
		Consts = require('./Common/Consts.js'),
		Utils = require('./Common/Utils.js')
	;

	/**
	 * @constructor
	 */
	function LocalStorageDriver()
	{
	}

	LocalStorageDriver.supported = function ()
	{
		return !!window.localStorage;
	};

	/**
	 * @param {string} sKey
	 * @param {*} mData
	 * @returns {boolean}
	 */
	LocalStorageDriver.prototype.set = function (sKey, mData)
	{
		var
			mCookieValue = window.localStorage[Consts.Values.ClientSideCookieIndexName] || null,
			bResult = false,
			mResult = null
		;

		try
		{
			mResult = null === mCookieValue ? null : JSON.parse(mCookieValue);
			if (!mResult)
			{
				mResult = {};
			}

			mResult[sKey] = mData;
			window.localStorage[Consts.Values.ClientSideCookieIndexName] = JSON.stringify(mResult);

			bResult = true;
		}
		catch (oException) {}

		return bResult;
	};

	/**
	 * @param {string} sKey
	 * @returns {*}
	 */
	LocalStorageDriver.prototype.get = function (sKey)
	{
		var
			mCokieValue = window.localStorage[Consts.Values.ClientSideCookieIndexName] || null,
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
	
	module.exports = LocalStorageDriver;

}(module));