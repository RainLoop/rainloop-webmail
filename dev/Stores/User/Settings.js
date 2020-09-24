import ko from 'ko';

import { MESSAGES_PER_PAGE, MESSAGES_PER_PAGE_VALUES } from 'Common/Consts';
import { Layout, EditorDefaultType } from 'Common/Enums';
import { pInt } from 'Common/Utils';

class SettingsUserStore {
	constructor() {
		this.iAutoLogoutTimer = 0;

		this.layout = ko
			.observable(Layout.SidePreview)
			.extend({ limitedList: [Layout.SidePreview, Layout.BottomPreview, Layout.NoPreview] });

		this.editorDefaultType = ko.observable(EditorDefaultType.Html).extend({
			limitedList: [
				EditorDefaultType.Html,
				EditorDefaultType.Plain,
				EditorDefaultType.HtmlForced,
				EditorDefaultType.PlainForced
			]
		});

		this.messagesPerPage = ko.observable(MESSAGES_PER_PAGE).extend({ limitedList: MESSAGES_PER_PAGE_VALUES });

		this.showImages = ko.observable(false);
		this.useCheckboxesInList = ko.observable(true);
		this.allowDraftAutosave = ko.observable(true);
		this.useThreads = ko.observable(false);
		this.replySameFolder = ko.observable(false);

		this.autoLogout = ko.observable(30);

		this.usePreviewPane = ko.computed(() => Layout.NoPreview !== this.layout());

		this.subscribers();
	}

	subscribers() {
		const htmlCL = document.documentElement.classList;
		this.layout.subscribe(value => {
			htmlCL.toggle('rl-no-preview-pane', Layout.NoPreview === value);
			htmlCL.toggle('rl-side-preview-pane', Layout.SidePreview === value);
			htmlCL.toggle('rl-bottom-preview-pane', Layout.BottomPreview === value);
			dispatchEvent(new CustomEvent('rl-layout', {detail:value}));
		});
	}

	populate() {
		const settingsGet = rl.settings.get;
		this.layout(pInt(settingsGet('Layout')));
		this.editorDefaultType(settingsGet('EditorDefaultType'));

		this.autoLogout(pInt(settingsGet('AutoLogout')));
		this.messagesPerPage(settingsGet('MPP'));

		this.showImages(!!settingsGet('ShowImages'));
		this.useCheckboxesInList(!!settingsGet('UseCheckboxesInList'));
		this.allowDraftAutosave(!!settingsGet('AllowDraftAutosave'));
		this.useThreads(!!settingsGet('UseThreads'));
		this.replySameFolder(!!settingsGet('ReplySameFolder'));

		const refresh = () => {
			clearTimeout(this.iAutoLogoutTimer);
			if (0 < this.autoLogout() && !settingsGet('AccountSignMe')) {
				this.iAutoLogoutTimer = setTimeout(() =>
					dispatchEvent(new CustomEvent('rl.auto-logout'))
				, this.autoLogout() * 60000);
			}
		};
		addEventListener('rl.auto-logout-refresh', refresh);
		refresh();
	}
}

export default new SettingsUserStore();
