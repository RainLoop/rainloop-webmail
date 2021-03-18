import ko from 'ko';

import { MESSAGES_PER_PAGE_VALUES } from 'Common/Consts';
import { Layout, EditorDefaultType } from 'Common/EnumsUser';
import { pInt, addObservablesTo } from 'Common/Utils';
import { $htmlCL, SettingsGet } from 'Common/Globals';
import { ThemeStore } from 'Stores/Theme';

export const SettingsUserStore = new class {
	constructor() {
		this.layout = ko
			.observable(pInt(SettingsGet('Layout')))
			.extend({ limitedList: [Layout.SidePreview, Layout.BottomPreview, Layout.NoPreview] });

		this.editorDefaultType = ko.observable(SettingsGet('EditorDefaultType')).extend({
			limitedList: [
				EditorDefaultType.Html,
				EditorDefaultType.Plain,
				EditorDefaultType.HtmlForced,
				EditorDefaultType.PlainForced
			]
		});

		this.messagesPerPage = ko.observable(SettingsGet('MPP')).extend({ limitedList: MESSAGES_PER_PAGE_VALUES });

		addObservablesTo(this, {
			showImages: !!SettingsGet('ShowImages'),
			removeColors: !!SettingsGet('RemoveColors'),
			useCheckboxesInList: !!(ThemeStore.isMobile() || SettingsGet('UseCheckboxesInList')),
			allowDraftAutosave: !!SettingsGet('AllowDraftAutosave'),
			useThreads: !!SettingsGet('UseThreads'),
			replySameFolder: !!SettingsGet('ReplySameFolder'),

			autoLogout: pInt(SettingsGet('AutoLogout'))
		});

		this.usePreviewPane = ko.computed(() => Layout.NoPreview !== this.layout() && !ThemeStore.isMobile());

		this.layout.subscribe(value => {
			$htmlCL.toggle('rl-no-preview-pane', Layout.NoPreview === value);
			$htmlCL.toggle('rl-side-preview-pane', Layout.SidePreview === value);
			$htmlCL.toggle('rl-bottom-preview-pane', Layout.BottomPreview === value);
			dispatchEvent(new CustomEvent('rl-layout', {detail:value}));
		});

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
};
