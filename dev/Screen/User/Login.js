import { AbstractScreen } from 'Knoin/AbstractScreen';

import { LoginUserView } from 'View/User/Login';

export class LoginUserScreen extends AbstractScreen {
	constructor() {
		super('login', [LoginUserView]);
	}

	onShow() {
		rl.setTitle();
	}
}
