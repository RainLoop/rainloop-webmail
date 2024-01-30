import ko from 'ko';
import { koComputable, addObservablesTo } from 'External/ko';

import { LayoutSideView, LayoutBottomView } from 'Common/EnumsUser';
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
			messageNewWindow: 0,
			messageReadAuto: 0,

			requestReadReceipt: 0,
			requestDsn: 0,
			requireTLS: 0,
			pgpSign: 0,
			pgpEncrypt: 0,
			allowSpellcheck: 0,

			layout: 1,
			editorDefaultType: 'Html',
			editorWysiwyg: 'Squire',
			msgDefaultAction: 1
		});

		self.init();

		self.usePreviewPane = koComputable(() => ThemeStore.isMobile() ? 0 : self.layout());

		const toggleLayout = () => {
			const value = self.usePreviewPane();
			$htmlCL.toggle('sm-msgView-side', LayoutSideView === value);
			$htmlCL.toggle('sm-msgView-bottom', LayoutBottomView === value);
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

		[
			'EditorDefaultType',
			'editorWysiwyg',
			'messageNewWindow',
			'messageReadAuto',
			'MsgDefaultAction',
			'ViewHTML',
			'ViewImages',
			'ViewImagesWhitelist',
			'RemoveColors',
			'AllowStyles',
			'CollapseBlockquotes',
			'MaxBlockquotesLevel',
			'ListInlineAttachments',
			'simpleAttachmentsList',
			'UseCheckboxesInList',
			'listGrouped',
			'showNextMessage',
			'AllowDraftAutosave',
			'UseThreads',
			'ReplySameFolder',
			'HideUnsubscribed',
			'HideDeleted',
			'ShowUnreadCount',
			'UnhideKolabFolders',
			'requestReadReceipt',
			'requestDsn',
			'requireTLS',
			'pgpSign',
			'pgpEncrypt',
			'allowSpellcheck'
		].forEach(name => {
			let value = SettingsGet(name);
			name = name[0].toLowerCase() + name.slice(1);
			self[name](value);
		});

		self.layout(pInt(SettingsGet('Layout')));
		self.messagesPerPage(pInt(SettingsGet('MessagesPerPage')));
		self.checkMailInterval(pInt(SettingsGet('CheckMailInterval')));
		self.messageReadDelay(pInt(SettingsGet('MessageReadDelay')));
		self.autoLogout(pInt(SettingsGet('AutoLogout')));
	}
};
