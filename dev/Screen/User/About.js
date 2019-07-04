import { AbstractScreen } from 'Knoin/AbstractScreen';

import { AboutUserView } from 'View/User/About';

import { getApp } from 'Helper/Apps/User';

class AboutUserScreen extends AbstractScreen {
	constructor() {
		super('about', [AboutUserView]);
	}

	onShow() {
		getApp().setWindowTitle('RainLoop');
	}
}

export { AboutUserScreen, AboutUserScreen as default };
