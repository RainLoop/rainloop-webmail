/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		_ = require('_'),

		CookieDriver = require('./LocalStorages/CookieDriver.js'),
		LocalStorageDriver = require('./LocalStorages/LocalStorageDriver.js')
	;

	/**
	 * @constructor
	 */
	function LocalStorage()
	{
		var
			NextStorageDriver = _.find([LocalStorageDriver, CookieDriver], function (NextStorageDriver) {
				return NextStorageDriver.supported();
			})
		;

		this.oDriver = null;

		if (NextStorageDriver)
		{
			NextStorageDriver = /** @type {?Function} */ NextStorageDriver;
			this.oDriver = new NextStorageDriver();
		}
	}

	LocalStorage.prototype.oDriver = null;

	/**
	 * @param {number} iKey
	 * @param {*} mData
	 * @return {boolean}
	 */
	LocalStorage.prototype.set = function (iKey, mData)
	{
		return this.oDriver ? this.oDriver.set('p' + iKey, mData) : false;
	};

	/**
	 * @param {number} iKey
	 * @return {*}
	 */
	LocalStorage.prototype.get = function (iKey)
	{
		return this.oDriver ? this.oDriver.get('p' + iKey) : null;
	};

	module.exports = new LocalStorage();

}(module, require));