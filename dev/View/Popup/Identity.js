import { StorageResultType, Notification } from 'Common/Enums';
import { getNotification } from 'Common/Translator';

import Remote from 'Remote/User/Fetch';

import { command } from 'Knoin/Knoin';
import { AbstractViewPopup } from 'Knoin/AbstractViews';

const reEmail = /^[^@\s]+@[^@\s]+$/;

class IdentityPopupView extends AbstractViewPopup {
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

	@command((self) => !self.submitRequest())
	addOrEditIdentityCommand() {
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

			return false;
		}

		if (this.replyToHasError()) {
			this.replyToFocused(true);
			return false;
		}

		if (this.bccHasError()) {
			this.bccFocused(true);
			return false;
		}

		this.submitRequest(true);

		Remote.identityUpdate(
			(result, data) => {
				this.submitRequest(false);
				if (StorageResultType.Success === result && data) {
					if (data.Result) {
						rl.app.accountsAndIdentities();
						this.cancelCommand();
					} else if (data.ErrorCode) {
						this.submitError(getNotification(data.ErrorCode));
					}
				} else {
					this.submitError(getNotification(Notification.UnknownError));
				}
			},
			this.id,
			this.email(),
			this.name(),
			this.replyTo(),
			this.bcc(),
			this.signature(),
			this.signatureInsertBefore()
		);

		return true;
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

	onShowWithDelay() {
		if (!this.owner()/* && !rl.settings.app('mobile')*/) {
			this.emailFocused(true);
		}
	}

	onHideWithDelay() {
		this.clearPopup();
	}
}

export { IdentityPopupView, IdentityPopupView as default };
