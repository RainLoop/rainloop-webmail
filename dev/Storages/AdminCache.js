/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends AbstractCacheStorage
 */
function AdminCacheStorage()
{
	AbstractCacheStorage.call(this);
}

_.extend(AdminCacheStorage.prototype, AbstractCacheStorage.prototype);
