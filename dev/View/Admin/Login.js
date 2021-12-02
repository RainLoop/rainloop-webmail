import { getNotification } from 'Common/Translator';

import Remote from 'Remote/Admin/Fetch';

import { decorateKoCommands } from 'Knoin/Knoin';
import { AbstractViewLogin } from 'Knoin/AbstractViews';

class LoginAdminView extends AbstractViewLogin {
	constructor() {
		super('AdminLogin');

		this.addObservables({
			login: '',
			password: '',
			totp: '',

			loginError: false,
			passwordError: false,

			submitRequest: false,
			submitError: ''
		});

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

			Remote.request('AdminLogin',
				(iError, oData) => {
					if (iError) {
						this.submitRequest(false);
						this.submitError(getNotification(iError));
					} else {
						rl.setData(oData.Result);
					}
				}, {
					Login: name,
					Password: pass,
					TOTP: this.totp()
				});
		}

		return valid;
	}
}

export { LoginAdminView };
