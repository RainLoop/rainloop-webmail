import { getNotification } from 'Common/Translator';

import Remote from 'Remote/User/Fetch';

import { decorateKoCommands } from 'Knoin/Knoin';
import { AbstractViewPopup } from 'Knoin/AbstractViews';

class AccountPopupView extends AbstractViewPopup {
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

		decorateKoCommands(this, {
			addAccountCommand: self => !self.submitRequest()
		});
	}

	addAccountCommand() {
		this.emailError(!this.email().trim());
		this.passwordError(!this.password().trim());

		if (this.emailError() || this.passwordError()) {
			return false;
		}

		this.submitRequest(true);

		Remote.accountSetup(
			(iError, data) => {
				this.submitRequest(false);
				if (iError) {
					this.submitError(getNotification(iError));
					this.submitErrorAdditional((data && data.ErrorMessageAdditional) || '');
				} else {
					rl.app.accountsAndIdentities();
					this.cancelCommand();
				}
			},
			this.email(),
			this.password(),
			this.isNew()
		);

		return true;
	}

	clearPopup() {
		this.isNew(true);

		this.email('');
		this.password('');

		this.emailError(false);
		this.passwordError(false);

		this.submitRequest(false);
		this.submitError('');
		this.submitErrorAdditional('');
	}

	onShow(account) {
		this.clearPopup();
		if (account && account.canBeEdit()) {
			this.isNew(false);
			this.email(account.email);
		}
	}
}

export { AccountPopupView, AccountPopupView as default };
