import { getNotification } from 'Common/Translator';

import Remote from 'Remote/User/Fetch';

import { AbstractViewPopup } from 'Knoin/AbstractViews';

export class AccountPopupView extends AbstractViewPopup {
	constructor() {
		super('Account');

		this.addObservables({
			isNew: true,

			email: '',
			password: '',

			emailError: false,
			passwordError: false,

			submitRequest: false,
			submitError: '',
			submitErrorAdditional: ''
		});

		this.email.subscribe(() => this.emailError(false));

		this.password.subscribe(() => this.passwordError(false));
	}

	submitForm() {
		if (!this.submitRequest()) {
			const email = this.email().trim(), pass = this.password();
			this.emailError(!email);
			this.passwordError(!pass);
			if (!this.emailError() && pass) {
				this.submitRequest(true);
				Remote.request('AccountSetup', (iError, data) => {
						this.submitRequest(false);
						if (iError) {
							this.submitError(getNotification(iError));
							this.submitErrorAdditional(data?.ErrorMessageAdditional);
						} else {
							rl.app.accountsAndIdentities();
							this.close();
						}
					}, {
						Email: email,
						Password: pass,
						New: this.isNew() ? 1 : 0
					}
				);
			}
		}
	}

	onShow(account) {
		if (account?.isAdditional()) {
			this.isNew(false);
			this.email(account.email);
		} else {
			this.isNew(true);
			this.email('');
		}
		this.password('');

		this.emailError(false);
		this.passwordError(false);

		this.submitRequest(false);
		this.submitError('');
		this.submitErrorAdditional('');
	}
}
