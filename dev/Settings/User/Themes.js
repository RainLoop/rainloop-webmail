import { addObservablesTo } from 'External/ko';

import { SaveSettingsStep, UploadErrorCode, Capa } from 'Common/Enums';
import { changeTheme, convertThemeName } from 'Common/Utils';
import { themePreviewLink, serverRequest } from 'Common/Links';
import { i18n } from 'Common/Translator';
import { Settings } from 'Common/Globals';

import { ThemeStore } from 'Stores/Theme';

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

export class ThemesUserSettings /*extends AbstractViewSettings*/ {
	constructor() {
		this.theme = ThemeStore.theme;
		this.themes = ThemeStore.themes;
		this.themesObjects = ko.observableArray();

		this.background = themeBackground;

		this.capaUserBackground = Settings.capa(Capa.UserBackground);

		this.themeTrigger = ko.observable(SaveSettingsStep.Idle).extend({ debounce: 100 });

		ThemeStore.theme.subscribe(value => {
			this.themesObjects.forEach(theme => {
				theme.selected(value === theme.name);
			});

			changeTheme(value, this.themeTrigger);

			Remote.saveSettings(null, {
				Theme: value
			});
		});
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

		if (themeBackground.uploaderButton() && this.capaUserBackground) {
			const oJua = new Jua({
				action: serverRequest('UploadBackground'),
				limit: 1,
				clickElement: themeBackground.uploaderButton()
			});

			oJua
				.on('onStart', () => {
					themeBackground.loading(true);
					themeBackground.error('');
					return true;
				})
				.on('onComplete', (id, result, data) => {
					themeBackground.loading(false);

					if (result && id && data && data.Result && data.Result.Name && data.Result.Hash) {
						themeBackground.name(data.Result.Name);
						themeBackground.hash(data.Result.Hash);
					} else {
						themeBackground.name('');
						themeBackground.hash('');

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

						if (!errorMsg && data.ErrorMessage) {
							errorMsg = data.ErrorMessage;
						}

						themeBackground.error(errorMsg || i18n('SETTINGS_THEMES/ERROR_UNKNOWN'));
					}

					return true;
				});
		}
	}

	onShow() {
		themeBackground.error('');
	}

	clearBackground() {
		if (this.capaUserBackground) {
			Remote.request('ClearUserBackground', () => {
				themeBackground.name('');
				themeBackground.hash('');
			});
		}
	}
}
