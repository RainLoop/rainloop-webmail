import ko from 'ko';

import { StorageResultType, Notification } from 'Common/Enums';
import { getNotification } from 'Common/Translator';

import Remote from 'Remote/User/Fetch';

import { popup, command } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

ko.observable.fn.validateEmail = function() {
	this.hasError = ko.observable(false);

	this.subscribe(value => this.hasError(value && !/^[^@\s]+@[^@\s]+$/.test(value)));

	this.valueHasMutated();
	return this;
};

@popup({
	name: 'View/Popup/Identity',
	templateID: 'PopupsIdentity'
})
class IdentityPopupView extends AbstractViewNext {
	constructor() {
		super();

		this.id = '';
		this.addObservables({
			edit: false,
			owner: false,
			emailFocused: false,
			name: '',
			replyToFocused: false,
			bccFocused: false,

			signature: '',
			signatureInsertBefore: false,

			showBcc: false,
			showReplyTo: false,

			submitRequest: false,
			submitError: ''
		});

		this.email = ko.observable('').validateEmail();
		this.replyTo = ko.observable('').validateEmail();
		this.bcc = ko.observable('').validateEmail();

		this.bcc.subscribe((value) => {
			if (false === this.showBcc() && value.length) {
				this.showBcc(true);
			}
		});

		this.replyTo.subscribe((value) => {
			if (false === this.showReplyTo() && value.length) {
				this.showReplyTo(true);
			}
		});
	}

	@command((self) => !self.submitRequest())
	addOrEditIdentityCommand() {
		if (this.signature && this.signature.__fetchEditorValue) {
			this.signature.__fetchEditorValue();
		}

		if (!this.email.hasError()) {
			this.email.hasError(!this.email().trim());
		}

		if (this.email.hasError()) {
			if (!this.owner()) {
				this.emailFocused(true);
			}

			return false;
		}

		if (this.replyTo.hasError()) {
			this.replyToFocused(true);
			return false;
		}

		if (this.bcc.hasError()) {
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

		this.email.hasError(false);
		this.replyTo.hasError(false);
		this.bcc.hasError(false);

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
