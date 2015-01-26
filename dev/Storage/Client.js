
(function () {

	'use strict';

	/**
	 * @constructor
	 */
	function ClientStorage()
	{
		var
			NextStorageDriver = require('_').find([
				require('Common/ClientStorageDriver/LocalStorage'),
				require('Common/ClientStorageDriver/Cookie')
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
	ClientStorage.prototype.oDriver = null;

	/**
	 * @param {number} iKey
	 * @param {*} mData
	 * @return {boolean}
	 */
	ClientStorage.prototype.set = function (iKey, mData)
	{
		return this.oDriver ? this.oDriver.set('p' + iKey, mData) : false;
	};

	/**
	 * @param {number} iKey
	 * @return {*}
	 */
	ClientStorage.prototype.get = function (iKey)
	{
		return this.oDriver ? this.oDriver.get('p' + iKey) : null;
	};

	module.exports = new ClientStorage();

}());