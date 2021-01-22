import ko from 'ko';

import {
	pInt,
	settingsSaveHelperSimpleFunction,
	changeTheme,
	convertThemeName,
	convertLangName
} from 'Common/Utils';

import { SaveSettingsStep } from 'Common/Enums';
import { reload as translatorReload } from 'Common/Translator';

import { showScreenPopup } from 'Knoin/Knoin';

import Remote from 'Remote/Admin/Fetch';

import ThemeStore from 'Stores/Theme';
import LanguageStore from 'Stores/Language';
import AppAdminStore from 'Stores/Admin/App';
import CapaAdminStore from 'Stores/Admin/Capa';

const settingsGet = rl.settings.get;

class GeneralAdminSettings {
	constructor() {
		this.language = LanguageStore.language;
		this.languages = LanguageStore.languages;
		this.languageAdmin = LanguageStore.languageAdmin;
		this.languagesAdmin = LanguageStore.languagesAdmin;

		this.theme = ThemeStore.theme;
		this.themes = ThemeStore.themes;

		this.capaThemes = CapaAdminStore.themes;
		this.capaUserBackground = CapaAdminStore.userBackground;
		this.capaAdditionalAccounts = CapaAdminStore.additionalAccounts;
		this.capaIdentities = CapaAdminStore.identities;
		this.capaAttachmentThumbnails = CapaAdminStore.attachmentThumbnails;
		this.capaTemplates = CapaAdminStore.templates;

		ko.addObservablesTo(this, {
			allowLanguagesOnSettings: !!settingsGet('AllowLanguagesOnSettings'),
			newMoveToFolder: !!settingsGet('NewMoveToFolder'),
			attachmentLimitTrigger: SaveSettingsStep.Idle,
			languageTrigger: SaveSettingsStep.Idle,
			themeTrigger: SaveSettingsStep.Idle
		});

		this.weakPassword = AppAdminStore.weakPassword;

		this.dataFolderAccess = AppAdminStore.dataFolderAccess;

		this.mainAttachmentLimit = ko
			.observable(pInt(settingsGet('AttachmentLimit')) / (1024 * 1024))
			.extend({ posInterer: 25 });

		this.uploadData = settingsGet('PhpUploadSizes');
		this.uploadDataDesc =
			this.uploadData && (this.uploadData.upload_max_filesize || this.uploadData.post_max_size)
				? [
						this.uploadData.upload_max_filesize
							? 'upload_max_filesize = ' + this.uploadData.upload_max_filesize + '; '
							: '',
						this.uploadData.post_max_size ? 'post_max_size = ' + this.uploadData.post_max_size : ''
				  ].join('')
				: '';

		this.themesOptions = ko.computed(() =>
			this.themes.map(theme => ({ optValue: theme, optText: convertThemeName(theme) }))
		);

		this.languageFullName = ko.computed(() => convertLangName(this.language()));
		this.languageAdminFullName = ko.computed(() => convertLangName(this.languageAdmin()));

		this.languageAdminTrigger = ko.observable(SaveSettingsStep.Idle).extend({ throttle: 100 });
	}

	onBuild() {
		setTimeout(() => {
			const f1 = settingsSaveHelperSimpleFunction(this.attachmentLimitTrigger, this),
				f2 = settingsSaveHelperSimpleFunction(this.languageTrigger, this),
				f3 = settingsSaveHelperSimpleFunction(this.themeTrigger, this),
				fReloadLanguageHelper = (saveSettingsStep) => () => {
					this.languageAdminTrigger(saveSettingsStep);
					setTimeout(() => this.languageAdminTrigger(SaveSettingsStep.Idle), 1000);
				};

			this.mainAttachmentLimit.subscribe(value => {
				Remote.saveAdminConfig(f1, {
					'AttachmentLimit': pInt(value)
				});
			});

			this.language.subscribe(value => {
				Remote.saveAdminConfig(f2, {
					'Language': value.trim()
				});
			});

			this.languageAdmin.subscribe(value => {
				this.languageAdminTrigger(SaveSettingsStep.Animate);
				translatorReload(true, value)
					.then(fReloadLanguageHelper(SaveSettingsStep.TrueResult), fReloadLanguageHelper(SaveSettingsStep.FalseResult))
					.then(() => {
						Remote.saveAdminConfig(null, {
							'LanguageAdmin': value.trim()
						});
					});
			});

			this.theme.subscribe(value => {
				changeTheme(value, this.themeTrigger);
				Remote.saveAdminConfig(f3, {
					'Theme': value.trim()
				});
			});

			this.capaAdditionalAccounts.subscribe(value => {
				Remote.saveAdminConfig(null, {
					'CapaAdditionalAccounts': value ? '1' : '0'
				});
			});

			this.capaIdentities.subscribe(value => {
				Remote.saveAdminConfig(null, {
					'CapaIdentities': value ? '1' : '0'
				});
			});

			this.capaTemplates.subscribe(value => {
				Remote.saveAdminConfig(null, {
					'CapaTemplates': value ? '1' : '0'
				});
			});

			this.capaAttachmentThumbnails.subscribe(value => {
				Remote.saveAdminConfig(null, {
					'CapaAttachmentThumbnails': value ? '1' : '0'
				});
			});

			this.capaThemes.subscribe(value => {
				Remote.saveAdminConfig(null, {
					'CapaThemes': value ? '1' : '0'
				});
			});

			this.capaUserBackground.subscribe(value => {
				Remote.saveAdminConfig(null, {
					'CapaUserBackground': value ? '1' : '0'
				});
			});

			this.allowLanguagesOnSettings.subscribe(value => {
				Remote.saveAdminConfig(null, {
					'AllowLanguagesOnSettings': value ? '1' : '0'
				});
			});

			this.newMoveToFolder.subscribe(value => {
				Remote.saveAdminConfig(null, {
					'NewMoveToFolder': value ? '1' : '0'
				});
			});
		}, 50);
	}

	selectLanguage() {
		showScreenPopup(require('View/Popup/Languages'), [this.language, this.languages(), LanguageStore.userLanguage()]);
	}

	selectLanguageAdmin() {
		showScreenPopup(require('View/Popup/Languages'), [
			this.languageAdmin,
			this.languagesAdmin(),
			LanguageStore.userLanguageAdmin()
		]);
	}
}

export { GeneralAdminSettings, GeneralAdminSettings as default };
