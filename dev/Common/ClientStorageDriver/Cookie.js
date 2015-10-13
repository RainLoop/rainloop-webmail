
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
	function CookieDriver()
	{
	}

	/**
	 * @static
	 * @return {boolean}
	 */
	CookieDriver.supported = function ()
	{
		return !!(window.navigator && window.navigator.cookieEnabled);
	};

	/**
	 * @param {string} sKey
	 * @param {*} mData
	 * @return {boolean}
	 */
	CookieDriver.prototype.set = function (sKey, mData)
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
		catch (e) {}

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
		catch (e) {}

		return bResult;
	};

	/**
	 * @param {string} sKey
	 * @return {*}
	 */
	CookieDriver.prototype.get = function (sKey)
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
		catch (e) {}

		return mResult;
	};

	module.exports = CookieDriver;

}());