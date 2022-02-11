import { fireEvent } from 'Common/Globals';
import { getNotification } from 'Common/Translator';

import Remote from 'Remote/Admin/Fetch';

import { decorateKoCommands } from 'Knoin/Knoin';
import { AbstractViewLogin } from 'Knoin/AbstractViews';

export class LoginAdminView extends AbstractViewLogin {
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
		let form = event.target.form,
			data = new FormData(form),
			valid = form.reportValidity() && fireEvent('sm-admin-login', data);

		this.loginError(!this.login());
		this.passwordError(!this.password());
		this.formError(!valid);

		if (valid) {
			this.submitRequest(true);

			Remote.request('AdminLogin',
				(iError, oData) => {
					fireEvent('sm-admin-login-response', {
						error: iError,
						data: oData
					});
					if (iError) {
						this.submitRequest(false);
						this.submitError(getNotification(iError));
					} else {
						rl.setData(oData.Result);
					}
				},
				data
			);
		}

		return valid;
	}
}
