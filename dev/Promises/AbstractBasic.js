
(function () {

	'use strict';

	var
		_ = require('_'),
		Q = require('Q'),

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
		var oDeferred = Q.defer();
		oDeferred.resolve(mData);
		return oDeferred.promise;
	};

	AbstractBasicPromises.prototype.fastReject = function (mData)
	{
		var oDeferred = Q.defer();
		oDeferred.reject(mData);
		return oDeferred.promise;
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