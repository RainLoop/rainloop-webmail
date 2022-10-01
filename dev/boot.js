(doc => {

navigator.cookieEnabled || doc.location.replace('./?/NoCookie');

const
	eId = id => doc.getElementById('rl-'+id),
	app = eId('app'),
	admin = app && '1' == app.dataset.admin,
	layout = doc.cookie.match(/(^|;) ?rllayout=([^;]+)/) || '',
	badBrowser = () => doc.location.replace('./?/BadBrowser'),

	loadScript = src => {
		if (!src) {
			throw new Error('src should not be empty.');
		}
		return new Promise((resolve, reject) => {
			const script = doc.createElement('script');
			script.onload = () => resolve();
			script.onerror = () => reject(new Error('Failed loading ' + src));
			script.src = src;
			doc.head.append(script);
		});
	};

[].flat || badBrowser();

let RL_APP_DATA = {};

doc.documentElement.classList.toggle('rl-mobile', 'mobile' === layout[2] || (!layout && 1000 > innerWidth));

window.rl = {
	adminArea: () => admin,

	settings: {
		get: name => RL_APP_DATA[name],
		set: (name, value) => RL_APP_DATA[name] = value,
		app: name => RL_APP_DATA.System[name]
	},

	setWindowTitle: title =>
		doc.title = RL_APP_DATA.Title ? (title ? title + ' - ' : '') + RL_APP_DATA.Title : (title ? '' + title : ''),

	initData: appData => {
		RL_APP_DATA = appData;
		const url = appData.StaticLibsJs,
			cb = () => rl.app ? rl.app.bootstart() : badBrowser(),
			div = eId('loading-error'),
			showError = msg => {
				div.append(' ' + msg);
				eId('loading').hidden = true;
				div.hidden = false;
			};
		loadScript(url)
			.then(() => loadScript(url.replace('/libs.', `/${admin?'admin':'app'}.`)))
			.then(() => appData.PluginsLink ? loadScript(appData.PluginsLink) : Promise.resolve())
			.then(() => rl.app
					? cb()
					: doc.addEventListener('readystatechange', () => 'complete' == doc.readyState && cb())
			)
			.catch(e => {
				showError(e);
				throw e;
			});
	},

	setData: appData => {
		RL_APP_DATA = appData;
		rl.app.refresh();
	},

	loadScript: loadScript
};

loadScript(`./?/${admin ? 'Admin' : ''}AppData/0/${Math.random().toString().slice(2)}/`)
	.then(() => 0);

})(document);
