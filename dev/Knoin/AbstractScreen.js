export class AbstractScreen {
	oCross = null;
	sScreenName;
	aViewModels;

	constructor(screenName, viewModels = []) {
		this.sScreenName = screenName;
		this.aViewModels = Array.isArray(viewModels) ? viewModels : [];
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

		if (Array.isArray(routes) && routes.length) {
			fMatcher = (this.onRoute || (()=>{})).bind(this);
			route = new Crossroads();

			routes.forEach((item) => {
				if (item && route) {
					route.addRoute(item[0], fMatcher).rules = item[1];
				}
			});

			this.oCross = route;
		}
	}
}
