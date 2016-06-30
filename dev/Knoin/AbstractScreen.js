
var
	_ = require('_'),
	crossroads = require('crossroads'),

	Utils = require('Common/Utils');

/**
 * @param {string} sScreenName
 * @param {?=} aViewModels = []
 * @constructor
 */
function AbstractScreen(sScreenName, aViewModels)
{
	this.sScreenName = sScreenName;
	this.aViewModels = Utils.isArray(aViewModels) ? aViewModels : [];
}

/**
 * @type {Array}
 */
AbstractScreen.prototype.oCross = null;

/**
 * @type {string}
 */
AbstractScreen.prototype.sScreenName = '';

/**
 * @type {Array}
 */
AbstractScreen.prototype.aViewModels = [];

/**
 * @returns {Array}
 */
AbstractScreen.prototype.viewModels = function()
{
	return this.aViewModels;
};

/**
 * @returns {string}
 */
AbstractScreen.prototype.screenName = function()
{
	return this.sScreenName;
};

AbstractScreen.prototype.routes = function()
{
	return null;
};

/**
 * @returns {?Object}
 */
AbstractScreen.prototype.__cross = function()
{
	return this.oCross;
};

AbstractScreen.prototype.__start = function()
{
	var
		aRoutes = this.routes(),
		oRoute = null,
		fMatcher = null;

	if (Utils.isNonEmptyArray(aRoutes))
	{
		fMatcher = _.bind(this.onRoute || Utils.noop, this);
		oRoute = crossroads.create();

		_.each(aRoutes, function(aItem) {
			oRoute.addRoute(aItem[0], fMatcher).rules = aItem[1];
		});

		this.oCross = oRoute;
	}
};

module.exports = AbstractScreen;
