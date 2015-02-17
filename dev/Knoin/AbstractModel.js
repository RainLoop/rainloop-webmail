
(function () {

	'use strict';

	var
		_ = require('_'),

		Utils = require('Common/Utils')
	;

	/**
	 * @constructor
	 *
	 * @param {string} sModelName
	 */
	function AbstractModel(sModelName)
	{
		this.sModelName = sModelName || '';
		this.disposables = [];
	}

	/**
	 * @param {Array|Object} mInputValue
	 */
	AbstractModel.prototype.regDisposables = function (mInputValue)
	{
		if (Utils.isArray(mInputValue))
		{
			_.each(mInputValue, function (mValue) {
				this.disposables.push(mValue);
			}, this);
		}
		else if (mInputValue)
		{
			this.disposables.push(mInputValue);
		}

	};

	AbstractModel.prototype.onDestroy = function ()
	{
		Utils.disposeObject(this);
	};

	module.exports = AbstractModel;

}());

