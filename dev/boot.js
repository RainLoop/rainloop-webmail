[].flat||document.location.replace('./?/BadBrowser');

(win => {

const
	doc = document,
	eId = id => doc.getElementById('rl-'+id),
	app = eId('app'),
	css = eId('css'),
	admin = app && '1' == app.dataset.admin,

	cb = () => rl.app.bootstart(),

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
	};

if (!navigator.cookieEnabled) {
	doc.location.href = './?/NoCookie';
}

let RL_APP_DATA = {},
	layout = doc.cookie.match(/(^|;) ?rllayout=([^;]+)/) || '';

doc.documentElement.classList.toggle('rl-mobile', 'mobile' === layout[2] || (!layout && 1000 > innerWidth));

win.rl = {
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
		loadScript(appData.StaticLibJsLink)
			.then(() => loadScript(appData.StaticAppJsLink))
			.then(() => appData.PluginsLink ? loadScript(appData.PluginsLink) : Promise.resolve())
			.then(() => ('loading' !== doc.readyState) ? cb() : doc.addEventListener('DOMContentLoaded', cb))
			.catch(e => {
				showError(e.message);
				throw e;
			});
	},

	setData: appData => {
		RL_APP_DATA = appData;
		rl.app.refresh();
	}
};

css.href = css.dataset.href;

loadScript(`./?/${admin ? 'Admin' : ''}AppData/0/${Math.random().toString().slice(2)}/`)
	.then(() => 0);

})(this);
