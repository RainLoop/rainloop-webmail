import _ from '_';
import ko from 'ko';

import { MESSAGES_PER_PAGE_VALUES } from 'Common/Consts';
import { bAnimationSupported } from 'Common/Globals';

import { SaveSettingsStep, Magics, EditorDefaultType, Layout } from 'Common/Enums';

import { settingsSaveHelperSimpleFunction, convertLangName, isArray, timeOutAction, boolToAjax } from 'Common/Utils';

import { i18n, trigger as translatorTrigger, reload as translatorReload } from 'Common/Translator';

import { showScreenPopup } from 'Knoin/Knoin';

import AppStore from 'Stores/User/App';
import LanguageStore from 'Stores/Language';
import SettingsStore from 'Stores/User/Settings';
import IdentityStore from 'Stores/User/Identity';
import NotificationStore from 'Stores/User/Notification';
import MessageStore from 'Stores/User/Message';

import Remote from 'Remote/User/Ajax';

class GeneralUserSettings {
	constructor() {
		this.language = LanguageStore.language;
		this.languages = LanguageStore.languages;
		this.messagesPerPage = SettingsStore.messagesPerPage;
		this.messagesPerPageArray = MESSAGES_PER_PAGE_VALUES;

		this.editorDefaultType = SettingsStore.editorDefaultType;
		this.layout = SettingsStore.layout;
		this.usePreviewPane = SettingsStore.usePreviewPane;

		this.soundNotificationIsSupported = NotificationStore.soundNotificationIsSupported;
		this.enableSoundNotification = NotificationStore.enableSoundNotification;

		this.enableDesktopNotification = NotificationStore.enableDesktopNotification;
		this.isDesktopNotificationSupported = NotificationStore.isDesktopNotificationSupported;
		this.isDesktopNotificationDenied = NotificationStore.isDesktopNotificationDenied;

		this.showImages = SettingsStore.showImages;
		this.useCheckboxesInList = SettingsStore.useCheckboxesInList;
		this.threadsAllowed = AppStore.threadsAllowed;
		this.useThreads = SettingsStore.useThreads;
		this.replySameFolder = SettingsStore.replySameFolder;
		this.allowLanguagesOnSettings = AppStore.allowLanguagesOnSettings;

		this.languageFullName = ko.computed(() => convertLangName(this.language()));
		this.languageTrigger = ko.observable(SaveSettingsStep.Idle).extend({ throttle: Magics.Time100ms });

		this.mppTrigger = ko.observable(SaveSettingsStep.Idle);
		this.editorDefaultTypeTrigger = ko.observable(SaveSettingsStep.Idle);
		this.layoutTrigger = ko.observable(SaveSettingsStep.Idle);

		this.isAnimationSupported = bAnimationSupported;

		this.identities = IdentityStore.identities;

		this.identityMain = ko.computed(() => {
			const list = this.identities();
			return isArray(list) ? _.find(list, (item) => item && '' === item.id()) : null;
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
			showScreenPopup(require('View/Popup/Identity'), [identity]);
		}
	}

	testSoundNotification() {
		NotificationStore.playSoundNotification(true);
	}

	onBuild() {
		_.delay(() => {
			const f0 = settingsSaveHelperSimpleFunction(this.editorDefaultTypeTrigger, this),
				f1 = settingsSaveHelperSimpleFunction(this.mppTrigger, this),
				f2 = settingsSaveHelperSimpleFunction(this.layoutTrigger, this),
				fReloadLanguageHelper = (saveSettingsStep) => () => {
					this.languageTrigger(saveSettingsStep);
					_.delay(() => this.languageTrigger(SaveSettingsStep.Idle), Magics.Time1s);
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
			this.showImages.subscribe(Remote.saveSettingsHelper('ShowImages', boolToAjax));

			this.useCheckboxesInList.subscribe(Remote.saveSettingsHelper('UseCheckboxesInList', boolToAjax));

			this.enableDesktopNotification.subscribe((value) => {
				timeOutAction(
					'SaveDesktopNotifications',
					() => {
						Remote.saveSettings(null, {
							'DesktopNotifications': boolToAjax(value)
						});
					},
					Magics.Time3s
				);
			});

			this.enableSoundNotification.subscribe((value) => {
				timeOutAction(
					'SaveSoundNotification',
					() => {
						Remote.saveSettings(null, {
							'SoundNotification': boolToAjax(value)
						});
					},
					Magics.Time3s
				);
			});

			this.replySameFolder.subscribe((value) => {
				timeOutAction(
					'SaveReplySameFolder',
					() => {
						Remote.saveSettings(null, {
							'ReplySameFolder': boolToAjax(value)
						});
					},
					Magics.Time3s
				);
			});

			this.useThreads.subscribe((value) => {
				MessageStore.messageList([]);
				Remote.saveSettings(null, {
					'UseThreads': boolToAjax(value)
				});
			});

			this.layout.subscribe((value) => {
				MessageStore.messageList([]);
				Remote.saveSettings(f2, {
					'Layout': value
				});
			});
		}, Magics.Time50ms);
	}

	onShow() {
		this.enableDesktopNotification.valueHasMutated();
	}

	selectLanguage() {
		showScreenPopup(require('View/Popup/Languages'), [this.language, this.languages(), LanguageStore.userLanguage()]);
	}
}

export { GeneralUserSettings, GeneralUserSettings as default };
