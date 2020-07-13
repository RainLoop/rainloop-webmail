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

const useJsNextBundle = (function() {
	//	try {
	//
	//		(function() {
	//			eval(`
	// // let + const
	//const x = 5; let y = 4; var z = 4;
	//
	// // Arrow Function
	//const f = () => 'rainloop';
	//
	// // Default + Rest + Spread
	//const d = (test = 1, ...t) => 'rainloop';
	//d(...[1, 2, 3]);
	//
	//// Destructuring
	//let [a, b] = [1, 2];
	//({a, b} = {a: 1, b: 2});
	//
	//// Class
	//class Q1 { constructor() {} }
	//
	//// Class extends + super
	//class Q2 extends Q1 { constructor() { super() } }
	//
	//`);
	//		}());
	//
	//		return true;
	//	}
	//	catch (e) {}
	return false;
})();
/* eslint-enable */

/**
 * @param {string} id
 * @param {string} name
 * @returns {string}
 */
function getComputedStyle(id, name) {
	const element = window.document.getElementById(id);
	return element && element.currentStyle
		? element.currentStyle[name]
		: window.getComputedStyle
		? window.getComputedStyle(element, null).getPropertyValue(name)
		: null;
}

/**
 * @param {string} styles
 * @returns {void}
 */
function includeStyle(styles) {
	const style = window.document.createElement('style');
	style.type = 'text/css';
	style.text = styles;

	if (style.styleSheet) {
		style.styleSheet.cssText = styles;
	} else {
		style.appendChild(window.document.createTextNode(styles));
	}

	window.document.getElementsByTagName('head')[0].appendChild(style);
}

/**
 * @param {string} src
 * @returns {void}
 */
function includeScr(src) {
	const script = window.document.createElement('script');
	script.type = 'text/javascript';
	script.src = src;

	window.document.getElementsByTagName('head')[0].appendChild(script);
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
		appData.LangLink &&
		appData.StaticLibJsLink &&
		appData.StaticAppJsLink &&
		appData.StaticAppJsNextLink &&
		appData.StaticEditorJsLink
	) {
		const p = progressJs;

		p.setOptions({ theme: 'rainloop' });
		p.start().set(5);

		const libs = () =>
			jassl(appData.StaticLibJsLink).then(() => {
				if (window.$) {
					window.$('#rl-check').remove();

					if (appData.IncludeBackground) {
						window
							.$('#rl-bg')
							.attr('style', 'background-image: none !important;')
							.backstretch(
								appData.IncludeBackground.replace('{{USER}}', window.__rlah ? window.__rlah() || '0' : '0'),
								{ fade: 100, centeredX: true, centeredY: true }
							)
							.removeAttr('style');
					}
				}
			});

		libs()
			.then(() => {
				p.set(20);
				return jassl(appData.LangLink);
			})
			.then(() => {
				p.set(30);
				return jassl(useJsNextBundle ? appData.StaticAppJsNextLink : appData.StaticAppJsLink);
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

	const root = window.document.documentElement;
	if ('none' !== getComputedStyle('rl-check', 'display')) {
		root.className += ' no-css';
	}

	if (useJsNextBundle) {
		root.className += ' js-next';
	}

	if (includeLayout()) {
		includeAppScr(getRainloopBootData());
	}
};
