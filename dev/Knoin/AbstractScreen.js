/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @param {string} sScreenName
 * @param {?=} aViewModels = []
 * @constructor
 */
function KnoinAbstractScreen(sScreenName, aViewModels)
{
	this.sScreenName = sScreenName;
	this.aViewModels = Utils.isArray(aViewModels) ? aViewModels : [];
}

/**
 * @type {Array}
 */
KnoinAbstractScreen.prototype.oCross = null;

/**
 * @type {string}
 */
KnoinAbstractScreen.prototype.sScreenName = '';

/**
 * @type {Array}
 */
KnoinAbstractScreen.prototype.aViewModels = [];

/**
 * @return {Array}
 */
KnoinAbstractScreen.prototype.viewModels = function ()
{
	return this.aViewModels;
};

/**
 * @return {string}
 */
KnoinAbstractScreen.prototype.screenName = function ()
{
	return this.sScreenName;
};

KnoinAbstractScreen.prototype.routes = function ()
{
	return null;
};

/**
 * @return {?Object}
 */
KnoinAbstractScreen.prototype.__cross = function ()
{
	return this.oCross;
};

KnoinAbstractScreen.prototype.__start = function ()
{
	var
		aRoutes = this.routes(),
		oRoute = null,
		fMatcher = null
	;

	if (Utils.isNonEmptyArray(aRoutes))
	{
		fMatcher = _.bind(this.onRoute || Utils.emptyFunction, this);
		oRoute = crossroads.create();

		_.each(aRoutes, function (aItem) {
			oRoute.addRoute(aItem[0], fMatcher).rules = aItem[1];
		});

		this.oCross = oRoute;
	}
};
