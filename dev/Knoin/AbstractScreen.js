import { isArray, arrayLength } from 'Common/Utils';

export class AbstractScreen {
	constructor(screenName, viewModels = []) {
		this.__cross = null;
		this.screenName = screenName;
		this.viewModels = isArray(viewModels) ? viewModels : [];
	}

	/**
	 * @returns {?Array)}
	 */
	routes() {
		return null;
	}

/*
	onBuild(viewModelDom) {}
	onShow() {}
	onHide() {}
	__started
	__builded
*/

	/**
	 * @returns {void}
	 */
	onStart() {
		const routes = this.routes();
		if (arrayLength(routes)) {
			let route = new Crossroads(),
				fMatcher = (this.onRoute || (()=>0)).bind(this);

			routes.forEach(item => item && (route.addRoute(item[0], fMatcher).rules = item[1]));

			this.__cross = route;
		}
	}
}
