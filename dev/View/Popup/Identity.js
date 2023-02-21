import { addObservablesTo, addSubscribablesTo } from 'External/ko';

import { getNotification } from 'Common/Translator';

import Remote from 'Remote/User/Fetch';

import { AbstractViewPopup } from 'Knoin/AbstractViews';

export class IdentityPopupView extends AbstractViewPopup {
	constructor() {
		super('Identity');

		this.id = '';
		addObservablesTo(this, {
			edit: false,
			owner: false,

			email: '',
			emailFocused: false,

			name: '',

			replyTo: '',
			replyToFocused: false,

			bcc: '',
			bccFocused: false,
			bccHasError: false,

			signature: '',
			signatureInsertBefore: false,

			showBcc: false,
			showReplyTo: false,

			submitRequest: false,
			submitError: ''
		});

		addSubscribablesTo(this, {
			replyTo: value => {
				if (false === this.showReplyTo() && value.length) {
					this.showReplyTo(true);
				}
			},
			bcc: value => {
				if (false === this.showBcc() && value.length) {
					this.showBcc(true);
				}
			}
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
			data.set('Id', this.id);
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

			this.id = identity.id() || '';
			this.name(identity.name());
			this.email(identity.email());
			this.replyTo(identity.replyTo());
			this.bcc(identity.bcc());
			this.signature(identity.signature());
			this.signatureInsertBefore(identity.signatureInsertBefore());

			this.owner(!this.id);
		} else {
			this.edit(false);

			this.id = Jua.randomId();
			this.name('');
			this.email('');
			this.replyTo('');
			this.bcc('');
			this.signature('');
			this.signatureInsertBefore(false);

			this.owner(false);
		}
	}

	afterShow() {
		this.owner() || this.emailFocused(true);
	}
}
