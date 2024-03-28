import { AbstractScreen } from 'Knoin/AbstractScreen';

import { AdminLoginView } from 'View/Admin/Login';

export class LoginAdminScreen extends AbstractScreen {
	constructor() {
		super('login', [AdminLoginView]);
	}

	onShow() {
		rl.setTitle();
	}
}
