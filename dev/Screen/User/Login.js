import { AbstractScreen } from 'Knoin/AbstractScreen';

import { LoginUserView } from 'View/User/Login';

class LoginUserScreen extends AbstractScreen {
	constructor() {
		super('login', [LoginUserView]);
	}

	onShow() {
		rl.setWindowTitle();
	}
}

export { LoginUserScreen, LoginUserScreen as default };
