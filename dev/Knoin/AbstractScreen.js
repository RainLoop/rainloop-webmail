export class AbstractScreen {
	constructor(screenName, viewModels = []) {
		this.oCross = null;
		this.sScreenName = screenName;
		this.aViewModels = Array.isArray(viewModels) ? viewModels : [];
	}

	/**
	 * @returns {Array}
	 */
	get viewModels() {
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
	get __cross() {
		return this.oCross;
	}

	/**
	 * @returns {void}
	 */
	onStart() {
		if (!this.__started) {
			this.__started = true;
			const routes = this.routes();
			if (Array.isNotEmpty(routes)) {
				let route = new Crossroads(),
					fMatcher = (this.onRoute || (()=>{})).bind(this);

				routes.forEach(item => item && route && (route.addRoute(item[0], fMatcher).rules = item[1]));

				this.oCross = route;
			}
		}
	}
}
