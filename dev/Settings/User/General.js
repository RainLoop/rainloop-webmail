import ko from 'ko';

import { MESSAGES_PER_PAGE_VALUES } from 'Common/Consts';

import { SaveSettingsStep } from 'Common/Enums';
import { EditorDefaultType, Layout } from 'Common/EnumsUser';

import { settingsSaveHelperSimpleFunction } from 'Common/Utils';

import { i18n, trigger as translatorTrigger, reload as translatorReload, convertLangName } from 'Common/Translator';

import { showScreenPopup } from 'Knoin/Knoin';

import AppStore from 'Stores/User/App';
import { LanguageStore } from 'Stores/Language';
import SettingsStore from 'Stores/User/Settings';
import IdentityStore from 'Stores/User/Identity';
import NotificationStore from 'Stores/User/Notification';
import MessageStore from 'Stores/User/Message';

import Remote from 'Remote/User/Fetch';

import { IdentityPopupView } from 'View/Popup/Identity';
import { LanguagesPopupView } from 'View/Popup/Languages';

export class GeneralUserSettings {
	constructor() {
		this.language = LanguageStore.language;
		this.languages = LanguageStore.languages;
		this.messagesPerPage = SettingsStore.messagesPerPage;
		this.messagesPerPageArray = MESSAGES_PER_PAGE_VALUES;

		this.editorDefaultType = SettingsStore.editorDefaultType;
		this.layout = SettingsStore.layout;

		this.enableSoundNotification = NotificationStore.enableSoundNotification;

		this.enableDesktopNotification = NotificationStore.enableDesktopNotification;
		this.isDesktopNotificationDenied = NotificationStore.isDesktopNotificationDenied;

		this.showImages = SettingsStore.showImages;
		this.useCheckboxesInList = SettingsStore.useCheckboxesInList;
		this.threadsAllowed = AppStore.threadsAllowed;
		this.useThreads = SettingsStore.useThreads;
		this.replySameFolder = SettingsStore.replySameFolder;
		this.allowLanguagesOnSettings = !!rl.settings.get('AllowLanguagesOnSettings');

		this.languageFullName = ko.computed(() => convertLangName(this.language()));
		this.languageTrigger = ko.observable(SaveSettingsStep.Idle).extend({ debounce: 100 });

		ko.addObservablesTo(this, {
			mppTrigger: SaveSettingsStep.Idle,
			editorDefaultTypeTrigger: SaveSettingsStep.Idle,
			layoutTrigger: SaveSettingsStep.Idle
		});

		this.identities = IdentityStore.identities;

		this.identityMain = ko.computed(() => {
			const list = this.identities();
			return Array.isArray(list) ? list.find(item => item && !item.id()) : null;
		});

		this.identityMainDesc = ko.computed(() => {
			const identity = this.identityMain();
			return identity ? identity.formattedName() : '---';
		});

		this.editorDefaultTypes = ko.computed(() => {
			translatorTrigger();
			return [
				{ 'id': EditorDefaultType.Html, 'name': i18n('SETTINGS_GENERAL/LABEL_EDITOR_HTML') },
				{ 'id': EditorDefaultType.Plain, 'name': i18n('SETTINGS_GENERAL/LABEL_EDITOR_PLAIN') },
				{ 'id': EditorDefaultType.HtmlForced, 'name': i18n('SETTINGS_GENERAL/LABEL_EDITOR_HTML_FORCED') },
				{ 'id': EditorDefaultType.PlainForced, 'name': i18n('SETTINGS_GENERAL/LABEL_EDITOR_PLAIN_FORCED') }
			];
		});

		this.layoutTypes = ko.computed(() => {
			translatorTrigger();
			return [
				{ 'id': Layout.NoPreview, 'name': i18n('SETTINGS_GENERAL/LABEL_LAYOUT_NO_SPLIT') },
				{ 'id': Layout.SidePreview, 'name': i18n('SETTINGS_GENERAL/LABEL_LAYOUT_VERTICAL_SPLIT') },
				{ 'id': Layout.BottomPreview, 'name': i18n('SETTINGS_GENERAL/LABEL_LAYOUT_HORIZONTAL_SPLIT') }
			];
		});
	}

	editMainIdentity() {
		const identity = this.identityMain();
		if (identity) {
			showScreenPopup(IdentityPopupView, [identity]);
		}
	}

	testSoundNotification() {
		NotificationStore.playSoundNotification(true);
	}

	testSystemNotification() {
		NotificationStore.displayDesktopNotification('SnappyMail', 'Test notification', { });
	}

	onBuild() {
		setTimeout(() => {
			const f0 = settingsSaveHelperSimpleFunction(this.editorDefaultTypeTrigger, this),
				f1 = settingsSaveHelperSimpleFunction(this.mppTrigger, this),
				f2 = settingsSaveHelperSimpleFunction(this.layoutTrigger, this),
				fReloadLanguageHelper = (saveSettingsStep) => () => {
					this.languageTrigger(saveSettingsStep);
					setTimeout(() => this.languageTrigger(SaveSettingsStep.Idle), 1000);
				};

			this.language.subscribe((value) => {
				this.languageTrigger(SaveSettingsStep.Animate);
				translatorReload(false, value)
					.then(fReloadLanguageHelper(SaveSettingsStep.TrueResult), fReloadLanguageHelper(SaveSettingsStep.FalseResult))
					.then(() => {
						Remote.saveSettings(null, {
							'Language': value
						});
					});
			});

			this.editorDefaultType.subscribe(Remote.saveSettingsHelper('EditorDefaultType', null, f0));
			this.messagesPerPage.subscribe(Remote.saveSettingsHelper('MPP', null, f1));
			this.showImages.subscribe(Remote.saveSettingsHelper('ShowImages', v=>v?'1':'0'));

			this.useCheckboxesInList.subscribe(Remote.saveSettingsHelper('UseCheckboxesInList', v=>v?'1':'0'));

			this.enableDesktopNotification.subscribe((value =>
				Remote.saveSettings(null, {
					'DesktopNotifications': value ? 1 : 0
				})
			).debounce(3000));

			this.enableSoundNotification.subscribe((value =>
				Remote.saveSettings(null, {
					'SoundNotification': value ? 1 : 0
				})
			).debounce(3000));

			this.replySameFolder.subscribe((value =>
				Remote.saveSettings(null, {
					'ReplySameFolder': value ? 1 : 0
				})
			).debounce(3000));

			this.useThreads.subscribe((value) => {
				MessageStore.messageList([]);
				Remote.saveSettings(null, {
					'UseThreads': value ? 1 : 0
				});
			});

			this.layout.subscribe((value) => {
				MessageStore.messageList([]);
				Remote.saveSettings(f2, {
					'Layout': value
				});
			});
		}, 50);
	}

	selectLanguage() {
		showScreenPopup(LanguagesPopupView, [this.language, this.languages(), LanguageStore.userLanguage()]);
	}
}
