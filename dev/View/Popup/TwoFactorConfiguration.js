import window from 'window';
import _ from '_';
import ko from 'ko';
import qr from 'qr';

import { Capa, StorageResultType } from 'Common/Enums';
import { pString } from 'Common/Utils';
import { i18n, trigger as translatorTrigger } from 'Common/Translator';

import * as Settings from 'Storage/Settings';

import Remote from 'Remote/User/Ajax';

import { getApp } from 'Helper/Apps/User';

import { popup, showScreenPopup } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

@popup({
	name: 'View/Popup/TwoFactorConfiguration',
	templateID: 'PopupsTwoFactorConfiguration'
})
class TwoFactorConfigurationPopupView extends AbstractViewNext {
	constructor() {
		super();

		this.lock = ko.observable(false);

		this.capaTwoFactor = Settings.capa(Capa.TwoFactor);

		this.processing = ko.observable(false);
		this.clearing = ko.observable(false);
		this.secreting = ko.observable(false);

		this.viewUser = ko.observable('');
		this.twoFactorStatus = ko.observable(false);

		this.twoFactorTested = ko.observable(false);

		this.viewSecret = ko.observable('');
		this.viewBackupCodes = ko.observable('');
		this.viewUrlTitle = ko.observable('');
		this.viewUrl = ko.observable('');

		this.viewEnable_ = ko.observable(false);

		this.viewEnable = ko.computed({
			read: this.viewEnable_,
			write: (value) => {
				value = !!value;
				if (value && this.twoFactorTested()) {
					this.viewEnable_(value);
					Remote.enableTwoFactor((result, data) => {
						if (StorageResultType.Success !== result || !data || !data.Result) {
							this.viewEnable_(false);
						}
					}, true);
				} else {
					if (!value) {
						this.viewEnable_(value);
					}

					Remote.enableTwoFactor((result, data) => {
						if (StorageResultType.Success !== result || !data || !data.Result) {
							this.viewEnable_(false);
						}
					}, false);
				}
			}
		});

		this.viewTwoFactorEnableTooltip = ko.computed(() => {
			translatorTrigger();
			return this.twoFactorTested() || this.viewEnable_()
				? ''
				: i18n('POPUPS_TWO_FACTOR_CFG/TWO_FACTOR_SECRET_TEST_BEFORE_DESC');
		});

		this.viewTwoFactorStatus = ko.computed(() => {
			translatorTrigger();
			return i18n(
				this.twoFactorStatus()
					? 'POPUPS_TWO_FACTOR_CFG/TWO_FACTOR_SECRET_CONFIGURED_DESC'
					: 'POPUPS_TWO_FACTOR_CFG/TWO_FACTOR_SECRET_NOT_CONFIGURED_DESC'
			);
		});

		this.twoFactorAllowedEnable = ko.computed(() => this.viewEnable() || this.twoFactorTested());

		this.onResult = _.bind(this.onResult, this);
		this.onShowSecretResult = _.bind(this.onShowSecretResult, this);
	}

	showSecret() {
		this.secreting(true);
		Remote.showTwoFactorSecret(this.onShowSecretResult);
	}

	hideSecret() {
		this.viewSecret('');
		this.viewBackupCodes('');
		this.viewUrlTitle('');
		this.viewUrl('');
	}

	createTwoFactor() {
		this.processing(true);
		Remote.createTwoFactor(this.onResult);
	}

	logout() {
		getApp().logout();
	}

	testTwoFactor() {
		showScreenPopup(require('View/Popup/TwoFactorTest'), [this.twoFactorTested]);
	}

	clearTwoFactor() {
		this.viewSecret('');
		this.viewBackupCodes('');
		this.viewUrlTitle('');
		this.viewUrl('');

		this.twoFactorTested(false);

		this.clearing(true);
		Remote.clearTwoFactor(this.onResult);
	}

	onShow(bLock) {
		this.lock(!!bLock);

		this.viewSecret('');
		this.viewBackupCodes('');
		this.viewUrlTitle('');
		this.viewUrl('');
	}

	onHide() {
		if (this.lock()) {
			window.location.reload();
		}
	}

	getQr() {
		return (
			'otpauth://totp/' +
			window.encodeURIComponent(this.viewUser()) +
			'?secret=' +
			window.encodeURIComponent(this.viewSecret()) +
			'&issuer=' +
			window.encodeURIComponent('')
		);
	}

	onResult(sResult, oData) {
		this.processing(false);
		this.clearing(false);

		if (StorageResultType.Success === sResult && oData && oData.Result) {
			this.viewUser(pString(oData.Result.User));
			this.viewEnable_(!!oData.Result.Enable);
			this.twoFactorStatus(!!oData.Result.IsSet);
			this.twoFactorTested(!!oData.Result.Tested);

			this.viewSecret(pString(oData.Result.Secret));
			this.viewBackupCodes(pString(oData.Result.BackupCodes).replace(/[\s]+/g, '  '));

			this.viewUrlTitle(pString(oData.Result.UrlTitle));
			this.viewUrl(qr.toDataURL({ level: 'M', size: 8, value: this.getQr() }));
		} else {
			this.viewUser('');
			this.viewEnable_(false);
			this.twoFactorStatus(false);
			this.twoFactorTested(false);

			this.viewSecret('');
			this.viewBackupCodes('');
			this.viewUrlTitle('');
			this.viewUrl('');
		}
	}

	onShowSecretResult(result, data) {
		this.secreting(false);

		if (StorageResultType.Success === result && data && data.Result) {
			this.viewSecret(pString(data.Result.Secret));
			this.viewUrlTitle(pString(data.Result.UrlTitle));
			this.viewUrl(qr.toDataURL({ level: 'M', size: 6, value: this.getQr() }));
		} else {
			this.viewSecret('');
			this.viewUrlTitle('');
			this.viewUrl('');
		}
	}

	onBuild() {
		if (this.capaTwoFactor) {
			this.processing(true);
			Remote.getTwoFactor(this.onResult);
		}
	}
}

export { TwoFactorConfigurationPopupView, TwoFactorConfigurationPopupView as default };
