/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		_ = require('./External/underscore.js'),
		AbstractCacheStorage = require('./Storages/AbstractCacheStorage.js')
	;

	/**
	 * @constructor
	 * @extends AbstractCacheStorage
	 */
	function AdminCacheStorage()
	{
		AbstractCacheStorage.call(this);
	}

	_.extend(AdminCacheStorage.prototype, AbstractCacheStorage.prototype);

	module.exports = AdminCacheStorage;

}(module));