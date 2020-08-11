import { getHash, setHash, clearHash } from 'Storage/RainLoop';

(win => {

const
	doc = win.document,
	setPercentWidth = (percent) => {
		setTimeout(() => progress.style.width = parseInt(Math.min(percent, 100)) + '%', 50);
	};

let container = doc.createElement('div'),
	progress = container.appendChild(doc.createElement("div"));

container.className = 'progressjs-progress progressjs-theme-rainloop';
progress.className = "progressjs-inner";
progress.appendChild(doc.createElement('div')).className = "progressjs-percent";

setPercentWidth(1);
doc.body.appendChild(container);

win.progressJs = new class {
	set(percent) {
		setPercentWidth(percent);
		return this;
	}

	end() {
		if (progress) {
			progress.addEventListener('transitionend', () => {
				if (container) {
					container.hidden = true;
					setTimeout(() => {container.remove();container=null;}, 200);
				}
			}, false);
			setPercentWidth(100);
		}
		return this;
	}
};

let RL_APP_DATA_STORAGE = null;

win.__rlah_set = () => setHash();
win.__rlah_clear = () => clearHash();
win.__rlah_data = () => RL_APP_DATA_STORAGE;

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

	if (win.progressJs) {
		progressJs.set(100).end();
	}
}

/**
 * @param {boolean} withError
 * @returns {void}
 */
function runMainBoot(withError) {
	if (win.__APP_BOOT && !withError) {
		win.__APP_BOOT(() => showError());
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
win.__initAppData = data => {
	RL_APP_DATA_STORAGE = data;

	win.__rlah_set();

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

	const appData = win.__rlah_data(), p = progressJs;

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
				if (win.CKEDITOR && win.__initEditor) {
					win.__initEditor();
					win.__initEditor = null;
				}
			});
	} else {
		runMainBoot(true);
	}
};

const app = doc.getElementById('rl-app');

if (!navigator || !navigator.cookieEnabled) {
	doc.location.replace('./?/NoCookie');
}

// require('Styles/@Boot.css');
writeCSS('#rl-content{display:none;}.internal-hiddden{display:none !important;}');

if (app) {
	const
		meta = doc.getElementById('app-boot-data'),
		options = meta ? JSON.parse(meta.getAttribute('content')) || {} : {};

//	require('Html/Layout.html')
	app.innerHTML = '<div id="rl-loading" class="thm-loading" style="opacity:0">\
	<div id="rl-loading-desc"></div>\
	<div class="e-spinner">\
		<div class="e-bounce bounce1"></div>\
		<div class="e-bounce bounce2"></div>\
		<div class="e-bounce bounce3"></div>\
	</div>\
</div>\
<div id="rl-loading-error" class="thm-loading">\
	An error occurred. <br /> Please refresh the page and try again.\
</div>\
<div id="rl-content">\
	<div id="rl-popups"></div>\
	<div id="rl-center">\
		<div id="rl-top"></div>\
		<div id="rl-left"></div>\
		<div id="rl-right"></div>\
		<div id="rl-bottom"></div>\
	</div>\
</div>\
<div id="rl-templates"></div>\
<div id="rl-hidden"></div>'.replace(/[\r\n\t]+/g, '');

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

})(window);
