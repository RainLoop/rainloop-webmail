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
		self.checkMailInterval = ko.observable(15).extend({ debounce: 999 });
		self.messageReadDelay = ko.observable(5).extend({ debounce: 999 });

		addObservablesTo(self, {
			viewHTML: 1,
			viewImages: 0,
			viewImagesWhitelist: '',
			removeColors: 0,
			allowStyles: 0,
			collapseBlockquotes: 1,
			maxBlockquotesLevel: 0,
			listInlineAttachments: 0,
			simpleAttachmentsList: 0,
			useCheckboxesInList: 1,
			listGrouped: 0,
			showNextMessage: 0,
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
			requireTLS: 0,
			pgpSign: 0,
			pgpEncrypt: 0,
			allowSpellcheck: 0,

			layout: 1,
			editorDefaultType: 'Html',
			msgDefaultAction: 1
		});

		self.init();

		self.usePreviewPane = koComputable(() => ThemeStore.isMobile() ? 0 : self.layout());

		const toggleLayout = () => {
			const value = self.usePreviewPane();
			$htmlCL.toggle('sm-msgView-side', Layout.SidePreview === value);
			$htmlCL.toggle('sm-msgView-bottom', Layout.BottomPreview === value);
			fireEvent('rl-layout', value);
		};
		self.layout.subscribe(toggleLayout);
		ThemeStore.isMobile.subscribe(toggleLayout);
		toggleLayout();

		let iAutoLogoutTimer;
		self.delayLogout = (() => {
			clearTimeout(iAutoLogoutTimer);
			if (0 < self.autoLogout() && !SettingsGet('accountSignMe')) {
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
		self.checkMailInterval(pInt(SettingsGet('CheckMailInterval')));
		self.messageReadDelay(pInt(SettingsGet('MessageReadDelay')));
		self.autoLogout(pInt(SettingsGet('AutoLogout')));
		self.msgDefaultAction(SettingsGet('MsgDefaultAction'));

		self.viewHTML(SettingsGet('ViewHTML'));
		self.viewImages(SettingsGet('ViewImages'));
		self.viewImagesWhitelist(SettingsGet('ViewImagesWhitelist'));
		self.removeColors(SettingsGet('RemoveColors'));
		self.allowStyles(SettingsGet('AllowStyles'));
		self.collapseBlockquotes(SettingsGet('CollapseBlockquotes'));
		self.maxBlockquotesLevel(SettingsGet('MaxBlockquotesLevel'));
		self.listInlineAttachments(SettingsGet('ListInlineAttachments'));
		self.simpleAttachmentsList(SettingsGet('simpleAttachmentsList'));
		self.useCheckboxesInList(SettingsGet('UseCheckboxesInList'));
		self.listGrouped(SettingsGet('listGrouped'));
		self.showNextMessage(SettingsGet('showNextMessage'));
		self.allowDraftAutosave(SettingsGet('AllowDraftAutosave'));
		self.useThreads(SettingsGet('UseThreads'));
		self.replySameFolder(SettingsGet('ReplySameFolder'));

		self.hideUnsubscribed(SettingsGet('HideUnsubscribed'));
		self.hideDeleted(SettingsGet('HideDeleted'));
		self.showUnreadCount(SettingsGet('ShowUnreadCount'));
		self.unhideKolabFolders(SettingsGet('UnhideKolabFolders'));

		self.requestReadReceipt(SettingsGet('requestReadReceipt'));
		self.requestDsn(SettingsGet('requestDsn'));
		self.requireTLS(SettingsGet('requireTLS'));
		self.pgpSign(SettingsGet('pgpSign'));
		self.pgpEncrypt(SettingsGet('pgpEncrypt'));
		self.allowSpellcheck(SettingsGet('allowSpellcheck'));
	}
};
