import $ from '$';
import key from 'key';

import { KeyState } from 'Common/Enums';
import { leftPanelDisabled } from 'Common/Globals';
import { settings, inbox } from 'Common/Links';
import { getFolderInboxName } from 'Common/Cache';

import * as Settings from 'Storage/Settings';

import { view, ViewType, setHash, settingsMenuKeysHandler } from 'Knoin/Knoin';
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

		this.mobile = Settings.appSettingsGet('mobile');

		this.menu = screen.menu;
	}

	onBuild(dom) {
		if (this.mobile) {
			dom.on('click', '.b-settings-menu .e-item.selectable', () => {
				leftPanelDisabled(true);
			});
		}

		key('up, down', KeyState.Settings, settingsMenuKeysHandler($('.b-settings-menu .e-item', dom)));
	}

	link(route) {
		return settings(route);
	}

	backToMailBoxClick() {
		setHash(inbox(getFolderInboxName()));
	}
}

export { MenuSettingsUserView, MenuSettingsUserView as default };
