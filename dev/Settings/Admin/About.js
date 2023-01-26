import ko from 'ko';
import { Settings } from 'Common/Globals';
import { addObservablesTo } from 'External/ko';
import Remote from 'Remote/Admin/Fetch';

import { i18n, translateTrigger } from 'Common/Translator';

export class AdminSettingsAbout /*extends AbstractViewSettings*/ {
	constructor() {
		this.version = Settings.app('version');
		this.phpextensions = ko.observableArray();

		addObservablesTo(this, {
			coreReal: true,
			coreUpdatable: true,
			coreWarning: false,
			coreVersion: '',
			coreVersionCompare: -2,
			errorDesc: ''
		});
		this.coreChecking = ko.observable(false).extend({ throttle: 100 });
		this.coreUpdating = ko.observable(false).extend({ throttle: 100 });

		this.coreVersionHtmlDesc = ko.computed(() => {
			translateTrigger();
			return i18n('TAB_ABOUT/HTML_NEW_VERSION', { 'VERSION': this.coreVersion() });
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
			} else if (!isReal) {
				type = 'error';
				this.errorDesc('Cannot access the repository at the moment.');
			} else if (0 === versionToCompare) {
				type = 'up-to-date';
			} else if (-1 === versionToCompare) {
				type = 'available';
			}

			return type;
		});
	}

	onBuild() {
		Remote.request('AdminPHPExtensions', (iError, data) => iError || this.phpextensions(data.Result));

//	beforeShow() {
		this.coreChecking(true);
		Remote.request('AdminUpdateInfo', (iError, data) => {
			this.coreChecking(false);
			if (!iError && data?.Result) {
				this.coreReal(true);
				this.coreUpdatable(!!data.Result.updatable);
				this.coreWarning(!!data.Result.warning);
				this.coreVersion(data.Result.version || '');
				this.coreVersionCompare(data.Result.versionCompare);
			} else {
				this.coreReal(false);
				this.coreWarning(false);
				this.coreVersion('');
				this.coreVersionCompare(-2);
			}
		});
	}

	updateCoreData() {
		if (!this.coreUpdating()) {
			this.coreUpdating(true);
			Remote.request('AdminUpgradeCore', (iError, data) => {
				this.coreUpdating(false);
				this.coreVersion('');
				this.coreVersionCompare(-2);
				if (!iError && data?.Result) {
					this.coreReal(true);
					window.location.reload();
				} else {
					this.coreReal(false);
				}
			}, {}, 90000);
		}
	}
}
