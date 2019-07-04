import ko from 'ko';

import { StorageResultType, Notification } from 'Common/Enums';
import { trim, isUnd } from 'Common/Utils';
import { RAINLOOP_TRIAL_KEY } from 'Common/Consts';
import { i18n, getNotification } from 'Common/Translator';

import * as Settings from 'Storage/Settings';

import Remote from 'Remote/Admin/Ajax';
import LicenseStore from 'Stores/Admin/License';

import { popup, command } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

@popup({
	name: 'View/Popup/Activate',
	templateID: 'PopupsActivate'
})
class ActivatePopupView extends AbstractViewNext {
	constructor() {
		super();

		this.domain = ko.observable('');
		this.key = ko.observable('');
		this.key.focus = ko.observable(false);
		this.activationSuccessed = ko.observable(false);

		this.licenseTrigger = LicenseStore.licenseTrigger;

		this.activateProcess = ko.observable(false);
		this.activateText = ko.observable('');
		this.activateText.isError = ko.observable(false);

		this.htmlDescription = ko.computed(() => i18n('POPUPS_ACTIVATE/HTML_DESC', { 'DOMAIN': this.domain() }));

		this.key.subscribe(() => {
			this.activateText('');
			this.activateText.isError(false);
		});

		this.activationSuccessed.subscribe((value) => {
			if (value) {
				this.licenseTrigger(!this.licenseTrigger());
			}
		});
	}

	@command(
		(self) => !self.activateProcess() && '' !== self.domain() && '' !== self.key() && !self.activationSuccessed()
	)
	activateCommand() {
		this.activateProcess(true);
		if (this.validateSubscriptionKey()) {
			Remote.licensingActivate(
				(sResult, oData) => {
					this.activateProcess(false);
					if (StorageResultType.Success === sResult && oData.Result) {
						if (true === oData.Result) {
							this.activationSuccessed(true);
							this.activateText(i18n('POPUPS_ACTIVATE/SUBS_KEY_ACTIVATED'));
							this.activateText.isError(false);
						} else {
							this.activateText(oData.Result);
							this.activateText.isError(true);
							this.key.focus(true);
						}
					} else if (oData.ErrorCode) {
						this.activateText(getNotification(oData.ErrorCode));
						this.activateText.isError(true);
						this.key.focus(true);
					} else {
						this.activateText(getNotification(Notification.UnknownError));
						this.activateText.isError(true);
						this.key.focus(true);
					}
				},
				this.domain(),
				this.key().replace(/[^A-Z0-9-]/gi, '')
			);
		} else {
			this.activateProcess(false);
			this.activateText(i18n('POPUPS_ACTIVATE/ERROR_INVALID_SUBS_KEY'));
			this.activateText.isError(true);
			this.key.focus(true);
		}
	}

	onShow(isTrial) {
		this.domain(Settings.settingsGet('AdminDomain'));
		if (!this.activateProcess()) {
			isTrial = isUnd(isTrial) ? false : !!isTrial;

			this.key(isTrial ? RAINLOOP_TRIAL_KEY : '');
			this.activateText('');
			this.activateText.isError(false);
			this.activationSuccessed(false);
		}
	}

	onShowWithDelay() {
		if (!this.activateProcess()) {
			this.key.focus(true);
		}
	}

	/**
	 * @returns {boolean}
	 */
	validateSubscriptionKey() {
		const value = this.key();
		return (
			'' === value ||
			RAINLOOP_TRIAL_KEY === value ||
			!!/^RL[\d]+-[A-Z0-9-]+Z$/.test(trim(value).replace(/[^A-Z0-9-]/gi, ''))
		);
	}
}

export { ActivatePopupView, ActivatePopupView as default };
