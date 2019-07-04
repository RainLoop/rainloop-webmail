import $ from '$';
import key from 'key';

import { leftPanelDisabled } from 'Common/Globals';
import { KeyState } from 'Common/Enums';

import { view, ViewType, settingsMenuKeysHandler } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

@view({
	name: 'View/Admin/Settings/Menu',
	type: ViewType.Left,
	templateID: 'AdminMenu'
})
class MenuSettingsAdminView extends AbstractViewNext {
	/**
	 * @param {?} screen
	 */
	constructor(screen) {
		super();

		this.leftPanelDisabled = leftPanelDisabled;

		this.menu = screen.menu;
	}

	link(route) {
		return '#/' + route;
	}

	onBuild(dom) {
		key('up, down', KeyState.Settings, settingsMenuKeysHandler($('.b-admin-menu .e-item', dom)));
	}
}

export { MenuSettingsAdminView, MenuSettingsAdminView as default };
