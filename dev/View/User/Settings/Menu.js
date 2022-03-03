import { settings, mailbox } from 'Common/Links';
import { getFolderInboxName } from 'Common/Cache';

import { AbstractViewLeft } from 'Knoin/AbstractViews';

export class MenuSettingsUserView extends AbstractViewLeft {
	/**
	 * @param {Object} screen
	 */
	constructor(screen) {
		super('SettingsMenu');

		this.menu = screen.menu;
	}

	link(route) {
		return settings(route);
	}

	backToMailBoxClick() {
		hasher.setHash(mailbox(getFolderInboxName()));
	}
}
