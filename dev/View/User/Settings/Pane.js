import { leftPanelDisabled, toggleLeftPanel } from 'Common/Globals';

import { MessageUserStore } from 'Stores/User/Message';
import { ThemeStore } from 'Stores/Theme';

import { AbstractViewRight } from 'Knoin/AbstractViews';

export class SettingsPaneUserView extends AbstractViewRight {
	constructor() {
		super();
	}

	onShow() {
		MessageUserStore.message(null);
	}

	onBuild(dom) {
		dom.addEventListener('click', () => {
			if (event.target.closestWithin('.toggleLeft', dom)) {
				toggleLeftPanel();
			} else {
				ThemeStore.isMobile() && leftPanelDisabled(true);
			}
		});
	}
}
