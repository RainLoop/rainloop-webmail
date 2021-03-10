import ko from 'ko';

import { MESSAGES_PER_PAGE_VALUES } from 'Common/Consts';
import { Layout, EditorDefaultType } from 'Common/EnumsUser';
import { pInt } from 'Common/Utils';
import { $htmlCL, SettingsGet } from 'Common/Globals';
import { ThemeStore } from 'Stores/Theme';

class SettingsUserStore {
	constructor() {
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

		this.messagesPerPage = ko.observable(20).extend({ limitedList: MESSAGES_PER_PAGE_VALUES });

		ko.addObservablesTo(this, {
			showImages: false,
			removeColors: false,
			useCheckboxesInList: true,
			allowDraftAutosave: true,
			useThreads: false,
			replySameFolder: false,

			autoLogout: 30
		});

		this.usePreviewPane = ko.computed(() => Layout.NoPreview !== this.layout() && !ThemeStore.isMobile());

		this.subscribers();

		let iAutoLogoutTimer;
		this.delayLogout = (() => {
			clearTimeout(iAutoLogoutTimer);
			if (0 < this.autoLogout() && !SettingsGet('AccountSignMe')) {
				iAutoLogoutTimer = setTimeout(
					rl.app.logout,
					this.autoLogout() * 60000
				);
			}
		}).throttle(5000);
	}

	subscribers() {
		this.layout.subscribe(value => {
			$htmlCL.toggle('rl-no-preview-pane', Layout.NoPreview === value);
			$htmlCL.toggle('rl-side-preview-pane', Layout.SidePreview === value);
			$htmlCL.toggle('rl-bottom-preview-pane', Layout.BottomPreview === value);
			dispatchEvent(new CustomEvent('rl-layout', {detail:value}));
		});
	}

	populate() {
		this.layout(pInt(SettingsGet('Layout')));
		this.editorDefaultType(SettingsGet('EditorDefaultType'));

		this.autoLogout(pInt(SettingsGet('AutoLogout')));
		this.messagesPerPage(SettingsGet('MPP'));

		this.showImages(!!SettingsGet('ShowImages'));
		this.removeColors(!!SettingsGet('RemoveColors'));
		this.useCheckboxesInList(!!(ThemeStore.isMobile() || SettingsGet('UseCheckboxesInList')));
		this.allowDraftAutosave(!!SettingsGet('AllowDraftAutosave'));
		this.useThreads(!!SettingsGet('UseThreads'));
		this.replySameFolder(!!SettingsGet('ReplySameFolder'));

		this.delayLogout();
	}
}

export default new SettingsUserStore();
