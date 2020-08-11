import { getHash, setHash, clearHash } from 'Storage/RainLoop';

let RL_APP_DATA_STORAGE = null;

const doc = document;

/* eslint-disable camelcase,spaced-comment  */
window.__rlah_set = () => setHash();
window.__rlah_clear = () => clearHash();
window.__rlah_data = () => RL_APP_DATA_STORAGE;

/**
 * @returns {void}
 */
function showError() {
	const oR = doc.getElementById('rl-loading'),
		oL = doc.getElementById('rl-loading-error');

	if (oR) {
		oR.style.display = 'none';
	}

	if (oL) {
		oL.style.display = 'block';
	}

	if (window.progressJs) {
		progressJs.set(100).end();
	}
}

/**
 * @param {boolean} withError
 * @returns {void}
 */
function runMainBoot(withError) {
	if (window.__APP_BOOT && !withError) {
		window.__APP_BOOT(() => showError());
	} else {
		showError();
	}
}

function writeCSS(css) {
	const style = doc.createElement('style');
	style.type = 'text/css';
	style.textContent = css;
//	style.appendChild(doc.createTextNode(styles));
	doc.head.appendChild(style);
}

function loadScript(src) {
	if (!src) {
		throw new Error('src should not be empty.');
	}
	return new Promise((resolve, reject) => {
		const script = doc.createElement('script');
		script.onload = () => resolve();
		script.onerror = () => reject(new Error(src));
		script.src = src;
//		script.type = 'text/javascript';
		doc.head.appendChild(script);
//		doc.body.appendChild(element);
	});
}

/**
 * @param {mixed} data
 * @returns {void}
 */
window.__initAppData = data => {
	RL_APP_DATA_STORAGE = data;

	window.__rlah_set();

	if (RL_APP_DATA_STORAGE) {
		const css = RL_APP_DATA_STORAGE.IncludeCss,
			theme = RL_APP_DATA_STORAGE.NewThemeLink,
			description= RL_APP_DATA_STORAGE.LoadingDescriptionEsc || '',
			oE = doc.getElementById('rl-loading'),
			oElDesc = doc.getElementById('rl-loading-desc');

		if (theme) {
			(doc.getElementById('app-theme-link') || {}).href = theme;
		}

		css && writeCSS(css);

		if (oElDesc && description) {
			oElDesc.innerHTML = description;
		}
		if (oE && oE.style) {
			oE.style.opacity = 0;
			setTimeout(() => oE.style.opacity = 1, 300);
		}
	}

	const appData = window.__rlah_data(), p = progressJs;

	if (
		p &&
		appData &&
		appData.TemplatesLink &&
		appData.LangLink &&
		appData.StaticLibJsLink &&
		appData.StaticAppJsLink &&
		appData.StaticEditorJsLink
	) {
		p.set(5);

		const libs = () =>
			loadScript(appData.StaticLibJsLink).then(() => {
				doc.getElementById('rl-check').remove();
				if (appData.IncludeBackground) {
					const img = appData.IncludeBackground.replace('{{USER}}', getHash() || '0');
					if (img) {
						doc.documentElement.classList.add('UserBackground');
						doc.body.style.backgroundImage = "url("+img+")";
					}
				}
			});

		libs()
			.then(() => {
				p.set(20);
				return Promise.all([loadScript(appData.TemplatesLink), loadScript(appData.LangLink)]);
			})
			.then(() => {
				p.set(30);
				return loadScript(appData.StaticAppJsLink);
			})
			.then(() => {
				p.set(50);
				return appData.PluginsLink ? loadScript(appData.PluginsLink) : Promise.resolve();
			})
			.then(() => {
				p.set(70);
				runMainBoot(false);
			})
			.catch((e) => {
				runMainBoot(true);
				throw e;
			})
			.then(() => loadScript(appData.StaticEditorJsLink))
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
	const app = doc.getElementById('rl-app');

	if (!navigator || !navigator.cookieEnabled) {
		doc.location.replace('./?/NoCookie');
	}

	// require('Styles/@Boot.css');
	writeCSS('#rl-content{display:none;}.internal-hiddden{display:none !important;}');

	if (app) {
		const layout = require('Html/Layout.html'),
			meta = doc.getElementById('app-boot-data'),
			options = meta ? JSON.parse(meta.getAttribute('content')) || {} : {};

		app.innerHTML = ((layout && layout.default ? layout.default : layout) || '').replace(/[\r\n\t]+/g, '');

		loadScript('./?/'
			+ (options.admin ? 'Admin' : '')
			+ 'AppData@'
			+ (options.mobile ? 'mobile' : 'no-mobile')
			+ (options.mobileDevice ? '-1' : '-0')
			+ '/'
			+ (getHash() || '0')
			+ '/'
			+ Math.random().toString().substr(2)
			+ '/').then(() => {});
	}
};
