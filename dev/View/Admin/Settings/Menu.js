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
		shortcuts.add(['arrowup','arrowdown'], '', KeyState.Settings,
			settingsMenuKeysHandler(dom.querySelectorAll('.b-admin-menu .e-item')));
	}
}

export { MenuSettingsAdminView, MenuSettingsAdminView as default };
