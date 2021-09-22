import ko from 'ko';

import {
	isArray,
	pInt,
	settingsSaveHelperSimpleFunction,
	changeTheme,
	convertThemeName,
	addObservablesTo,
	addSubscribablesTo,
	addComputablesTo
} from 'Common/Utils';

import { Capa, SaveSettingsStep } from 'Common/Enums';
import { Settings, SettingsGet } from 'Common/Globals';
import { reload as translatorReload, convertLangName } from 'Common/Translator';

import { showScreenPopup } from 'Knoin/Knoin';

import Remote from 'Remote/Admin/Fetch';

import { ThemeStore } from 'Stores/Theme';
import { LanguageStore } from 'Stores/Language';
import LanguagesPopupView from 'View/Popup/Languages';

export class GeneralAdminSettings /*extends AbstractViewSettings*/ {
	constructor() {
		this.language = LanguageStore.language;
		this.languages = LanguageStore.languages;

		const aLanguagesAdmin = Settings.app('languagesAdmin');
		this.languagesAdmin = ko.observableArray(isArray(aLanguagesAdmin) ? aLanguagesAdmin : []);
		this.languageAdmin = ko
			.observable(SettingsGet('LanguageAdmin'))
			.extend({ limitedList: this.languagesAdmin });

		this.theme = ThemeStore.theme;
		this.themes = ThemeStore.themes;

		addObservablesTo(this, {
			allowLanguagesOnSettings: !!SettingsGet('AllowLanguagesOnSettings'),
			newMoveToFolder: !!SettingsGet('NewMoveToFolder'),
			attachmentLimitTrigger: SaveSettingsStep.Idle,
			languageTrigger: SaveSettingsStep.Idle,
			themeTrigger: SaveSettingsStep.Idle,
			capaThemes: Settings.capa(Capa.Themes),
			capaUserBackground: Settings.capa(Capa.UserBackground),
			capaAdditionalAccounts: Settings.capa(Capa.AdditionalAccounts),
			capaIdentities: Settings.capa(Capa.Identities),
			capaAttachmentThumbnails: Settings.capa(Capa.AttachmentThumbnails),
			dataFolderAccess: false
		});

		this.weakPassword = rl.app.weakPassword;

		/** https://github.com/RainLoop/rainloop-webmail/issues/1924
		if (this.weakPassword) {
			fetch('./data/VERSION?' + Math.random()).then(response => this.dataFolderAccess(response.ok));
		}
		*/

		this.mainAttachmentLimit = ko
			.observable(pInt(SettingsGet('AttachmentLimit')) / (1024 * 1024))
			.extend({ debounce: 500 });

		this.uploadData = SettingsGet('PhpUploadSizes');
		this.uploadDataDesc =
			this.uploadData && (this.uploadData.upload_max_filesize || this.uploadData.post_max_size)
				? [
						this.uploadData.upload_max_filesize
							? 'upload_max_filesize = ' + this.uploadData.upload_max_filesize + '; '
							: '',
						this.uploadData.post_max_size ? 'post_max_size = ' + this.uploadData.post_max_size : ''
				  ].join('')
				: '';

		addComputablesTo(this, {
			themesOptions: () => this.themes.map(theme => ({ optValue: theme, optText: convertThemeName(theme) })),

			languageFullName: () => convertLangName(this.language()),
			languageAdminFullName: () => convertLangName(this.languageAdmin())
		});

		this.languageAdminTrigger = ko.observable(SaveSettingsStep.Idle).extend({ debounce: 100 });

		const fReloadLanguageHelper = (saveSettingsStep) => () => {
				this.languageAdminTrigger(saveSettingsStep);
				setTimeout(() => this.languageAdminTrigger(SaveSettingsStep.Idle), 1000);
			},
		fSaveBoolHelper = (key, fn) =>
			value => {
				const data = {};
				data[key] = value ? 1 : 0;
				Remote.saveAdminConfig(fn, data);
			};

		addSubscribablesTo(this, {
			mainAttachmentLimit: value =>
				Remote.saveAdminConfig(settingsSaveHelperSimpleFunction(this.attachmentLimitTrigger, this), {
					AttachmentLimit: pInt(value)
				}),

			language: value =>
				Remote.saveAdminConfig(settingsSaveHelperSimpleFunction(this.languageTrigger, this), {
					Language: value.trim()
				}),

			languageAdmin: value => {
				this.languageAdminTrigger(SaveSettingsStep.Animate);
				translatorReload(true, value)
					.then(fReloadLanguageHelper(SaveSettingsStep.TrueResult), fReloadLanguageHelper(SaveSettingsStep.FalseResult))
					.then(() => Remote.saveAdminConfig(null, {
						LanguageAdmin: value.trim()
					}));
			},

			theme: value => {
				changeTheme(value, this.themeTrigger);
				Remote.saveAdminConfig(settingsSaveHelperSimpleFunction(this.themeTrigger, this), {
					Theme: value.trim()
				});
			},

			capaAdditionalAccounts: fSaveBoolHelper('CapaAdditionalAccounts'),

			capaIdentities: fSaveBoolHelper('CapaIdentities'),

			capaAttachmentThumbnails: fSaveBoolHelper('CapaAttachmentThumbnails'),

			capaThemes: fSaveBoolHelper('CapaThemes'),

			capaUserBackground: fSaveBoolHelper('CapaUserBackground'),

			allowLanguagesOnSettings: fSaveBoolHelper('AllowLanguagesOnSettings'),

			newMoveToFolder: fSaveBoolHelper('NewMoveToFolder')
		});
	}

	selectLanguage() {
		showScreenPopup(LanguagesPopupView, [this.language, this.languages(), LanguageStore.userLanguage()]);
	}

	selectLanguageAdmin() {
		showScreenPopup(LanguagesPopupView, [
			this.languageAdmin,
			this.languagesAdmin(),
			SettingsGet('UserLanguageAdmin')
		]);
	}
}
