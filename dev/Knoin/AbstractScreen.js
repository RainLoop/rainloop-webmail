
import _ from '_';
import crossroads from 'crossroads';
import {isArray, isNonEmptyArray, noop} from 'Common/Utils';

class AbstractScreen
{
	constructor(screenName, viewModels = [])
	{
		this.oCross = null;
		this.sScreenName = screenName;
		this.aViewModels = isArray(viewModels) ? viewModels : [];
	}

	/**
	 * @returns {Array}
	 */
	viewModels() {
		return this.aViewModels;
	}

	/**
	 * @returns {string}
	 */
	screenName() {
		return this.sScreenName;
	}

	/**
	 * @returns {?Array)}
	 */
	routes() {
		return null;
	}

	/**
	 * @returns {?Object}
	 */
	__cross() {
		return this.oCross;
	}

	/**
	 * @returns {void}
	 */
	__start() {
		let
			route = null,
			fMatcher = null;
		const routes = this.routes();

		if (isNonEmptyArray(routes))
		{
			fMatcher = _.bind(this.onRoute || noop, this);
			route = crossroads.create();

			_.each(routes, (aItem) => {
				route.addRoute(aItem[0], fMatcher).rules = aItem[1];
			});

			this.oCross = route;
		}
	}
}

export {AbstractScreen, AbstractScreen as default};
