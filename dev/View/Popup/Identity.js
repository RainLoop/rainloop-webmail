
import { addObservablesTo } from 'External/ko';

import { getNotification } from 'Common/Translator';

import Remote from 'Remote/User/Fetch';

import { AbstractViewPopup } from 'Knoin/AbstractViews';

import { IdentityModel } from 'Model/Identity';

export class IdentityPopupView extends AbstractViewPopup {
	constructor() {
		super('Identity');

		addObservablesTo(this, {
			id: '',
			edit: false,

			email: '',
			emailFocused: false,

			name: '',
			nameFocused: false,

			replyTo: '',
			showReplyTo: false,

			bcc: '',
			showBcc: false,

			signature: '',
			signatureInsertBefore: false,

			submitRequest: false,
			submitError: ''
		});
/*
		this.email.valueHasMutated();
		this.replyTo.valueHasMutated();
		this.bcc.valueHasMutated();
*/
	}

	submitForm(form) {
		if (!this.submitRequest() && form.reportValidity()) {
			this.signature?.__fetchEditorValue?.();
			this.submitRequest(true);
			const data = new FormData(form);
			data.set('Id', this.id());
			data.set('Signature', this.signature());
			Remote.request('IdentityUpdate', iError => {
					this.submitRequest(false);
					if (iError) {
						this.submitError(getNotification(iError));
					} else {
						rl.app.accountsAndIdentities();
						this.close();
					}
				}, data
			);
		}
	}

	/**
	 * @param {?IdentityModel} oIdentity
	 */
	onShow(identity) {
		this.showBcc(false);
		this.showReplyTo(false);

		this.submitRequest(false);
		this.submitError('');

		if (identity) {
			this.edit(true);
		} else {
			this.edit(false);
			identity = new IdentityModel;
			identity.id(Jua.randomId());
		}
		this.id(identity.id() || '');
		this.name(identity.name());
		this.email(identity.email());
		this.replyTo(identity.replyTo());
		this.showReplyTo(0 < identity.replyTo().length);
		this.bcc(identity.bcc());
		this.showBcc(0 < identity.bcc().length);
		this.signature(identity.signature());
		this.signatureInsertBefore(identity.signatureInsertBefore());
	}

	afterShow() {
		this.id() ? this.emailFocused(true) : this.nameFocused(true);
	}
}
