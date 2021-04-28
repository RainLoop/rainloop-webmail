
(win => {

const
	doc = document,
	eId = id => doc.getElementById(id),
	app = eId('rl-app'),
	admin = app && '1' == app.dataset.admin,

	getCookie = name => {
		let data = doc.cookie.match('(^|;) ?'+name+'=([^;]*)(;|$)');
		return data ? decodeURIComponent(data[2]) : null;
	},

	Storage = type => {
		let name = type+'Storage';
		try {
			win[name].setItem(name, '');
			win[name].getItem(name);
			win[name].removeItem(name);
		} catch (e) {
			console.error(e);
			const cookieName = encodeURIComponent(name+('session' === type ? win.name || (win.name = Date.now()) : ''));

			// initialise if there's already data
			let data = getCookie(cookieName);
			data = data ? JSON.parse(data) : {};

			win[name] = {
				getItem: key => data[key] === undefined ? null : data[key],
				setItem: function (key, value) {
					data[key] = ''+value; // forces the value to a string
					doc.cookie = cookieName+'='+encodeURIComponent(JSON.stringify(data))
						+"; expires="+('local' === type ? (new Date(Date.now()+(365*24*60*60*1000))).toGMTString() : '')
						+"; path=/; samesite=strict";
				}
			};
		}
		return win[name];
	},

	showError = () => {
		eId('rl-loading').hidden = true;
		eId('rl-loading-error').hidden = false;
		p.end();
	},

	loadScript = src => {
		if (!src) {
			throw new Error('src should not be empty.');
		}
		return new Promise((resolve, reject) => {
			const script = doc.createElement('script');
			script.onload = () => {
				p.set(pStep += step);
				resolve();
			};
			script.onerror = () => reject(new Error(src));
			script.src = src;
//			script.async = true;
			doc.head.append(script);
		});
	},

	step = 100 / 7,
	p = win.progressJs = {
		set: percent => progress.style.width = Math.min(percent, 100) + '%',
		end: () => {
			if (progress) {
				p.set(100);
				setTimeout(() => {
					progress.remove();
					progress = null;
				}, 600);
			}
		}
	};

if (!navigator || !navigator.cookieEnabled) {
	doc.location.href = './?/NoCookie';
}

const layout = getCookie('rllayout');
doc.documentElement.classList.toggle('rl-mobile', 'mobile' === layout || (!layout && 1000 > innerWidth));

let pStep = 0,
	progress = eId('progressjs'),
	rlspecauth = '',
	RL_APP_DATA = {};

win.rl = {
	hash: {
		get: () => rlspecauth || '0',
		clear: () => rlspecauth = ''
	},
	data: () => RL_APP_DATA,
	adminArea: () => admin,
	settings: {
		get: name => null == RL_APP_DATA[name] ? null : RL_APP_DATA[name],
		set: (name, value) => RL_APP_DATA[name] = value,
		app: name => {
			const APP_SETTINGS = RL_APP_DATA.System || {};
			return null == APP_SETTINGS[name] ? null : APP_SETTINGS[name];
		},
		capa: name => null != name && Array.isArray(RL_APP_DATA.Capa) && RL_APP_DATA.Capa.includes(name)
	},
	setWindowTitle: title => {
		title = null == title ? '' : '' + title;
		if (RL_APP_DATA.Title) {
			title += (title ? ' - ' : '') + RL_APP_DATA.Title;
		}
		doc.title = title;
	},

	initData: appData => {
		RL_APP_DATA = appData;
		rlspecauth = appData['AuthAccountHash'];

		if (appData) {
			loadScript(appData.StaticLibJsLink)
			.then(() => loadScript(appData.StaticAppJsLink))
			.then(() => appData.PluginsLink ? loadScript(appData.PluginsLink) : Promise.resolve())
			.then(() => win.__APP_BOOT ? win.__APP_BOOT(showError) : showError())
			.catch(e => {
				showError();
				throw e;
			});
		} else {
			showError();
		}
	}
};

p.set(1);

Storage('local');

eId('app-css').href = eId('app-css').dataset.href;

loadScript(`./?/${admin ? 'Admin' : ''}AppData/${rl.hash.get()}/${Math.random().toString().substr(2)}/`)
	.then(() => {});

})(this);
