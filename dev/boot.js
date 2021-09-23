[].flat||document.location.replace('./?/BadBrowser');

(win => {

const
	doc = document,
	eId = id => doc.getElementById('rl-'+id),
	app = eId('app'),
	css = eId('css'),
	admin = app && '1' == app.dataset.admin,

	getCookie = name => {
		let data = doc.cookie.match('(^|;) ?'+name+'=([^;]*)(;|$)');
		return data ? decodeURIComponent(data[2]) : null;
	},

	showError = msg => {
		let div = eId('loading-error');
		div.append(' ' + msg);
		eId('loading').hidden = true;
		div.hidden = false;
	},

	loadScript = src => {
		if (!src) {
			throw new Error('src should not be empty.');
		}
		return new Promise((resolve, reject) => {
			const script = doc.createElement('script');
			script.onload = () => resolve();
			script.onerror = () => reject(new Error('Failed loading ' + src));
			script.src = src;
//			script.async = true;
			doc.head.append(script);
		});
	},

	layout = getCookie('rllayout'),
	sName = 'localStorage';

if (!navigator || !navigator.cookieEnabled) {
	doc.location.href = './?/NoCookie';
}

doc.documentElement.classList.toggle('rl-mobile', 'mobile' === layout || (!layout && 1000 > innerWidth));

let RL_APP_DATA = {};

win.rl = {
	adminArea: () => admin,
	settings: {
		get: name => RL_APP_DATA[name],
		set: (name, value) => RL_APP_DATA[name] = value,
		app: name => RL_APP_DATA.System[name],
		capa: name => name && (RL_APP_DATA.Capa || []).includes(name)
	},
	setWindowTitle: title =>
		doc.title = RL_APP_DATA.Title ? (title ? title + ' - ' : '') + RL_APP_DATA.Title : (title ? '' + title : ''),

	initData: appData => {
		const cb = () => rl.app.bootstart();
		RL_APP_DATA = appData;
		loadScript(appData.StaticLibJsLink)
			.then(() => loadScript(appData.StaticAppJsLink))
			.then(() => appData.PluginsLink ? loadScript(appData.PluginsLink) : Promise.resolve())
			.then(() => ('loading' !== doc.readyState) ? cb() : doc.addEventListener('DOMContentLoaded', cb))
			.catch(e => {
				showError(e.message);
				throw e;
			});
	}
};

// Storage
try {
	win[sName].setItem(sName, '');
	win[sName].getItem(sName);
	win[sName].removeItem(sName);
} catch (e) {
	console.error(e);
	// initialise if there's already data
	let data = getCookie(sName);
	data = data ? JSON.parse(data) : {};
	win[sName] = {
		getItem: key => data[key] == null ? null : data[key],
		setItem: (key, value) => {
			data[key] = ''+value; // forces the value to a string
			doc.cookie = sName+'='+encodeURIComponent(JSON.stringify(data))
				+"; expires="+((new Date(Date.now()+(365*24*60*60*1000))).toGMTString())
				+"; path=/; samesite=strict";
		}
	};
}

css.href = css.dataset.href;

loadScript(`./?/${admin ? 'Admin' : ''}AppData/0/${Math.random().toString().substr(2)}/`)
	.then(() => 0);

})(this);
