import { getNotification } from 'Common/Translator';

import Remote from 'Remote/User/Fetch';

import { AbstractViewPopup } from 'Knoin/AbstractViews';

const reEmail = /^[^@\s]+@[^@\s]+$/;

export class IdentityPopupView extends AbstractViewPopup {
	constructor() {
		super('Identity');

		this.id = '';
		this.addObservables({
			edit: false,
			owner: false,

			email: '',
			emailFocused: false,
			emailHasError: false,

			name: '',

			replyTo: '',
			replyToFocused: false,
			replyToHasError: false,

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

		this.addSubscribables({
			email: value => this.emailHasError(value && !reEmail.test(value)),
			replyTo: value => {
				this.replyToHasError(value && !reEmail.test(value));
				if (false === this.showReplyTo() && value.length) {
					this.showReplyTo(true);
				}
			},
			bcc: value => {
				this.bccHasError(value && !reEmail.test(value));
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

	submitForm() {
		if (!this.submitRequest()) {
			if (this.signature && this.signature.__fetchEditorValue) {
				this.signature.__fetchEditorValue();
			}

			if (!this.emailHasError()) {
				this.emailHasError(!this.email().trim());
			}

			if (this.emailHasError()) {
				if (!this.owner()) {
					this.emailFocused(true);
				}

				return;
			}

			if (this.replyToHasError()) {
				this.replyToFocused(true);
				return;
			}

			if (this.bccHasError()) {
				this.bccFocused(true);
				return;
			}

			this.submitRequest(true);

			Remote.request('IdentityUpdate', iError => {
					this.submitRequest(false);
					if (iError) {
						this.submitError(getNotification(iError));
					} else {
						rl.app.accountsAndIdentities();
						this.close();
					}
				}, {
					Id: this.id,
					Email: this.email(),
					Name: this.name(),
					ReplyTo: this.replyTo(),
					Bcc: this.bcc(),
					Signature: this.signature(),
					SignatureInsertBefore: this.signatureInsertBefore() ? 1 : 0
				}
			);
		}
	}

	clearPopup() {
		this.id = '';
		this.edit(false);
		this.owner(false);

		this.name('');
		this.email('');
		this.replyTo('');
		this.bcc('');
		this.signature('');
		this.signatureInsertBefore(false);

		this.emailHasError(false);
		this.replyToHasError(false);
		this.bccHasError(false);

		this.showBcc(false);
		this.showReplyTo(false);

		this.submitRequest(false);
		this.submitError('');
	}

	/**
	 * @param {?IdentityModel} oIdentity
	 */
	onShow(identity) {
		this.clearPopup();

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
			this.id = Jua.randomId();
		}
	}

	afterShow() {
		this.owner() || this.emailFocused(true);
	}

	afterHide() {
		this.clearPopup();
	}
}
