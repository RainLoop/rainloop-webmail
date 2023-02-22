(doc => {

const
	qUri = path => doc.location.pathname.replace(/\/+$/,'') + '/?/' + path,
	eId = id => doc.getElementById('rl-'+id),
	app = eId('app'),
	admin = app && '1' == app.dataset.admin,
	layout = doc.cookie.match(/(^|;) ?rllayout=([^;]+)/) || '',

	showError = msg => {
		let div = eId('loading-error');
		div.append(msg);
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
			script.onerror = () => reject('Failed loading ' + src);
			script.src = src;
//			script.async = true;
			doc.head.append(script);
		});
	};

try {
	let smctoken = doc.cookie.match(/(^|;) ?smctoken=([^;]+)/);
	smctoken = smctoken ? smctoken[2] : localStorage.getItem('smctoken');
	if (!smctoken) {
		let data = new Uint8Array(16);
		crypto.getRandomValues(data);
		smctoken = encodeURIComponent(btoa(String.fromCharCode(...data)));
	}
	localStorage.setItem('smctoken', smctoken);
	doc.cookie = 'smctoken='+smctoken+";path=/;samesite=strict";
} catch (e) {
	console.error(e);
}

let RL_APP_DATA = {};

doc.documentElement.classList.toggle('rl-mobile', 'mobile' === layout[2] || (!layout && 1000 > innerWidth));

window.rl = {
	adminArea: () => admin,

	settings: {
		get: name => RL_APP_DATA[name],
		set: (name, value) => RL_APP_DATA[name] = value,
		app: name => RL_APP_DATA.System[name]
	},

	setTitle: title =>
		doc.title = (title || '') + (RL_APP_DATA.title ? (title ? ' - ' : '') + RL_APP_DATA.title : ''),

	setData: appData => {
		RL_APP_DATA = appData;
		rl.app.refresh();
	},

	loadScript: loadScript,

	fetch: (resource, init, postData) => {
		init = Object.assign({
			mode: 'same-origin',
			cache: 'no-cache',
			redirect: 'error',
			referrerPolicy: 'no-referrer',
			credentials: 'same-origin',
			headers: {}
		}, init);
		let asJSON = 1,
			XToken = RL_APP_DATA.System?.token,
			object = {};
		if (postData) {
			init.method = 'POST';
			if (postData instanceof FormData) {
				postData.forEach((value, key) => {
					if (value instanceof File) {
						asJSON = 0;
					} else if (!Reflect.has(object, key)) {
						object[key] = value;
					} else {
						Array.isArray(object[key]) || (object[key] = [object[key]]);
						object[key].push(value);
					}
				});
				if (asJSON) {
					postData = object;
//					postData.XToken = XToken;
				} else {
					XToken && postData.set('XToken', XToken);
				}
			}
			if (asJSON) {
				init.headers['Content-Type'] = 'application/json';
				postData = JSON.stringify(postData);
			}
			init.body = postData;
		}
		XToken && (init.headers['X-SM-Token'] = XToken);
//		init.headers = new Headers(init.headers);
		return fetch(resource, init);
	},

	fetchJSON: (resource, init, postData) => {
		init = Object.assign({ headers: {} }, init);
		init.headers.Accept = 'application/json';
		return rl.fetch(resource, init, postData).then(response => {
			if (!response.ok) {
				return Promise.reject('Network response error: ' + response.status);
			}
			/* TODO: use this for non-developers?
			response.clone()
			let data = response.text();
			try {
				return JSON.parse(data);
			} catch (e) {
				console.error(e);
//				console.log(data);
				return Promise.reject(Notifications.JsonParse);
				return {
					Result: false,
					ErrorCode: 952, // Notifications.JsonParse
					ErrorMessage: e.message,
					ErrorMessageAdditional: data
				}
			}
			*/
			return response.json();
		});
	}
};

if (!navigator.cookieEnabled) {
	eId('loading').hidden = true;
	eId('NoCookie').hidden = false;
} else if (![].flat) {
	eId('loading').hidden = true;
	eId('BadBrowser').hidden = false;
} else {
	rl.fetchJSON(qUri(`${admin ? 'Admin' : ''}AppData/0/${Math.random().toString().slice(2)}/`))
	.then(appData => {
		RL_APP_DATA = appData;
		const url = appData.StaticLibsJs,
			cb = () => rl.app.bootstart();
		loadScript(url)
			.then(() => loadScript(url.replace('/libs.', `/${admin?'admin':'app'}.`)))
			.then(() => appData.PluginsLink ? loadScript(qUri(appData.PluginsLink)) : Promise.resolve())
			.then(() => rl.app
				? cb()
				: doc.addEventListener('readystatechange', () => 'complete' == doc.readyState && cb())
			)
			.catch(e => {
				showError(e);
				throw e;
			});
	})
	.catch(e => showError(e));
}

})(document);
