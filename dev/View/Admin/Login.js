import ko from 'ko';

import { Settings } from 'Common/Globals';
import { getNotification } from 'Common/Translator';

import Remote from 'Remote/Admin/Fetch';

import { decorateKoCommands } from 'Knoin/Knoin';
import { AbstractViewCenter } from 'Knoin/AbstractViews';

class LoginAdminView extends AbstractViewCenter {
	constructor() {
		super('AdminLogin');

		this.hideSubmitButton = Settings.app('hideSubmitButton');

		this.addObservables({
			login: '',
			password: '',
			totp: '',

			loginError: false,
			passwordError: false,

			submitRequest: false,
			submitError: ''
		});

		this.formError = ko.observable(false).extend({ falseTimeout: 500 });

		this.addSubscribables({
			login: () => this.loginError(false),
			password: () => this.passwordError(false)
		});

		decorateKoCommands(this, {
			submitCommand: self => !self.submitRequest()
		});
	}

	submitCommand(self, event) {
		const valid = event.target.form.reportValidity(),
			name = this.login().trim(),
			pass = this.password();

		this.loginError(!name);
		this.passwordError(!pass);
		this.formError(!valid);

		if (valid) {
			this.submitRequest(true);

			Remote.adminLogin(
				iError => {
					if (iError) {
						this.submitRequest(false);
						this.submitError(getNotification(iError));
					} else {
						rl.route.reload();
					}
				},
				name,
				pass,
				this.totp()
			);
		}

		return valid;
	}

	onShow() {
		rl.route.off();
	}

	submitForm() {
//		return false;
	}
}

export { LoginAdminView };
