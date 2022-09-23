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

			submitRequest: false,
			submitError: '',
			submitErrorAdditional: ''
		});
	}

	submitForm(form) {
		if (!this.submitRequest() && form.reportValidity()) {
			const data = new FormData(form);
			data.set('New', this.isNew() ? 1 : 0);
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
				}, data
			);
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

		this.submitRequest(false);
		this.submitError('');
		this.submitErrorAdditional('');
	}
}
