
import {AbstractScreen} from 'Knoin/AbstractScreen';
import App from 'App/User';

class AboutUserScreen extends AbstractScreen
{
	constructor()
	{
		super('about', [
			require('View/User/About')
		]);
	}

	onShow() {
		App.setWindowTitle('RainLoop');
	}
}

export {AboutUserScreen, AboutUserScreen as default};
