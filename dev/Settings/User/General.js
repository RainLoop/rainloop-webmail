import ko from 'ko';

import { SMAudio } from 'Common/Audio';
import { SaveSettingsStep } from 'Common/Enums';
import { EditorDefaultType, Layout } from 'Common/EnumsUser';
import { Settings, SettingsGet } from 'Common/Globals';
import { isArray } from 'Common/Utils';
import { addSubscribablesTo, addComputablesTo } from 'External/ko';
import { i18n, trigger as translatorTrigger, translatorReload, convertLangName } from 'Common/Translator';

import { AbstractViewSettings } from 'Knoin/AbstractViews';
import { showScreenPopup } from 'Knoin/Knoin';

import { AppUserStore } from 'Stores/User/App';
import { LanguageStore } from 'Stores/Language';
import { SettingsUserStore } from 'Stores/User/Settings';
import { IdentityUserStore } from 'Stores/User/Identity';
import { NotificationUserStore } from 'Stores/User/Notification';
import { MessageUserStore } from 'Stores/User/Message';
import { MessagelistUserStore } from 'Stores/User/Messagelist';

import Remote from 'Remote/User/Fetch';

import { IdentityPopupView } from 'View/Popup/Identity';
import { LanguagesPopupView } from 'View/Popup/Languages';

export class UserSettingsGeneral extends AbstractViewSettings {
	constructor() {
		super();

		this.language = LanguageStore.language;
		this.languages = LanguageStore.languages;
		this.messageReadDelay = SettingsUserStore.messageReadDelay;
		this.messagesPerPage = SettingsUserStore.messagesPerPage;

		this.editorDefaultType = SettingsUserStore.editorDefaultType;
		this.layout = SettingsUserStore.layout;

		this.soundNotification = SMAudio.notifications;
		this.notificationSound = ko.observable(SettingsGet('NotificationSound'));
		this.notificationSounds = ko.observableArray(SettingsGet('NewMailSounds'));

		this.desktopNotification = NotificationUserStore.enabled;
		this.isDesktopNotificationAllowed = NotificationUserStore.allowed;

		this.viewHTML = SettingsUserStore.viewHTML;
		this.showImages = SettingsUserStore.showImages;
		this.removeColors = SettingsUserStore.removeColors;
		this.useCheckboxesInList = SettingsUserStore.useCheckboxesInList;
		this.threadsAllowed = AppUserStore.threadsAllowed;
		this.useThreads = SettingsUserStore.useThreads;
		this.replySameFolder = SettingsUserStore.replySameFolder;
		this.allowLanguagesOnSettings = !!SettingsGet('AllowLanguagesOnSettings');

		this.languageTrigger = ko.observable(SaveSettingsStep.Idle);

		this.identities = IdentityUserStore;

		addComputablesTo(this, {
			languageFullName: () => convertLangName(this.language()),

			identityMain: () => {
				const list = this.identities();
				return isArray(list) ? list.find(item => item && !item.id()) : null;
			},

			identityMainDesc: () => {
				const identity = this.identityMain();
				return identity ? identity.formattedName() : '---';
			},

			editorDefaultTypes: () => {
				translatorTrigger();
				return [
					{ id: EditorDefaultType.Html, name: i18n('SETTINGS_GENERAL/LABEL_EDITOR_HTML') },
					{ id: EditorDefaultType.Plain, name: i18n('SETTINGS_GENERAL/LABEL_EDITOR_PLAIN') }
				];
			},

			layoutTypes: () => {
				translatorTrigger();
				return [
					{ id: Layout.NoPreview, name: i18n('SETTINGS_GENERAL/LABEL_LAYOUT_NO_SPLIT') },
					{ id: Layout.SidePreview, name: i18n('SETTINGS_GENERAL/LABEL_LAYOUT_VERTICAL_SPLIT') },
					{ id: Layout.BottomPreview, name: i18n('SETTINGS_GENERAL/LABEL_LAYOUT_HORIZONTAL_SPLIT') }
				];
			}
		});

		this.addSetting('EditorDefaultType');
		this.addSetting('MessageReadDelay');
		this.addSetting('MessagesPerPage');
		this.addSetting('Layout', () => MessagelistUserStore([]));

		this.addSettings(['ViewHTML', 'ShowImages', 'UseCheckboxesInList', 'ReplySameFolder',
			'DesktopNotifications', 'SoundNotification']);

		const fReloadLanguageHelper = (saveSettingsStep) => () => {
				this.languageTrigger(saveSettingsStep);
				setTimeout(() => this.languageTrigger(SaveSettingsStep.Idle), 1000);
			};

		addSubscribablesTo(this, {
			language: value => {
				this.languageTrigger(SaveSettingsStep.Animate);
				translatorReload(false, value)
					.then(fReloadLanguageHelper(SaveSettingsStep.TrueResult), fReloadLanguageHelper(SaveSettingsStep.FalseResult))
					.then(() => Remote.saveSetting('Language', value));
			},

			removeColors: value => {
				let dom = MessageUserStore.bodiesDom();
				if (dom) {
					dom.innerHTML = '';
				}
				Remote.saveSetting('RemoveColors', value);
			},

			notificationSound: value => {
				Remote.saveSetting('NotificationSound', value);
				Settings.set('NotificationSound', value);
			},

			useThreads: value => {
				MessagelistUserStore([]);
				Remote.saveSetting('UseThreads', value);
			}
		});
	}

	editMainIdentity() {
		const identity = this.identityMain();
		identity && showScreenPopup(IdentityPopupView, [identity]);
	}

	testSoundNotification() {
		SMAudio.playNotification(true);
	}

	testSystemNotification() {
		NotificationUserStore.display('SnappyMail', 'Test notification');
	}

	selectLanguage() {
		showScreenPopup(LanguagesPopupView, [this.language, this.languages(), LanguageStore.userLanguage()]);
	}
}
