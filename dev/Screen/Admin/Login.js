import { AbstractScreen } from 'Knoin/AbstractScreen';

import { LoginAdminView } from 'View/Admin/Login';

export class LoginAdminScreen extends AbstractScreen {
	constructor() {
		super('login', [LoginAdminView]);
	}

	onShow() {
		rl.setWindowTitle();
	}
}
