import { AbstractScreen } from 'Knoin/AbstractScreen';

import { LoginUserView } from 'View/User/Login';

import { getApp } from 'Helper/Apps/User';

class LoginUserScreen extends AbstractScreen {
	constructor() {
		super('login', [LoginUserView]);
	}

	onShow() {
		getApp().setWindowTitle('');
	}
}

export { LoginUserScreen, LoginUserScreen as default };
