
import {AbstractScreen} from 'Knoin/AbstractScreen';
import App from 'App/Admin';

class LoginAdminScreen extends AbstractScreen
{
	constructor()
	{
		super('login', [
			require('View/Admin/Login')
		]);
	}

	onShow() {
		App.setWindowTitle('');
	}
}

export {LoginAdminScreen, LoginAdminScreen as default};
