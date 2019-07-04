import ko from 'ko';

import { StorageResultType, Notification } from 'Common/Enums';
import { bMobileDevice } from 'Common/Globals';
import { trim, fakeMd5 } from 'Common/Utils';
import { getNotification } from 'Common/Translator';

import Remote from 'Remote/User/Ajax';

import { getApp } from 'Helper/Apps/User';

import { popup, command } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

@popup({
	name: 'View/Popup/Identity',
	templateID: 'PopupsIdentity'
})
class IdentityPopupView extends AbstractViewNext {
	constructor() {
		super();

		this.id = '';
		this.edit = ko.observable(false);
		this.owner = ko.observable(false);

		this.email = ko.observable('').validateEmail();
		this.email.focused = ko.observable(false);
		this.name = ko.observable('');
		this.name.focused = ko.observable(false);
		this.replyTo = ko.observable('').validateSimpleEmail();
		this.replyTo.focused = ko.observable(false);
		this.bcc = ko.observable('').validateSimpleEmail();
		this.bcc.focused = ko.observable(false);

		this.signature = ko.observable('');
		this.signatureInsertBefore = ko.observable(false);

		this.showBcc = ko.observable(false);
		this.showReplyTo = ko.observable(false);

		this.submitRequest = ko.observable(false);
		this.submitError = ko.observable('');

		this.bcc.subscribe((value) => {
			if (false === this.showBcc() && 0 < value.length) {
				this.showBcc(true);
			}
		});

		this.replyTo.subscribe((value) => {
			if (false === this.showReplyTo() && 0 < value.length) {
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
			this.email.hasError('' === trim(this.email()));
		}

		if (this.email.hasError()) {
			if (!this.owner()) {
				this.email.focused(true);
			}

			return false;
		}

		if (this.replyTo.hasError()) {
			this.replyTo.focused(true);
			return false;
		}

		if (this.bcc.hasError()) {
			this.bcc.focused(true);
			return false;
		}

		this.submitRequest(true);

		Remote.identityUpdate(
			(result, data) => {
				this.submitRequest(false);
				if (StorageResultType.Success === result && data) {
					if (data.Result) {
						getApp().accountsAndIdentities();
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

			this.owner('' === this.id);
		} else {
			this.id = fakeMd5();
		}
	}

	onShowWithDelay() {
		if (!this.owner() && !bMobileDevice) {
			this.email.focused(true);
		}
	}

	onHideWithDelay() {
		this.clearPopup();
	}
}

export { IdentityPopupView, IdentityPopupView as default };
