
(function () {

	'use strict';

	var
		window = require('window'),
		JSON = require('JSON'),

		Consts = require('Common/Consts'),
		Utils = require('Common/Utils')
	;

	/**
	 * @constructor
	 */
	function LocalStorageDriver()
	{
	}

	/**
	 * @static
	 * @return {boolean}
	 */
	LocalStorageDriver.supported = function ()
	{
		return !!window.localStorage;
	};

	/**
	 * @param {string} sKey
	 * @param {*} mData
	 * @return {boolean}
	 */
	LocalStorageDriver.prototype.set = function (sKey, mData)
	{
		var
			mStorageValue = window.localStorage[Consts.Values.ClientSideStorageIndexName] || null,
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
			window.localStorage[Consts.Values.ClientSideStorageIndexName] = JSON.stringify(mResult);

			bResult = true;
		}
		catch (e) {}

		return bResult;
	};

	/**
	 * @param {string} sKey
	 * @return {*}
	 */
	LocalStorageDriver.prototype.get = function (sKey)
	{
		var
			mStorageValue = window.localStorage[Consts.Values.ClientSideStorageIndexName] || null,
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

	module.exports = LocalStorageDriver;

}());