import { Notification } from 'Common/Enums';
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
			submitErrorAdditional: '',

			emailFocus: false
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
				if (!iError && data) {
					if (data.Result) {
						rl.app.accountsAndIdentities();
						this.cancelCommand();
					} else {
						this.submitError(
							data.ErrorCode ? getNotification(data.ErrorCode) : getNotification(Notification.UnknownError)
						);

						if (data.ErrorMessageAdditional) {
							this.submitErrorAdditional(data.ErrorMessageAdditional);
						}
					}
				} else {
					this.submitError(getNotification(Notification.UnknownError));
					this.submitErrorAdditional('');
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

	onShowWithDelay() {
		this.emailFocus(true);
	}
}

export { AccountPopupView, AccountPopupView as default };
