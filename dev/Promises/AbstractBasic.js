
(function () {

	'use strict';

	var
		_ = require('_'),
		Promise = require('Promise'),

		Utils = require('Common/Utils')
	;

	/**
	* @constructor
	*/
	function AbstractBasicPromises()
	{
		this.oPromisesStack = {};
	}

	AbstractBasicPromises.prototype.func = function (fFunc)
	{
		fFunc();
		return this;
	};

	AbstractBasicPromises.prototype.fastResolve = function (mData)
	{
		return Promise.resolve(mData);
	};

	AbstractBasicPromises.prototype.fastReject = function (mData)
	{
		return Promise.reject(mData);
	};

	AbstractBasicPromises.prototype.setTrigger = function (mTrigger, bValue)
	{
		if (mTrigger)
		{
			_.each(Utils.isArray(mTrigger) ? mTrigger : [mTrigger], function (fTrigger) {
				if (fTrigger)
				{
					fTrigger(!!bValue);
				}
			});
		}
	};

	module.exports = AbstractBasicPromises;

}());
