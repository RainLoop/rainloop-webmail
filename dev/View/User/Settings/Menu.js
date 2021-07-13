import { leftPanelDisabled } from 'Common/Globals';
import { settings, mailbox } from 'Common/Links';
import { getFolderInboxName } from 'Common/Cache';

import { AbstractViewLeft } from 'Knoin/AbstractViews';

import { ThemeStore } from 'Stores/Theme';

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
		dom.addEventListener('click', event =>
			ThemeStore.isMobile()
			&& event.target.closestWithin('.b-settins-left nav a', dom)
			&& leftPanelDisabled(true)
		);
	}

	link(route) {
		return settings(route);
	}

	backToMailBoxClick() {
		rl.route.setHash(mailbox(getFolderInboxName()));
	}
}
