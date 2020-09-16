import { KeyState } from 'Common/Enums';
import { leftPanelDisabled } from 'Common/Globals';
import { settings, inbox } from 'Common/Links';
import { getFolderInboxName } from 'Common/Cache';

import { view, ViewType, settingsMenuKeysHandler } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

@view({
	name: 'View/User/Settings/Menu',
	type: ViewType.Left,
	templateID: 'SettingsMenu'
})
class MenuSettingsUserView extends AbstractViewNext {
	/**
	 * @param {Object} screen
	 */
	constructor(screen) {
		super();

		this.leftPanelDisabled = leftPanelDisabled;

		this.mobile = rl.settings.app('mobile');

		this.menu = screen.menu;
	}

	onBuild(dom) {
		if (this.mobile) {
			dom.addEventListener('click', event =>
				event.target.closestWithin('.b-settings-menu .e-item.selectable', dom) && leftPanelDisabled(true)
			);
		}

		key('up, down', KeyState.Settings, settingsMenuKeysHandler(dom.querySelectorAll('.b-settings-menu .e-item')));
	}

	link(route) {
		return settings(route);
	}

	backToMailBoxClick() {
		rl.route.setHash(inbox(getFolderInboxName()));
	}
}

export { MenuSettingsUserView, MenuSettingsUserView as default };
