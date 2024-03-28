import ko from 'ko';
import { $htmlCL, appEl, elementById, leftPanelDisabled, Settings, SettingsGet } from 'Common/Globals';
import { isArray, arrayLength } from 'Common/Utils';
import { cssLink, serverRequestRaw } from 'Common/Links';
import { SaveSettingStatus } from 'Common/Enums';
import { addSubscribablesTo } from 'External/ko';

let __themeTimer = 0;

export const
	// Also see Styles/_Values.less @maxMobileWidth
	isMobile = matchMedia('(max-width: 799px)'),
	// https://github.com/the-djmaze/snappymail/issues/1150
//	isSmall = matchMedia('(max-width: 1400px)'),

	ThemeStore = {
		theme: ko.observable(''),
		themes: ko.observableArray(),
		userBackgroundName: ko.observable(''),
		userBackgroundHash: ko.observable(''),
		fontSansSerif: ko.observable(''),
		fontSerif: ko.observable(''),
		fontMono: ko.observable(''),
		isMobile: ko.observable(false)
	},

	initThemes = () => {
		const theme = SettingsGet('Theme'),
			themes = Settings.app('themes');

		ThemeStore.themes(isArray(themes) ? themes : []);
		ThemeStore.theme(theme);
		changeTheme(theme);
		if (!ThemeStore.isMobile()) {
			ThemeStore.userBackgroundName(SettingsGet('userBackgroundName'));
			ThemeStore.userBackgroundHash(SettingsGet('userBackgroundHash'));
		}
		ThemeStore.fontSansSerif(SettingsGet('fontSansSerif'));
		ThemeStore.fontSerif(SettingsGet('fontSerif'));
		ThemeStore.fontMono(SettingsGet('fontMono'));

		leftPanelDisabled(ThemeStore.isMobile());
	},

	changeTheme = (value, themeTrigger = ()=>0) => {
		const themeStyle = elementById('app-theme-style'),
			clearTimer = () => {
				__themeTimer = setTimeout(() => themeTrigger(SaveSettingStatus.Idle), 1000);
			},
			url = cssLink(value);

		if (themeStyle.dataset.name != value) {
			clearTimeout(__themeTimer);

			themeTrigger(SaveSettingStatus.Saving);

			rl.app.Remote.abort('theme').get('theme', url)
				.then(data => {
					if (2 === arrayLength(data)) {
						themeStyle.textContent = data[1];
						themeStyle.dataset.name = value;
						themeTrigger(SaveSettingStatus.Success);
					}
					clearTimer();
				}, clearTimer);
		}
	},

	convertThemeName = theme => theme.replace(/@[a-z]+$/, '').replace(/([A-Z])/g, ' $1').trim();

addSubscribablesTo(ThemeStore, {
	fontSansSerif: value => {
		if (null != value) {
			let cl = appEl.classList;
			cl.forEach(name => {
				if (name.startsWith('font') && !/font(Serif|Mono)/.test(name)) {
					cl.remove(name);
				}
			});
			value && cl.add('font'+value);
		}
	},

	fontSerif: value => {
		if (null != value) {
			let cl = appEl.classList;
			cl.forEach(name => name.startsWith('fontSerif') && cl.remove(name));
			value && cl.add('fontSerif'+value);
		}
	},

	fontMono: value => {
		if (null != value) {
			let cl = appEl.classList;
			cl.forEach(name => name.startsWith('fontMono') && cl.remove(name));
			value && cl.add('fontMono'+value);
		}
	},

	userBackgroundHash: value => {
		appEl.classList.toggle('UserBackground', !!value);
		appEl.style.backgroundImage = value ? "url("+serverRequestRaw('UserBackground', value)+")" : null;
	}
});

isMobile.onchange = e => {
	ThemeStore.isMobile(e.matches);
	$htmlCL.toggle('rl-mobile', e.matches);
	/*$htmlCL.contains('sm-msgView-side') || */leftPanelDisabled(e.matches);
};
isMobile.onchange(isMobile);

//isSmall.onchange = e => $htmlCL.contains('sm-msgView-side') && leftPanelDisabled(e.matches);
//isSmall.onchange(isSmall);
