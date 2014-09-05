/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function () {

	'use strict';

	/**
	 * @constructor
	 */
	function LocalStorage()
	{
		var
			NextStorageDriver = require('_').find([
				require('Storage/LocalDriver/LocalStorage'),
				require('Storage/LocalDriver/Cookie')
			], function (NextStorageDriver) {
				return NextStorageDriver && NextStorageDriver.supported();
			})
		;

		this.oDriver = null;

		if (NextStorageDriver)
		{
			this.oDriver = new NextStorageDriver();
		}
	}

	/**
	 * @type {LocalStorageDriver|CookieDriver|null}
	 */
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

}());