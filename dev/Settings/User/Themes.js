import { addObservablesTo } from 'External/ko';

import { SaveSettingStatus, UploadErrorCode } from 'Common/Enums';
import { themePreviewLink, serverRequest } from 'Common/Links';
import { i18n } from 'Common/Translator';
import { SettingsCapa } from 'Common/Globals';

import { ThemeStore, convertThemeName, changeTheme } from 'Stores/Theme';
import { addSubscribablesTo } from 'External/ko';

import Remote from 'Remote/User/Fetch';

const themeBackground = {
	name: ThemeStore.userBackgroundName,
	hash: ThemeStore.userBackgroundHash
};
addObservablesTo(themeBackground, {
	uploaderButton: null,
	loading: false,
	error: ''
});

export class UserSettingsThemes /*extends AbstractViewSettings*/ {
	constructor() {
		this.fontSansSerif = ThemeStore.fontSansSerif;
		this.fontSerif = ThemeStore.fontSerif;
		this.fontMono = ThemeStore.fontMono;
		addSubscribablesTo(ThemeStore, {
			fontSansSerif: value => {
				Remote.saveSettings(null, {
					fontSansSerif: value
				});
			},
			fontSerif: value => {
				Remote.saveSettings(null, {
					fontSerif: value
				});
			},
			fontMono: value => {
				Remote.saveSettings(null, {
					fontMono: value
				});
			}
		});

		this.theme = ThemeStore.theme;
		this.themes = ThemeStore.themes;
		this.themesObjects = ko.observableArray();

		themeBackground.enabled = SettingsCapa('UserBackground');
		this.background = themeBackground;

		this.themeTrigger = ko.observable(SaveSettingStatus.Idle).extend({ debounce: 100 });

		ThemeStore.theme.subscribe(value => {
			this.themesObjects.forEach(theme => theme.selected(value === theme.name));

			changeTheme(value, this.themeTrigger);

			Remote.saveSettings(null, {
				Theme: value
			});
		});
	}

	setTheme(theme) {
		ThemeStore.theme(theme.name);
	}

	onBuild() {
		const currentTheme = ThemeStore.theme();

		this.themesObjects(
			ThemeStore.themes.map(theme => ({
				name: theme,
				nameDisplay: convertThemeName(theme),
				selected: ko.observable(theme === currentTheme),
				themePreviewSrc: themePreviewLink(theme)
			}))
		);

		// initUploader

		if (themeBackground.uploaderButton() && themeBackground.enabled) {
			const oJua = new Jua({
				action: serverRequest('UploadBackground'),
				limit: 1,
				clickElement: themeBackground.uploaderButton()
			});

			oJua
				.on('onStart', () => {
					themeBackground.loading(true);
					themeBackground.error('');
				})
				.on('onComplete', (id, result, data) => {
					themeBackground.loading(false);
					themeBackground.name(data?.Result?.name || '');
					themeBackground.hash(data?.Result?.hash || '');
					if (!themeBackground.name() || !themeBackground.hash()) {
						let errorMsg = '';
						if (data.ErrorCode) {
							switch (data.ErrorCode) {
								case UploadErrorCode.FileIsTooBig:
									errorMsg = i18n('SETTINGS_THEMES/ERROR_FILE_IS_TOO_BIG');
									break;
								case UploadErrorCode.FileType:
									errorMsg = i18n('SETTINGS_THEMES/ERROR_FILE_TYPE_ERROR');
									break;
								// no default
							}
						}

						themeBackground.error(errorMsg || data.ErrorMessage || i18n('SETTINGS_THEMES/ERROR_UNKNOWN'));
					}
				});
		}
	}

	onShow() {
		themeBackground.error('');
	}

	clearBackground() {
		if (themeBackground.enabled) {
			Remote.request('ClearUserBackground', () => {
				themeBackground.name('');
				themeBackground.hash('');
			});
		}
	}
}
