import { AbstractScreen } from 'Knoin/AbstractScreen';

import { getApp } from 'Helper/Apps/Admin';

import { LoginAdminView } from 'View/Admin/Login';

class LoginAdminScreen extends AbstractScreen {
	constructor() {
		super('login', [LoginAdminView]);
	}

	onShow() {
		getApp().setWindowTitle('');
	}
}

export { LoginAdminScreen, LoginAdminScreen as default };
