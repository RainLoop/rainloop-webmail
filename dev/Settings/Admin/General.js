import ko from 'ko';

import {
	isArray,
	pInt,
	settingsSaveHelperSimpleFunction,
	changeTheme,
	convertThemeName
} from 'Common/Utils';

import { addObservablesTo, addSubscribablesTo, addComputablesTo } from 'External/ko';

import { Capa, SaveSettingsStep } from 'Common/Enums';
import { Settings, SettingsGet, SettingsCapa } from 'Common/Globals';
import { translatorReload, convertLangName } from 'Common/Translator';

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
			capaThemes: SettingsCapa(Capa.Themes),
			capaUserBackground: SettingsCapa(Capa.UserBackground),
			capaAdditionalAccounts: SettingsCapa(Capa.AdditionalAccounts),
			capaIdentities: SettingsCapa(Capa.Identities),
			capaAttachmentThumbnails: SettingsCapa(Capa.AttachmentThumbnails),
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
			fSaveBoolHelper = key =>
				value => Remote.saveConfig({[key]: value ? 1 : 0});

		addSubscribablesTo(this, {
			mainAttachmentLimit: value =>
				Remote.saveConfig({
					AttachmentLimit: pInt(value)
				}, settingsSaveHelperSimpleFunction(this.attachmentLimitTrigger, this)),

			language: value =>
				Remote.saveConfig({
					Language: value.trim()
				}, settingsSaveHelperSimpleFunction(this.languageTrigger, this)),

			languageAdmin: value => {
				this.languageAdminTrigger(SaveSettingsStep.Animate);
				translatorReload(true, value)
					.then(fReloadLanguageHelper(SaveSettingsStep.TrueResult), fReloadLanguageHelper(SaveSettingsStep.FalseResult))
					.then(() => Remote.saveConfig({
						LanguageAdmin: value.trim()
					}));
			},

			theme: value => {
				changeTheme(value, this.themeTrigger);
				Remote.saveConfig({
					Theme: value.trim()
				}, settingsSaveHelperSimpleFunction(this.themeTrigger, this));
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
