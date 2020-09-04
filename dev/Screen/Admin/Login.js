import { AbstractScreen } from 'Knoin/AbstractScreen';

import { LoginAdminView } from 'View/Admin/Login';

class LoginAdminScreen extends AbstractScreen {
	constructor() {
		super('login', [LoginAdminView]);
	}

	onShow() {
		rl.setWindowTitle();
	}
}

export { LoginAdminScreen, LoginAdminScreen as default };
