import ko from 'ko';
import { koComputable, addObservablesTo } from 'External/ko';

import { Layout } from 'Common/EnumsUser';
import { pInt } from 'Common/Utils';
import { $htmlCL, SettingsGet, fireEvent } from 'Common/Globals';
import { ThemeStore } from 'Stores/Theme';

export const SettingsUserStore = new class {
	constructor() {
		const self = this;

		self.messagesPerPage = ko.observable(25).extend({ debounce: 999 });

		self.messageReadDelay = ko.observable(5).extend({ debounce: 999 });

		addObservablesTo(self, {
			viewHTML: 1,
			showImages: 0,
			removeColors: 0,
			listInlineAttachments: 0,
			simpleAttachmentsList: 0,
			useCheckboxesInList: 1,
			listPerDay: 1,
			allowDraftAutosave: 1,
			useThreads: 0,
			replySameFolder: 0,
			hideUnsubscribed: 0,
			hideDeleted: 1,
			unhideKolabFolders: 0,
			autoLogout: 0,
			showUnreadCount: 0,

			requestReadReceipt: 0,
			requestDsn: 0,
			pgpSign: 0,
			pgpEncrypt: 0,
			allowSpellcheck: 0,

			layout: 1,
			editorDefaultType: 'Html',
			msgDefaultAction: 1
		});

		self.init();

		self.usePreviewPane = koComputable(() => Layout.NoPreview !== self.layout() && !ThemeStore.isMobile());

		const toggleLayout = () => {
			const value = ThemeStore.isMobile() ? Layout.NoPreview : self.layout();
			$htmlCL.toggle('rl-no-preview-pane', Layout.NoPreview === value);
			$htmlCL.toggle('rl-side-preview-pane', Layout.SidePreview === value);
			$htmlCL.toggle('rl-bottom-preview-pane', Layout.BottomPreview === value);
			fireEvent('rl-layout', value);
		};
		self.layout.subscribe(toggleLayout);
		ThemeStore.isMobile.subscribe(toggleLayout);
		toggleLayout();

		let iAutoLogoutTimer;
		self.delayLogout = (() => {
			clearTimeout(iAutoLogoutTimer);
			if (0 < self.autoLogout() && !SettingsGet('AccountSignMe')) {
				iAutoLogoutTimer = setTimeout(
					rl.app.logout,
					self.autoLogout() * 60000
				);
			}
		}).throttle(5000);
	}

	init() {
		const self = this;
		self.editorDefaultType(SettingsGet('EditorDefaultType'));

		self.layout(pInt(SettingsGet('Layout')));
		self.messagesPerPage(pInt(SettingsGet('MessagesPerPage')));
		self.messageReadDelay(pInt(SettingsGet('MessageReadDelay')));
		self.autoLogout(pInt(SettingsGet('AutoLogout')));
		self.msgDefaultAction(SettingsGet('MsgDefaultAction'));

		self.viewHTML(SettingsGet('ViewHTML'));
		self.showImages(SettingsGet('ShowImages'));
		self.removeColors(SettingsGet('RemoveColors'));
		self.listInlineAttachments(SettingsGet('ListInlineAttachments'));
		self.simpleAttachmentsList(SettingsGet('simpleAttachmentsList'));
		self.useCheckboxesInList(SettingsGet('UseCheckboxesInList'));
		self.listPerDay(SettingsGet('listPerDay'));
		self.allowDraftAutosave(SettingsGet('AllowDraftAutosave'));
		self.useThreads(SettingsGet('UseThreads'));
		self.replySameFolder(SettingsGet('ReplySameFolder'));

		self.hideUnsubscribed(SettingsGet('HideUnsubscribed'));
		self.hideDeleted(SettingsGet('HideDeleted'));
		self.showUnreadCount(SettingsGet('ShowUnreadCount'));
		self.unhideKolabFolders(SettingsGet('UnhideKolabFolders'));

		self.requestReadReceipt(SettingsGet('requestReadReceipt'));
		self.requestDsn(SettingsGet('requestDsn'));
		self.pgpSign(SettingsGet('pgpSign'));
		self.pgpEncrypt(SettingsGet('pgpEncrypt'));
		self.allowSpellcheck(SettingsGet('allowSpellcheck'));
	}
};
