import _ from '_';
import $ from '$';
import ko from 'ko';

import Jua from 'Jua';

import { SaveSettingsStep, UploadErrorCode, Capa, Magics } from 'Common/Enums';
import { changeTheme, convertThemeName } from 'Common/Utils';
import { userBackground, themePreviewLink, uploadBackground } from 'Common/Links';
import { i18n } from 'Common/Translator';

import { capa } from 'Storage/Settings';

import ThemeStore from 'Stores/Theme';

import Remote from 'Remote/User/Ajax';

class ThemesUserSettings {
	constructor() {
		this.theme = ThemeStore.theme;
		this.themes = ThemeStore.themes;
		this.themesObjects = ko.observableArray([]);

		this.background = {};
		this.background.name = ThemeStore.themeBackgroundName;
		this.background.hash = ThemeStore.themeBackgroundHash;
		this.background.uploaderButton = ko.observable(null);
		this.background.loading = ko.observable(false);
		this.background.error = ko.observable('');

		this.capaUserBackground = ko.observable(capa(Capa.UserBackground));

		this.themeTrigger = ko.observable(SaveSettingsStep.Idle).extend({ throttle: Magics.Time100ms });

		this.iTimer = 0;
		this.oThemeAjaxRequest = null;

		this.theme.subscribe((value) => {
			_.each(this.themesObjects(), (theme) => {
				theme.selected(value === theme.name);
			});

			changeTheme(value, this.themeTrigger);

			Remote.saveSettings(null, {
				'Theme': value
			});
		});

		this.background.hash.subscribe((value) => {
			const $bg = $('#rl-bg');
			if (!value) {
				if ($bg.data('backstretch')) {
					$bg.backstretch('destroy').attr('style', '');
				}
			} else {
				$bg
					.attr('style', 'background-image: none !important;')
					.backstretch(userBackground(value), {
						fade: Magics.Time1s,
						centeredX: true,
						centeredY: true
					})
					.removeAttr('style');
			}
		});
	}

	onBuild() {
		const currentTheme = this.theme();

		this.themesObjects(
			_.map(this.themes(), (theme) => ({
				name: theme,
				nameDisplay: convertThemeName(theme),
				selected: ko.observable(theme === currentTheme),
				themePreviewSrc: themePreviewLink(theme)
			}))
		);

		this.initUploader();
	}

	onShow() {
		this.background.error('');
	}

	clearBackground() {
		if (this.capaUserBackground()) {
			Remote.clearUserBackground(() => {
				this.background.name('');
				this.background.hash('');
			});
		}
	}

	initUploader() {
		if (this.background.uploaderButton() && this.capaUserBackground()) {
			const oJua = new Jua({
				'action': uploadBackground(),
				'name': 'uploader',
				'queueSize': 1,
				'multipleSizeLimit': 1,
				'disableDragAndDrop': true,
				'disableMultiple': true,
				'clickElement': this.background.uploaderButton()
			});

			oJua
				.on('onStart', () => {
					this.background.loading(true);
					this.background.error('');
					return true;
				})
				.on('onComplete', (id, result, data) => {
					this.background.loading(false);

					if (result && id && data && data.Result && data.Result.Name && data.Result.Hash) {
						this.background.name(data.Result.Name);
						this.background.hash(data.Result.Hash);
					} else {
						this.background.name('');
						this.background.hash('');

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

						this.background.error(errorMsg || i18n('SETTINGS_THEMES/ERROR_UNKNOWN'));
					}

					return true;
				});
		}
	}
}

export { ThemesUserSettings, ThemesUserSettings as default };
