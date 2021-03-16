import { Scope } from 'Common/Enums';

import { settingsMenuKeysHandler } from 'Knoin/Knoin';
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

	onBuild(dom) {
		shortcuts.add('arrowup,arrowdown', '', Scope.Settings,
			settingsMenuKeysHandler(dom.querySelectorAll('.b-admin-menu .e-item')));
	}
}

export { MenuSettingsAdminView };
