
(function () {

	'use strict';

	var
		$ = require('$'),
		JSON = require('JSON'),

		Consts = require('Common/Consts'),
		Utils = require('Common/Utils')
	;

	/**
	 * @constructor
	 */
	function CookieLocalDriver()
	{
	}

	/**
	 * @static
	 * @return {boolean}
	 */
	CookieLocalDriver.supported = function ()
	{
		return !!(window.navigator && window.navigator.cookieEnabled);
	};

	/**
	 * @param {string} sKey
	 * @param {*} mData
	 * @return {boolean}
	 */
	CookieLocalDriver.prototype.set = function (sKey, mData)
	{
		var
			mStorageValue = $.cookie(Consts.Values.ClientSideStorageIndexName),
			bResult = false,
			mResult = null
		;

		try
		{
			mResult = null === mStorageValue ? null : JSON.parse(mStorageValue);
		}
		catch (oException) {}

		if (!mResult)
		{
			mResult = {};
		}

		mResult[sKey] = mData;

		try
		{
			$.cookie(Consts.Values.ClientSideStorageIndexName, JSON.stringify(mResult), {
				'expires': 30
			});

			bResult = true;
		}
		catch (oException) {}

		return bResult;
	};

	/**
	 * @param {string} sKey
	 * @return {*}
	 */
	CookieLocalDriver.prototype.get = function (sKey)
	{
		var
			mStorageValue = $.cookie(Consts.Values.ClientSideStorageIndexName),
			mResult = null
		;

		try
		{
			mResult = null === mStorageValue ? null : JSON.parse(mStorageValue);
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

	module.exports = CookieLocalDriver;

}());