import ko from 'ko';

import { StorageResultType, Notification } from 'Common/Enums';
import { trim } from 'Common/Utils';
import { getNotification } from 'Common/Translator';

import Remote from 'Remote/User/Ajax';

import { getApp } from 'Helper/Apps/User';

import { popup, command } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

@popup({
	name: 'View/Popup/Account',
	templateID: 'PopupsAccount'
})
class AccountPopupView extends AbstractViewNext {
	constructor() {
		super();

		this.isNew = ko.observable(true);

		this.email = ko.observable('');
		this.password = ko.observable('');

		this.emailError = ko.observable(false);
		this.passwordError = ko.observable(false);

		this.email.subscribe(() => {
			this.emailError(false);
		});

		this.password.subscribe(() => {
			this.passwordError(false);
		});

		this.submitRequest = ko.observable(false);
		this.submitError = ko.observable('');
		this.submitErrorAdditional = ko.observable('');

		this.emailFocus = ko.observable(false);
	}

	@command((self) => !self.submitRequest())
	addAccountCommand() {
		this.emailError('' === trim(this.email()));
		this.passwordError('' === trim(this.password()));

		if (this.emailError() || this.passwordError()) {
			return false;
		}

		this.submitRequest(true);

		Remote.accountSetup(
			(result, data) => {
				this.submitRequest(false);
				if (StorageResultType.Success === result && data) {
					if (data.Result) {
						getApp().accountsAndIdentities();
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
