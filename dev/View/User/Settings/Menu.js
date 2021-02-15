import { KeyState } from 'Common/Enums';
import { leftPanelDisabled, isMobile } from 'Common/Globals';
import { settings, mailbox } from 'Common/Links';
import { getFolderInboxName } from 'Common/Cache';

import { settingsMenuKeysHandler } from 'Knoin/Knoin';
import { AbstractViewLeft } from 'Knoin/AbstractViews';

export class MenuSettingsUserView extends AbstractViewLeft {
	/**
	 * @param {Object} screen
	 */
	constructor(screen) {
		super('User/Settings/Menu', 'SettingsMenu');

		this.leftPanelDisabled = leftPanelDisabled;

		this.menu = screen.menu;
	}

	onBuild(dom) {
		if (isMobile()) {
			dom.addEventListener('click', event =>
				event.target.closestWithin('.b-settings-menu .e-item.selectable', dom) && leftPanelDisabled(true)
			);
		}

		shortcuts.add('arrowup,arrowdown', '', KeyState.Settings,
			settingsMenuKeysHandler(dom.querySelectorAll('.b-settings-menu .e-item')));
	}

	link(route) {
		return settings(route);
	}

	backToMailBoxClick() {
		rl.route.setHash(mailbox(getFolderInboxName()));
	}
}
