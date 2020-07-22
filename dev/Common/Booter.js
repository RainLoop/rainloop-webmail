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
 * @param {string} styles
 * @returns {void}
 */
function includeStyle(styles) {
	const doc = window.document, style = doc.createElement('style');
	style.type = 'text/css';
	style.textContent = styles;
//	style.appendChild(doc.createTextNode(styles));
	doc.head.appendChild(style);
}

/**
 * @param {string} src
 * @returns {void}
 */
function includeScr(src) {
	const doc = window.document, script = doc.createElement('script');
	script.type = 'text/javascript';
	script.src = src;
	doc.head.appendChild(script);
}

/**
 * @returns {boolean}
 */
function includeLayout() {
	const app = window.document.getElementById('rl-app');

	require('Styles/@Boot.css');

	if (app) {
		const layout = require('Html/Layout.html');
		app.innerHTML = ((layout && layout.default ? layout.default : layout) || '').replace(/[\r\n\t]+/g, '');
		return true;
	}

	return false;
}

/**
 * @param {boolean} admin = false
 * @param {boolean} mobile = false
 * @param {boolean} mobileDevice = false
 * @returns {void}
 */
function includeAppScr({ admin = false, mobile = false, mobileDevice = false }) {
	let src = './?/';
	src += admin ? 'Admin' : '';
	src += 'AppData@';
	src += mobile ? 'mobile' : 'no-mobile';
	src += mobileDevice ? '-1' : '-0';
	src += '/';

	includeScr(
		src +
			(window.__rlah ? window.__rlah() || '0' : '0') +
			'/' +
			window.Math.random()
				.toString()
				.substr(2) +
			'/'
	);
}

/**
 * @returns {object}
 */
function getRainloopBootData() {
	let result = {};
	const meta = window.document.getElementById('app-boot-data');

	if (meta && meta.getAttribute) {
		result = JSON.parse(meta.getAttribute('content')) || {};
	}

	return result;
}

/**
 * @param {string} additionalError
 * @returns {void}
 */
function showError(additionalError) {
	const oR = window.document.getElementById('rl-loading'),
		oL = window.document.getElementById('rl-loading-error'),
		oLA = window.document.getElementById('rl-loading-error-additional');

	if (oR) {
		oR.style.display = 'none';
	}

	if (oL) {
		oL.style.display = 'block';
	}

	if (oLA && additionalError) {
		oLA.style.display = 'block';
		oLA.innerHTML = additionalError;
	}

	if (progressJs) {
		progressJs.set(100).end();
	}
}

/**
 * @param {string} description
 * @returns {void}
 */
function showDescriptionAndLoading(description) {
	const oE = window.document.getElementById('rl-loading'),
		oElDesc = window.document.getElementById('rl-loading-desc');

	if (oElDesc && description) {
		oElDesc.innerHTML = description;
	}

	if (oE && oE.style) {
		oE.style.opacity = 0;
		window.setTimeout(() => {
			oE.style.opacity = 1;
		}, 300);
	}
}

/**
 * @param {boolean} withError
 * @param {string} additionalError
 * @returns {void}
 */
function runMainBoot(withError, additionalError) {
	if (window.__APP_BOOT && !withError) {
		window.__APP_BOOT(() => {
			showError(additionalError);
		});
	} else {
		showError(additionalError);
	}
}

/**
 * @returns {void}
 */
function runApp() {
	const appData = window.__rlah_data();

	if (
		jassl &&
		progressJs &&
		appData &&
		appData.TemplatesLink &&
		appData.LangLink &&
		appData.StaticLibJsLink &&
		appData.StaticAppJsLink &&
		appData.StaticEditorJsLink
	) {
		const p = progressJs;

		p.setOptions({ theme: 'rainloop' });
		p.start().set(5);

		const libs = () =>
			jassl(appData.StaticLibJsLink).then(() => {
				window.document.getElementById('rl-check').remove();
				if (appData.IncludeBackground) {
					const img = appData.IncludeBackground.replace('{{USER}}', window.__rlah ? window.__rlah() || '0' : '0');
					if (img) {
						window.document.documentElement.classList.add('UserBackground');
						window.document.body.style.backgroundImage = "url("+img+")";
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
}

/**
 * @param {mixed} data
 * @returns {void}
 */
window.__initAppData = function(data) {
	RL_APP_DATA_STORAGE = data;

	window.__rlah_set();

	if (RL_APP_DATA_STORAGE) {
		if (RL_APP_DATA_STORAGE.NewThemeLink) {
			(window.document.getElementById('app-theme-link') || {}).href = RL_APP_DATA_STORAGE.NewThemeLink;
		}

		if (RL_APP_DATA_STORAGE.IncludeCss) {
			includeStyle(RL_APP_DATA_STORAGE.IncludeCss);
		}

		showDescriptionAndLoading(RL_APP_DATA_STORAGE.LoadingDescriptionEsc || '');
	}

	runApp();
};

/**
 * @returns {void}
 */
window.__runBoot = function() {
	if (!window.navigator || !window.navigator.cookieEnabled) {
		window.document.location.replace('./?/NoCookie');
	}

	if (includeLayout()) {
		includeAppScr(getRainloopBootData());
	}
};
