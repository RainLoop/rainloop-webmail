
import {AbstractScreen} from 'Knoin/AbstractScreen';
import App from 'App/User';

class LoginUserScreen extends AbstractScreen
{
	constructor() {
		super('login', [
			require('View/User/Login')
		]);
	}

	onShow() {
		App.setWindowTitle('');
	}
}

export {LoginUserScreen, LoginUserScreen as default};
