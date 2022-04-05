(doc => {

[].flat || doc.location.replace('./?/BadBrowser');
navigator.cookieEnabled || doc.location.replace('./?/NoCookie');

const
	eId = id => doc.getElementById('rl-'+id),
	app = eId('app'),
	admin = app && '1' == app.dataset.admin,
	layout = doc.cookie.match(/(^|;) ?rllayout=([^;]+)/) || '',

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
	};

let RL_APP_DATA = {};

doc.documentElement.classList.toggle('rl-mobile', 'mobile' === layout[2] || (!layout && 1000 > innerWidth));

window.rl = {
	adminArea: () => admin,
	settings: {
		get: name => RL_APP_DATA[name],
		set: (name, value) => RL_APP_DATA[name] = value,
		app: name => RL_APP_DATA.System[name],
		capa: name => name && !!(RL_APP_DATA.Capa || {})[name]
	},
	setWindowTitle: title =>
		doc.title = RL_APP_DATA.Title ? (title ? title + ' - ' : '') + RL_APP_DATA.Title : (title ? '' + title : ''),

	initData: appData => {
		RL_APP_DATA = appData;
		const url = appData.StaticLibsJs,
			cb = () => rl.app.bootstart(),
			div = eId('loading-error'),
			showError = msg => {
				div.append(' ' + msg);
				eId('loading').hidden = true;
				div.hidden = false;
			};
		loadScript(url)
			.then(() => loadScript(url.replace('/libs.', `/${admin?'admin':'app'}.`)))
			.then(() => appData.PluginsLink ? loadScript(appData.PluginsLink) : Promise.resolve())
			.then(() => {
				if ('complete' == doc.readyState) {
					cb();
				} else {
					let poll = setInterval(()=>{
						if ('complete' == doc.readyState) {
							clearInterval(poll);
							cb();
						}
					}, 50);
				}
			})
			.catch(e => {
				showError(e.message);
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
