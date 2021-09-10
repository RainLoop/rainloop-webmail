import ko from 'ko';

import { Layout, EditorDefaultType } from 'Common/EnumsUser';
import { pInt, addObservablesTo } from 'Common/Utils';
import { $htmlCL, SettingsGet } from 'Common/Globals';
import { ThemeStore } from 'Stores/Theme';

export const SettingsUserStore = new class {
	constructor() {
		this.layout = ko
			.observable(pInt(SettingsGet('Layout')))
			.extend({ limitedList: Object.values(Layout) });

		this.editorDefaultType = ko.observable(SettingsGet('EditorDefaultType')).extend({
			limitedList: [
				EditorDefaultType.Html,
				EditorDefaultType.Plain,
				EditorDefaultType.HtmlForced,
				EditorDefaultType.PlainForced
			]
		});

		this.messagesPerPage = ko.observable(pInt(SettingsGet('MPP'))).extend({ debounce: 999 });

		this.messageReadDelay = ko.observable(pInt(SettingsGet('MessageReadDelay'))).extend({ debounce: 999 });

		addObservablesTo(this, {
			showImages: !!SettingsGet('ShowImages'),
			removeColors: !!SettingsGet('RemoveColors'),
			useCheckboxesInList: !!(ThemeStore.isMobile() || SettingsGet('UseCheckboxesInList')),
			allowDraftAutosave: !!SettingsGet('AllowDraftAutosave'),
			useThreads: !!SettingsGet('UseThreads'),
			replySameFolder: !!SettingsGet('ReplySameFolder'),
			hideUnsubscribed: !!SettingsGet('HideUnsubscribed'),
			autoLogout: pInt(SettingsGet('AutoLogout'))
		});

		this.usePreviewPane = ko.computed(() => Layout.NoPreview !== this.layout() && !ThemeStore.isMobile());

		const toggleLayout = () => {
			const value = ThemeStore.isMobile() ? Layout.NoPreview : this.layout();
			$htmlCL.toggle('rl-no-preview-pane', Layout.NoPreview === value);
			$htmlCL.toggle('rl-side-preview-pane', Layout.SidePreview === value);
			$htmlCL.toggle('rl-bottom-preview-pane', Layout.BottomPreview === value);
			dispatchEvent(new CustomEvent('rl-layout', {detail:value}));
		};
		this.layout.subscribe(toggleLayout);
		ThemeStore.isMobile.subscribe(toggleLayout);
		toggleLayout();

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
