import _ from '_';
import crossroads from 'crossroads';
import { isArray, isNonEmptyArray, noop } from 'Common/Utils';

export class AbstractScreen {
	oCross = null;
	sScreenName;
	aViewModels;

	constructor(screenName, viewModels = []) {
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
		let route = null,
			fMatcher = null;
		const routes = this.routes();

		if (isNonEmptyArray(routes)) {
			fMatcher = _.bind(this.onRoute || noop, this);
			route = crossroads.create();

			routes.forEach((item) => {
				if (item && route) {
					route.addRoute(item[0], fMatcher).rules = item[1];
				}
			});

			this.oCross = route;
		}
	}
}
