import window from 'window';
import ko from 'ko';

import { MESSAGES_PER_PAGE, MESSAGES_PER_PAGE_VALUES } from 'Common/Consts';
import { Layout, EditorDefaultType, Magics } from 'Common/Enums';
import { $html } from 'Common/Globals';
import { pInt } from 'Common/Utils';
import * as Events from 'Common/Events';

import * as Settings from 'Storage/Settings';

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

		this.autoLogout = ko.observable(Magics.Time30mInMin);

		this.computers();
		this.subscribers();
	}

	computers() {
		this.usePreviewPane = ko.computed(() => Layout.NoPreview !== this.layout());
	}

	subscribers() {
		this.layout.subscribe((value) => {
			$html.toggleClass('rl-no-preview-pane', Layout.NoPreview === value);
			$html.toggleClass('rl-side-preview-pane', Layout.SidePreview === value);
			$html.toggleClass('rl-bottom-preview-pane', Layout.BottomPreview === value);
			Events.pub('layout', [value]);
		});
	}

	populate() {
		this.layout(pInt(Settings.settingsGet('Layout')));
		this.editorDefaultType(Settings.settingsGet('EditorDefaultType'));

		this.autoLogout(pInt(Settings.settingsGet('AutoLogout')));
		this.messagesPerPage(Settings.settingsGet('MPP'));

		this.showImages(!!Settings.settingsGet('ShowImages'));
		this.useCheckboxesInList(!!Settings.settingsGet('UseCheckboxesInList'));
		this.allowDraftAutosave(!!Settings.settingsGet('AllowDraftAutosave'));
		this.useThreads(!!Settings.settingsGet('UseThreads'));
		this.replySameFolder(!!Settings.settingsGet('ReplySameFolder'));

		Events.sub('rl.auto-logout-refresh', () => {
			window.clearTimeout(this.iAutoLogoutTimer);
			if (0 < this.autoLogout() && !Settings.settingsGet('AccountSignMe')) {
				this.iAutoLogoutTimer = window.setTimeout(() => {
					Events.pub('rl.auto-logout');
				}, this.autoLogout() * Magics.Time1m);
			}
		});

		Events.pub('rl.auto-logout-refresh');
	}
}

export default new SettingsUserStore();
