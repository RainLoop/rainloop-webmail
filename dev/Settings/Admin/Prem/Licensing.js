import ko from 'ko';
import moment from 'moment';

import { settingsGet } from 'Storage/Settings';
import { showScreenPopup } from 'Knoin/Knoin';

import LicenseStore from 'Stores/Admin/License';

import { getApp } from 'Helper/Apps/Admin';

class LicensingPremAdminSettings {
	constructor() {
		this.licensing = LicenseStore.licensing;
		this.licensingProcess = LicenseStore.licensingProcess;
		this.licenseValid = LicenseStore.licenseValid;
		this.licenseExpired = LicenseStore.licenseExpired;
		this.licenseError = LicenseStore.licenseError;
		this.licenseTrigger = LicenseStore.licenseTrigger;

		this.adminDomain = ko.observable('');
		this.subscriptionEnabled = ko.observable(!!settingsGet('SubscriptionEnabled'));

		this.licenseTrigger.subscribe(() => {
			if (this.subscriptionEnabled()) {
				getApp().reloadLicensing(true);
			}
		});
	}

	onBuild() {
		if (this.subscriptionEnabled()) {
			getApp().reloadLicensing(false);
		}
	}

	onShow() {
		this.adminDomain(settingsGet('AdminDomain'));
	}

	showActivationForm() {
		showScreenPopup(require('View/Popup/Activate'));
	}

	showTrialForm() {
		showScreenPopup(require('View/Popup/Activate'), [true]);
	}

	/**
	 * @returns {boolean}
	 */
	licenseIsUnlim() {
		return 1898625600 === this.licenseExpired() || 1898625700 === this.licenseExpired(); // eslint-disable-line no-magic-numbers
	}

	/**
	 * @returns {string}
	 */
	licenseExpiredMomentValue() {
		const time = this.licenseExpired(),
			momentUnix = moment.unix(time);

		return this.licenseIsUnlim() ? 'Never' : time && momentUnix.format('LL') + ' (' + momentUnix.from(moment()) + ')';
	}
}

export { LicensingPremAdminSettings, LicensingPremAdminSettings as default };
