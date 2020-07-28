import window from 'window';
import progressJs from 'progressJs';

import { jassl } from 'Common/Jassl';
import { getHash, setHash, clearHash } from 'Storage/RainLoop';

let RL_APP_DATA_STORAGE = null;

/* eslint-disable camelcase,spaced-comment  */
window.__rlah = () => getHash();
window.__rlah_set = () => setHash();
window.__rlah_clear = () => clearHash();
window.__rlah_data = () => RL_APP_DATA_STORAGE;

/**
 * @returns {void}
 */
function showError() {
	const oR = window.document.getElementById('rl-loading'),
		oL = window.document.getElementById('rl-loading-error');

	if (oR) {
		oR.style.display = 'none';
	}

	if (oL) {
		oL.style.display = 'block';
	}

	if (progressJs) {
		progressJs.set(100).end();
	}
}

/**
 * @param {boolean} withError
 * @returns {void}
 */
function runMainBoot(withError) {
	if (window.__APP_BOOT && !withError) {
		window.__APP_BOOT(() => {
			showError();
		});
	} else {
		showError();
	}
}

/**
 * @param {mixed} data
 * @returns {void}
 */
window.__initAppData = data => {
	RL_APP_DATA_STORAGE = data;

	window.__rlah_set();

	const doc = window.document;

	if (RL_APP_DATA_STORAGE) {
		const css = RL_APP_DATA_STORAGE.IncludeCss,
			theme = RL_APP_DATA_STORAGE.NewThemeLink,
			description= RL_APP_DATA_STORAGE.LoadingDescriptionEsc || '',
			oE = doc.getElementById('rl-loading'),
			oElDesc = doc.getElementById('rl-loading-desc');

		if (theme) {
			(doc.getElementById('app-theme-link') || {}).href = theme;
		}

		if (css) {
			const style = doc.createElement('style');
			style.type = 'text/css';
			style.textContent = css;
//			style.appendChild(doc.createTextNode(styles));
			doc.head.appendChild(style);
		}

		if (oElDesc && description) {
			oElDesc.innerHTML = description;
		}
		if (oE && oE.style) {
			oE.style.opacity = 0;
			window.setTimeout(() => oE.style.opacity = 1, 300);
		}
	}

	const appData = window.__rlah_data(), p = progressJs;

	if (
		jassl &&
		p &&
		appData &&
		appData.TemplatesLink &&
		appData.LangLink &&
		appData.StaticLibJsLink &&
		appData.StaticAppJsLink &&
		appData.StaticEditorJsLink
	) {
		p.start().set(5);

		const libs = () =>
			jassl(appData.StaticLibJsLink).then(() => {
				doc.getElementById('rl-check').remove();
				if (appData.IncludeBackground) {
					const img = appData.IncludeBackground.replace('{{USER}}', window.__rlah ? window.__rlah() || '0' : '0');
					if (img) {
						doc.documentElement.classList.add('UserBackground');
						doc.body.style.backgroundImage = "url("+img+")";
					}
				}
			});

		libs()
			.then(() => {
				p.set(20);
				return window.Promise.all([jassl(appData.TemplatesLink), jassl(appData.LangLink)]);
			})
			.then(() => {
				p.set(30);
				return jassl(appData.StaticAppJsLink);
			})
			.then(() => {
				p.set(50);
				return appData.PluginsLink ? jassl(appData.PluginsLink) : window.Promise.resolve();
			})
			.then(() => {
				p.set(70);
				runMainBoot(false);
			})
			.catch((e) => {
				runMainBoot(true);
				throw e;
			})
			.then(() => jassl(appData.StaticEditorJsLink))
			.then(() => {
				if (window.CKEDITOR && window.__initEditor) {
					window.__initEditor();
					window.__initEditor = null;
				}
			});
	} else {
		runMainBoot(true);
	}
};

/**
 * @returns {void}
 */
window.__runBoot = () => {
	const doc = window.document,
		app = doc.getElementById('rl-app');

	if (!window.navigator || !window.navigator.cookieEnabled) {
		doc.location.replace('./?/NoCookie');
	}

	require('Styles/@Boot.css');

	if (app) {
		const layout = require('Html/Layout.html'),
			meta = doc.getElementById('app-boot-data'),
			options = meta ? JSON.parse(meta.getAttribute('content')) || {} : {},
			script = doc.createElement('script');

		app.innerHTML = ((layout && layout.default ? layout.default : layout) || '').replace(/[\r\n\t]+/g, '');

		script.type = 'text/javascript';
		script.src = './?/'
			+ (options.admin ? 'Admin' : '')
			+ 'AppData@'
			+ (options.mobile ? 'mobile' : 'no-mobile')
			+ (options.mobileDevice ? '-1' : '-0')
			+ '/'
			+ (window.__rlah ? window.__rlah() || '0' : '0')
			+ '/'
			+ window.Math.random().toString().substr(2)
			+ '/';
		doc.head.appendChild(script);
	}
};
