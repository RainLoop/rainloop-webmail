import { AbstractViewLeft } from 'Knoin/AbstractViews';

class MenuSettingsAdminView extends AbstractViewLeft {
	/**
	 * @param {?} screen
	 */
	constructor(screen) {
		super('Admin/Settings/Menu', 'AdminMenu');

		this.menu = screen.menu;
	}

	link(route) {
		return '#/' + route;
	}
}

export { MenuSettingsAdminView };
