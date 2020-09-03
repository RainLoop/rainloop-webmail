
(win => {

const
	doc = win.document,
	app = doc.getElementById('rl-app'),
	setPercentWidth = percent => setTimeout(() => progress.style.width = parseInt(Math.min(percent, 100)) + '%', 50),

	Storage = type => {
		let name = type+'Storage';
		try {
			win[name].setItem('storage', '');
			win[name].getItem('storage');
			win[name].removeItem('storage');
		} catch (e) {
			console.error(e);
			const cookieName = encodeURIComponent(name+('session' === type ? win.name || (win.name = Date.now()) : ''));

			// initialise if there's already data
			let data = document.cookie.match('(^|;) ?'+cookieName+'=([^;]*)(;|$)');
			data = data ? decodeURIComponent(data[2]) : null;
			data = data ? JSON.parse(data) : {};

			win[name] = {
				getItem: key => data[key] === undefined ? null : data[key],
				setItem: function (key, value) {
					data[key] = ''+value; // forces the value to a string
					document.cookie = cookieName+'='+encodeURIComponent(JSON.stringify(data))
						+"; expires="+('local' === type ? (new Date(Date.now()+(365*24*60*60*1000))).toGMTString() : '')
						+"; path=/; samesite=strict";
				}
			};
		}
	},
	STORAGE_KEY = '__rlA',
	TIME_KEY = '__rlT',
	AUTH_KEY = 'AuthAccountHash',
	storage = () => window.sessionStorage,
	timestamp = () => Math.round(Date.now() / 1000),
	setTimestamp = () => storage().setItem(TIME_KEY, timestamp()),

	showError = () => {
		const oR = doc.getElementById('rl-loading'),
			oL = doc.getElementById('rl-loading-error');

		if (oR) {
			oR.style.display = 'none';
		}

		if (oL) {
			oL.style.display = 'block';
		}

		p.end();
	},

	runMainBoot = withError => {
		if (win.__APP_BOOT && !withError) {
			win.__APP_BOOT(() => showError());
		} else {
			showError();
		}
	},

	writeCSS = css => {
		const style = doc.createElement('style');
		style.type = 'text/css';
		style.textContent = css;
		doc.head.append(style);
	},

	loadScript = src => {
		if (!src) {
			throw new Error('src should not be empty.');
		}
		return new Promise((resolve, reject) => {
			const script = doc.createElement('script');
			script.onload = () => resolve();
			script.onerror = () => reject(new Error(src));
			script.src = src;
//			script.type = 'text/javascript';
			doc.head.append(script);
//			doc.body.append(element);
		});
	},

	p = win.progressJs = {
		set: percent => setPercentWidth(percent),
		end: () => {
			if (container) {
				progress.addEventListener('transitionend', () => {
					if (container) {
						container.hidden = true;
						setTimeout(() => {container.remove();container=null;}, 200);
					}
				}, false);
				setPercentWidth(100);
			}
		}
	};

let container = doc.createElement('div'),
	progress = container.appendChild(doc.createElement("div")),

	RL_APP_DATA_STORAGE = null;

container.className = 'progressjs-progress progressjs-theme-rainloop';
progress.className = "progressjs-inner";
progress.appendChild(doc.createElement('div')).className = "progressjs-percent";

setPercentWidth(1);
doc.body.append(container);

Storage('local');
Storage('session');

win.RainLoop = {
	hash: {
		// getHash
		get: () => storage().getItem(STORAGE_KEY) || null,
		// setHash
		set: () => {
			storage().setItem(STORAGE_KEY, RL_APP_DATA_STORAGE && RL_APP_DATA_STORAGE[AUTH_KEY]
				? RL_APP_DATA_STORAGE[AUTH_KEY] : '');
			setTimestamp();
		},
		// clearHash
		clear: () => {
			storage().setItem(STORAGE_KEY, '');
			setTimestamp();
		},
		// checkTimestamp
		check: () => {
			if (timestamp() > (parseInt(storage().getItem(TIME_KEY) || 0, 10) || 0) + 3600000) {
				// 60m
				RainLoop.hash.clear();
				return true;
			}
			return false;
		}
	},
	data: () => RL_APP_DATA_STORAGE
};

// init section
setInterval(setTimestamp, 60000); // 1m

/**
 * @param {mixed} appData
 * @returns {void}
 */
win.__initAppData = appData => {
	RL_APP_DATA_STORAGE = appData;

	RainLoop.hash.set();

	if (appData) {
		const css = appData.IncludeCss,
			theme = appData.NewThemeLink,
			description= appData.LoadingDescriptionEsc || '',
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

	if (
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
					const img = appData.IncludeBackground.replace('{{USER}}', RainLoop.hash.get() || '0');
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
		+ (RainLoop.hash.get() || '0')
		+ '/'
		+ Math.random().toString().substr(2)
		+ '/').then(() => {});
}

})(window);
