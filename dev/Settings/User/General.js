import ko from 'ko';

import { MESSAGES_PER_PAGE_VALUES } from 'Common/Consts';
import { SaveSettingsStep } from 'Common/Enums';
import { EditorDefaultType, Layout } from 'Common/EnumsUser';
import { SettingsGet } from 'Common/Globals';
import { isArray, settingsSaveHelperSimpleFunction, addObservablesTo, addSubscribablesTo } from 'Common/Utils';
import { i18n, trigger as translatorTrigger, reload as translatorReload, convertLangName } from 'Common/Translator';

import { showScreenPopup } from 'Knoin/Knoin';

import { AppUserStore } from 'Stores/User/App';
import { LanguageStore } from 'Stores/Language';
import { SettingsUserStore } from 'Stores/User/Settings';
import { IdentityUserStore } from 'Stores/User/Identity';
import { NotificationUserStore } from 'Stores/User/Notification';
import { MessageUserStore } from 'Stores/User/Message';

import Remote from 'Remote/User/Fetch';

import { IdentityPopupView } from 'View/Popup/Identity';
import { LanguagesPopupView } from 'View/Popup/Languages';

export class GeneralUserSettings {
	constructor() {
		this.language = LanguageStore.language;
		this.languages = LanguageStore.languages;
		this.messagesPerPage = SettingsUserStore.messagesPerPage;
		this.messagesPerPageArray = MESSAGES_PER_PAGE_VALUES;

		this.editorDefaultType = SettingsUserStore.editorDefaultType;
		this.layout = SettingsUserStore.layout;

		this.enableSoundNotification = NotificationUserStore.enableSoundNotification;
		this.notificationSound = ko.observable(SettingsGet('NotificationSound'));
		this.notificationSounds = ko.observableArray(SettingsGet('NewMailSounds'));

		this.enableDesktopNotification = NotificationUserStore.enableDesktopNotification;
		this.isDesktopNotificationDenied = NotificationUserStore.isDesktopNotificationDenied;

		this.showImages = SettingsUserStore.showImages;
		this.removeColors = SettingsUserStore.removeColors;
		this.useCheckboxesInList = SettingsUserStore.useCheckboxesInList;
		this.threadsAllowed = AppUserStore.threadsAllowed;
		this.useThreads = SettingsUserStore.useThreads;
		this.replySameFolder = SettingsUserStore.replySameFolder;
		this.allowLanguagesOnSettings = !!SettingsGet('AllowLanguagesOnSettings');

		this.languageFullName = ko.computed(() => convertLangName(this.language()));
		this.languageTrigger = ko.observable(SaveSettingsStep.Idle).extend({ debounce: 100 });

		addObservablesTo(this, {
			mppTrigger: SaveSettingsStep.Idle,
			editorDefaultTypeTrigger: SaveSettingsStep.Idle,
			layoutTrigger: SaveSettingsStep.Idle
		});

		this.identities = IdentityUserStore;

		this.identityMain = ko.computed(() => {
			const list = this.identities();
			return isArray(list) ? list.find(item => item && !item.id()) : null;
		});

		this.identityMainDesc = ko.computed(() => {
			const identity = this.identityMain();
			return identity ? identity.formattedName() : '---';
		});

		this.editorDefaultTypes = ko.computed(() => {
			translatorTrigger();
			return [
				{ id: EditorDefaultType.Html, name: i18n('SETTINGS_GENERAL/LABEL_EDITOR_HTML') },
				{ id: EditorDefaultType.Plain, name: i18n('SETTINGS_GENERAL/LABEL_EDITOR_PLAIN') },
				{ id: EditorDefaultType.HtmlForced, name: i18n('SETTINGS_GENERAL/LABEL_EDITOR_HTML_FORCED') },
				{ id: EditorDefaultType.PlainForced, name: i18n('SETTINGS_GENERAL/LABEL_EDITOR_PLAIN_FORCED') }
			];
		});

		this.layoutTypes = ko.computed(() => {
			translatorTrigger();
			return [
				{ id: Layout.NoPreview, name: i18n('SETTINGS_GENERAL/LABEL_LAYOUT_NO_SPLIT') },
				{ id: Layout.SidePreview, name: i18n('SETTINGS_GENERAL/LABEL_LAYOUT_VERTICAL_SPLIT') },
				{ id: Layout.BottomPreview, name: i18n('SETTINGS_GENERAL/LABEL_LAYOUT_HORIZONTAL_SPLIT') }
			];
		});

		const fReloadLanguageHelper = (saveSettingsStep) => () => {
				this.languageTrigger(saveSettingsStep);
				setTimeout(() => this.languageTrigger(SaveSettingsStep.Idle), 1000);
			};
		addSubscribablesTo(this, {
			language: value => {
				this.languageTrigger(SaveSettingsStep.Animate);
				translatorReload(false, value)
					.then(fReloadLanguageHelper(SaveSettingsStep.TrueResult),
						fReloadLanguageHelper(SaveSettingsStep.FalseResult))
					.then(() => Remote.saveSetting('Language', value));
			},

			editorDefaultType: value => Remote.saveSetting('EditorDefaultType', value,
				settingsSaveHelperSimpleFunction(this.editorDefaultTypeTrigger, this)),

			messagesPerPage: value => Remote.saveSetting('MPP', value,
				settingsSaveHelperSimpleFunction(this.mppTrigger, this)),

			showImages: value => Remote.saveSetting('ShowImages', value ? 1 : 0),

			removeColors: value => {
				MessageUserStore.messagesBodiesDom().innerHTML = '';
				Remote.saveSetting('RemoveColors', value ? 1 : 0);
			},

			useCheckboxesInList: value => Remote.saveSetting('UseCheckboxesInList', value ? 1 : 0),

			enableDesktopNotification: value => Remote.saveSetting('DesktopNotifications', value ? 1 : 0),

			enableSoundNotification: value => Remote.saveSetting('SoundNotification', value ? 1 : 0),
			notificationSound: value => {
				Remote.saveSetting('NotificationSound', value);
				rl.settings.set('NotificationSound', value);
			},

			replySameFolder: value => Remote.saveSetting('ReplySameFolder', value ? 1 : 0),

			useThreads: value => {
				MessageUserStore.list([]);
				Remote.saveSetting('UseThreads', value ? 1 : 0);
			},

			layout: value => {
				MessageUserStore.list([]);
				Remote.saveSetting('Layout', value, settingsSaveHelperSimpleFunction(this.layoutTrigger, this));
			}
		});
	}

	editMainIdentity() {
		const identity = this.identityMain();
		if (identity) {
			showScreenPopup(IdentityPopupView, [identity]);
		}
	}

	testSoundNotification() {
		NotificationUserStore.playSoundNotification(true);
	}

	testSystemNotification() {
		NotificationUserStore.displayDesktopNotification('SnappyMail', 'Test notification');
	}

	selectLanguage() {
		showScreenPopup(LanguagesPopupView, [this.language, this.languages(), LanguageStore.userLanguage()]);
	}
}
