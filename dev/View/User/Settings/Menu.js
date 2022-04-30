import { settings } from 'Common/Links';

import { AbstractViewLeft } from 'Knoin/AbstractViews';

export class SettingsMenuUserView extends AbstractViewLeft {
	/**
	 * @param {Object} screen
	 */
	constructor(screen) {
		super();

		this.menu = screen.menu;
	}

	link(route) {
		return settings(route);
	}
}
