import ko from 'ko';
import { koComputable } from 'External/ko';

import { Layout, EditorDefaultType } from 'Common/EnumsUser';
import { pInt, addObservablesTo } from 'Common/Utils';
import { $htmlCL, SettingsGet } from 'Common/Globals';
import { ThemeStore } from 'Stores/Theme';

export const SettingsUserStore = new class {
	constructor() {
		const self = this;

		self.layout = ko
			.observable(1)
			.extend({ limitedList: Object.values(Layout) });

		self.editorDefaultType = ko.observable('Html').extend({
			limitedList: [
				EditorDefaultType.Html,
				EditorDefaultType.Plain,
				EditorDefaultType.HtmlForced,
				EditorDefaultType.PlainForced
			]
		});

		self.messagesPerPage = ko.observable(25).extend({ debounce: 999 });

		self.messageReadDelay = ko.observable(5).extend({ debounce: 999 });

		addObservablesTo(self, {
			viewHTML: 1,
			showImages: 0,
			removeColors: 0,
			useCheckboxesInList: 1,
			allowDraftAutosave: 1,
			useThreads: 0,
			replySameFolder: 0,
			hideUnsubscribed: 0,
			autoLogout: 0
		});

		self.init();

		self.usePreviewPane = koComputable(() => Layout.NoPreview !== self.layout() && !ThemeStore.isMobile());

		const toggleLayout = () => {
			const value = ThemeStore.isMobile() ? Layout.NoPreview : self.layout();
			$htmlCL.toggle('rl-no-preview-pane', Layout.NoPreview === value);
			$htmlCL.toggle('rl-side-preview-pane', Layout.SidePreview === value);
			$htmlCL.toggle('rl-bottom-preview-pane', Layout.BottomPreview === value);
			dispatchEvent(new CustomEvent('rl-layout', {detail:value}));
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

		self.viewHTML(SettingsGet('ViewHTML'));
		self.showImages(SettingsGet('ShowImages'));
		self.removeColors(SettingsGet('RemoveColors'));
		self.useCheckboxesInList(SettingsGet('UseCheckboxesInList'));
		self.allowDraftAutosave(SettingsGet('AllowDraftAutosave'));
		self.useThreads(SettingsGet('UseThreads'));
		self.replySameFolder(SettingsGet('ReplySameFolder'));

		self.hideUnsubscribed(SettingsGet('HideUnsubscribed'));
	}
};
