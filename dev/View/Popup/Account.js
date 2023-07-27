import { addObservablesTo } from 'External/ko';
import { getNotification } from 'Common/Translator';

import Remote from 'Remote/User/Fetch';

import { AbstractViewPopup } from 'Knoin/AbstractViews';

export class AccountPopupView extends AbstractViewPopup {
	constructor() {
		super('Account');

		addObservablesTo(this, {
			isNew: true,

			name: '',
			email: '',
			password: '',

			submitRequest: false,
			submitError: '',
			submitErrorAdditional: ''
		});
	}

	hideError() {
		this.submitError('');
	}

	submitForm(form) {
		if (!this.submitRequest() && form.reportValidity()) {
			const data = new FormData(form);
			data.set('new', this.isNew() ? 1 : 0);
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

	onHide() {
		this.password('');
		this.submitRequest(false);
		this.submitError('');
		this.submitErrorAdditional('');
	}

	onShow(account) {
		let edit = account?.isAdditional();
		this.isNew(!edit);
		this.name(edit ? account.name : '');
		this.email(edit ? account.email : '');
	}
}
