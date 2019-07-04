import ko from 'ko';

import { i18n, trigger as translatorTrigger } from 'Common/Translator';
import { appSettingsGet, settingsGet } from 'Storage/Settings';

import AppStore from 'Stores/Admin/App';
import CoreStore from 'Stores/Admin/Core';

import { getApp } from 'Helper/Apps/Admin';

class AboutAdminSettings {
	constructor() {
		this.version = ko.observable(appSettingsGet('version'));
		this.access = ko.observable(!!settingsGet('CoreAccess'));
		this.errorDesc = ko.observable('');

		this.coreReal = CoreStore.coreReal;
		this.coreChannel = CoreStore.coreChannel;
		this.coreType = CoreStore.coreType;
		this.coreUpdatable = CoreStore.coreUpdatable;
		this.coreAccess = CoreStore.coreAccess;
		this.coreChecking = CoreStore.coreChecking;
		this.coreUpdating = CoreStore.coreUpdating;
		this.coreWarning = CoreStore.coreWarning;
		this.coreVersion = CoreStore.coreVersion;
		this.coreRemoteVersion = CoreStore.coreRemoteVersion;
		this.coreRemoteRelease = CoreStore.coreRemoteRelease;
		this.coreVersionCompare = CoreStore.coreVersionCompare;

		this.community = RL_COMMUNITY || AppStore.community();

		this.coreRemoteVersionHtmlDesc = ko.computed(() => {
			translatorTrigger();
			return i18n('TAB_ABOUT/HTML_NEW_VERSION', { 'VERSION': this.coreRemoteVersion() });
		});

		this.statusType = ko.computed(() => {
			let type = '';
			const versionToCompare = this.coreVersionCompare(),
				isChecking = this.coreChecking(),
				isUpdating = this.coreUpdating(),
				isReal = this.coreReal();

			if (isChecking) {
				type = 'checking';
			} else if (isUpdating) {
				type = 'updating';
			} else if (isReal && 0 === versionToCompare) {
				type = 'up-to-date';
			} else if (isReal && -1 === versionToCompare) {
				type = 'available';
			} else if (!isReal) {
				type = 'error';
				this.errorDesc('Cannot access the repository at the moment.');
			}

			return type;
		});
	}

	onBuild() {
		if (this.access() && !this.community) {
			getApp().reloadCoreData();
		}
	}

	updateCoreData() {
		if (!this.coreUpdating() && !this.community) {
			getApp().updateCoreData();
		}
	}
}

export { AboutAdminSettings, AboutAdminSettings as default };
