import ko from 'ko';

import { SMAudio } from 'Common/Audio';
import { SaveSettingStatus } from 'Common/Enums';
import { LayoutSideView, LayoutBottomView } from 'Common/EnumsUser';
import { setRefreshFoldersInterval } from 'Common/Folders';
import { Settings, SettingsGet } from 'Common/Globals';
import { WYSIWYGS } from 'Common/HtmlEditor';
import { addSubscribablesTo, addComputablesTo } from 'External/ko';
import { i18n, translateTrigger, translatorReload, convertLangName } from 'Common/Translator';
import { editIdentity } from 'Common/UtilsUser';

import { AbstractViewSettings } from 'Knoin/AbstractViews';
import { showScreenPopup } from 'Knoin/Knoin';

import { AppUserStore } from 'Stores/User/App';
import { LanguageStore } from 'Stores/Language';
import { FolderUserStore } from 'Stores/User/Folder';
import { SettingsUserStore } from 'Stores/User/Settings';
import { IdentityUserStore } from 'Stores/User/Identity';
import { NotificationUserStore } from 'Stores/User/Notification';
import { MessagelistUserStore } from 'Stores/User/Messagelist';

import Remote from 'Remote/User/Fetch';

import { LanguagesPopupView } from 'View/Popup/Languages';

export class UserSettingsGeneral extends AbstractViewSettings {
	constructor() {
		super();

		this.mailto = ko.observable(!!navigator.registerProtocolHandler);

		this.language = LanguageStore.language;
		this.languages = LanguageStore.languages;
		this.hourCycle = LanguageStore.hourCycle;

		this.soundNotification = SMAudio.notifications;
		this.notificationSound = ko.observable(SettingsGet('NotificationSound'));
		this.notificationSounds = ko.observableArray(SettingsGet('newMailSounds'));

		this.minRefreshInterval = SettingsGet('minRefreshInterval');

		this.desktopNotifications = NotificationUserStore.enabled;
		this.isDesktopNotificationAllowed = NotificationUserStore.allowed;

		const i18nSort = s => i18n('MESSAGE_LIST/SORT_'+s);
		this.sortSupported = FolderUserStore.hasCapability('SORT');
		this.sortOptions = [
			{
				value: '',
				text: i18nSort('DATE_DESC')
			},
			{
				value: 'DATE',
				text: i18nSort('DATE_ASC')
			},
			{
				value: 'FROM',
				text: i18nSort('FROM_ASC')
			},
			{
				value: 'REVERSE FROM',
				text: i18nSort('FROM_DESC')
			},
			{
				value: 'REVERSE SIZE',
				text: i18nSort('SIZE_DESC')
			},
			{
				value: 'SIZE',
				text: i18nSort('SIZE_ASC')
			},
			{
				value: 'SUBJECT',
				text: i18nSort('SUBJECT_ASC')
			},
			{
				value: 'REVERSE SUBJECT',
				text: i18nSort('SUBJECT_DESC')
			},
			{
				value: 'REVERSE ARRIVAL',
				text: i18nSort('ARRIVAL_DESC')
			},
			{
				value: 'ARRIVAL',
				text: i18nSort('ARRIVAL_ASC')
			}
		];

		this.threadsAllowed = AppUserStore.threadsAllowed;
		// 'THREAD=REFS', 'THREAD=REFERENCES', 'THREAD=ORDEREDSUBJECT'
		this.threadAlgorithms = ko.observableArray();
		FolderUserStore.capabilities.forEach(capa =>
			capa.startsWith('THREAD=') && this.threadAlgorithms.push(capa.slice(7))
		);
		this.threadAlgorithms.sort((a, b) => a.length - b.length);

		['defaultSort', 'useThreads', 'threadAlgorithm',
		 // These use addSetting()
		 'layout', 'messageReadDelay', 'messagesPerPage', 'checkMailInterval',
		 'editorDefaultType', 'editorWysiwyg', 'msgDefaultAction', 'maxBlockquotesLevel', 'minFontSize',
		 // These are in addSettings()
		 'requestReadReceipt', 'requestDsn', 'requireTLS', 'pgpSign', 'pgpEncrypt',
		 'viewHTML', 'viewImages', 'viewImagesWhitelist', 'removeColors', 'allowStyles', 'allowDraftAutosave',
		 'hideDeleted', 'listInlineAttachments', 'simpleAttachmentsList', 'collapseBlockquotes',
		 'useCheckboxesInList', 'listGrouped', 'replySameFolder', 'allowSpellcheck',
		 'messageReadAuto', 'showNextMessage', 'messageNewWindow', 'markdown'
		].forEach(name => this[name] = SettingsUserStore[name]);

		this.allowLanguagesOnSettings = !!SettingsGet('allowLanguagesOnSettings');

		this.languageTrigger = ko.observable(SaveSettingStatus.Idle);

		this.identities = IdentityUserStore;

		this.wysiwygs = WYSIWYGS;

		addComputablesTo(this, {
			languageFullName: () => convertLangName(this.language()),

			identityMainDesc: () => {
				const identity = IdentityUserStore.main();
				return identity ? identity.toString() : '---';
			},

			editorDefaultTypes: () => {
				translateTrigger();
				return [
					{ id: 'Html', name: i18n('SETTINGS_GENERAL/EDITOR_HTML') },
					{ id: 'Plain', name: i18n('SETTINGS_GENERAL/EDITOR_PLAIN') }
				];
			},

			hasWysiwygs: () => 1 < WYSIWYGS().length,

			msgDefaultActions: () => {
				translateTrigger();
				return [
					{ id: 1, name: i18n('MESSAGE/BUTTON_REPLY') }, // ComposeType.Reply,
					{ id: 2, name: i18n('MESSAGE/BUTTON_REPLY_ALL') } // ComposeType.ReplyAll
				];
			},

			layoutTypes: () => {
				translateTrigger();
				return [
					{ id: 0, name: i18n('SETTINGS_GENERAL/LAYOUT_NO_SPLIT') },
					{ id: LayoutSideView, name: i18n('SETTINGS_GENERAL/LAYOUT_VERTICAL_SPLIT') },
					{ id: LayoutBottomView, name: i18n('SETTINGS_GENERAL/LAYOUT_HORIZONTAL_SPLIT') }
				];
			}
		});

		this.addSetting('EditorDefaultType');
		this.addSetting('editorWysiwyg');
		this.addSetting('MsgDefaultAction');
		this.addSetting('MessageReadDelay');
		this.addSetting('MessagesPerPage');
		this.addSetting('CheckMailInterval');
		this.addSetting('Layout');
		this.addSetting('MaxBlockquotesLevel');
		this.addSetting('minFontSize');
		this.addSetting('defaultSort');

		this.addSettings([
			'requestReadReceipt', 'requestDsn', 'requireTLS', 'pgpSign', 'pgpEncrypt',
			'ViewHTML', 'ViewImages', 'ViewImagesWhitelist', 'RemoveColors', 'AllowStyles', 'AllowDraftAutosave',
			'HideDeleted', 'ListInlineAttachments', 'simpleAttachmentsList', 'CollapseBlockquotes',
			'UseCheckboxesInList', 'listGrouped', 'ReplySameFolder', 'allowSpellcheck',
			'messageReadAuto', 'showNextMessage', 'messageNewWindow', 'markdown',
			'DesktopNotifications', 'SoundNotification']);

		const fReloadLanguageHelper = (saveSettingsStep) => () => {
				this.languageTrigger(saveSettingsStep);
				setTimeout(() => this.languageTrigger(SaveSettingStatus.Idle), 1000);
			};

		addSubscribablesTo(this, {
			language: value => {
				this.languageTrigger(SaveSettingStatus.Saving);
				translatorReload(value)
					.then(fReloadLanguageHelper(SaveSettingStatus.Success), fReloadLanguageHelper(SaveSettingStatus.Failed))
					.then(() => Remote.saveSetting('language', value));
			},

			hourCycle: value =>
				Remote.saveSetting('hourCycle', value),

			notificationSound: value => {
				Remote.saveSetting('NotificationSound', value);
				Settings.set('NotificationSound', value);
			},

			useThreads: value => {
				MessagelistUserStore([]);
				Remote.saveSetting('UseThreads', value);
			},

			threadAlgorithm: value => {
				MessagelistUserStore([]);
				Remote.saveSetting('threadAlgorithm', value);
			},

			checkMailInterval: () => {
				setRefreshFoldersInterval(SettingsUserStore.checkMailInterval());
			}
		});
	}

	editMainIdentity() {
		editIdentity(IdentityUserStore.main());
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

	registerMailto() {
		console.log(`mailto = ${location.protocol}//${location.host}${location.pathname}?mailto`);
		navigator.registerProtocolHandler(
			'mailto',
			`${location.protocol}//${location.host}${location.pathname}?mailto&to=%s`,
			(SettingsGet('title') || 'SnappyMail')
		);
		alert(i18n('GLOBAL/DONE'));
		this.mailto(0);
	}
}
