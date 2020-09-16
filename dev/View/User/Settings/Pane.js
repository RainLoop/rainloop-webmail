import { inbox } from 'Common/Links';
import { getFolderInboxName } from 'Common/Cache';
import { leftPanelDisabled } from 'Common/Globals';

import MessageStore from 'Stores/User/Message';

import { view, ViewType } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

@view({
	name: 'View/User/Settings/Pane',
	type: ViewType.Right,
	templateID: 'SettingsPane'
})
class PaneSettingsUserView extends AbstractViewNext {
	constructor() {
		super();

		this.mobile = rl.settings.app('mobile');

		this.leftPanelDisabled = leftPanelDisabled;
	}

	onShow() {
		MessageStore.message(null);
	}

	hideLeft(item, event) {
		event.preventDefault();
		event.stopPropagation();

		leftPanelDisabled(true);
	}

	showLeft(item, event) {
		event.preventDefault();
		event.stopPropagation();

		leftPanelDisabled(false);
	}

	onBuild(dom) {
		this.mobile && dom.addEventListener('click', () => leftPanelDisabled(true));
	}

	backToMailBoxClick() {
		rl.route.setHash(inbox(getFolderInboxName()));
	}
}

export { PaneSettingsUserView, PaneSettingsUserView as default };
