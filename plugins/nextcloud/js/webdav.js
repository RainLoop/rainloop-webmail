(rl => {

const
	namespace = 'DAV:',
	nsCalDAV = 'urn:ietf:params:xml:ns:caldav',

	propfindFiles = `<?xml version="1.0"?>
<d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
  <d:prop>
		<d:resourcetype/>
		<oc:size/>
		<d:getcontentlength/>
  </d:prop>
</d:propfind>`,

	propfindCal = `<?xml version="1.0"?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
		<d:resourcetype/>
		<d:current-user-privilege-set/>
		<d:displayname/>
  </d:prop>
</d:propfind>`,

	xmlParser = new DOMParser(),
	pathRegex = /.*\/remote.php\/dav\/[^/]+\/[^/]+/g,

	getDavElementsByTagName = (parent, localName) => parent.getElementsByTagNameNS(namespace, localName),
	getDavElementByTagName = (parent, localName) => getDavElementsByTagName(parent, localName)?.item(0),
	getElementByTagName = (parent, localName) => +parent.getElementsByTagName(localName)?.item(0),

	davFetch = (mode, path, options) => {
		if (!parent.OC.requestToken) {
			return Promise.reject(new Error('OC.requestToken missing'));
		}
		let cfg = rl.settings.get('Nextcloud');
		options = Object.assign({
			mode: 'same-origin',
			cache: 'no-cache',
			redirect: 'error',
			credentials: 'same-origin',
			headers: {}
		}, options);
		options.headers.requesttoken = parent.OC.requestToken;
//		cfg.UID = document.head.dataset.user
		return fetch(cfg.WebDAV + '/' + mode + '/' + cfg.UID + path, options);
	},

	davFetchFiles = (path, options) => davFetch('files', path, options),

	createDirectory = path => davFetchFiles(path, { method: 'MKCOL' }),

	fetchFiles = path => {
		if (!parent.OC.requestToken) {
			return Promise.reject(new Error('OC.requestToken missing'));
		}
		return davFetchFiles(path, {
			method: 'PROPFIND',
			headers: {
				'Content-Type': 'application/xml; charset=utf-8'
			},
			body: propfindFiles
		})
		.then(response => (response.status < 400) ? response.text() : Promise.reject(new Error({ response })))
		.then(text => {
			const
				elemList = [],
				responseList = getDavElementsByTagName(
					xmlParser.parseFromString(text, 'application/xml').documentElement,
					'response'
				);
			path = path.replace(/\/$/, '');
			for (let i = 0; i < responseList.length; ++i) {
				const
					e = responseList.item(i),
					elem = {
						name: decodeURIComponent(getDavElementByTagName(e, 'href').textContent
							.replace(pathRegex, '').replace(/\/$/, '')),
						isFile: false
					};
				if (getDavElementsByTagName(getDavElementByTagName(e, 'resourcetype'), 'collection').length) {
					// skip current directory
					if (elem.name === path) {
						continue;
					}
				} else {
					elem.isFile = true;
					elem.size = getDavElementByTagName(e, 'getcontentlength')?.textContent
						|| getElementByTagName(e, 'oc:size')?.textContent;
				}
				elemList.push(elem);
			}
			return Promise.resolve(elemList);
		});
	},

	buildTree = (view, parent, items, path) => {
		if (items.length) {
			items.forEach(item => {
				if (!item.isFile) {
					let li = document.createElement('li'),
						details = document.createElement('details'),
						summary = document.createElement('summary'),
						ul = document.createElement('ul');
					details.addEventListener('toggle', () => {
						ul.children.length
						|| fetchFiles(item.name).then(items => buildTree(view, ul, items, item.name));
					});
					summary.textContent = item.name.replace(/^.*\/([^/]+)$/, '$1');
					summary.dataset.icon = '📁';
					if (!view.files()) {
						let btn = document.createElement('button');
						btn.item_name = item.name;
						btn.name = 'select';
						btn.textContent = 'select';
						btn.className = 'button-vue';
						btn.style.marginLeft = '1em';
						summary.append(btn);
					}
					details.append(summary);
					details.append(ul);
//					a.append('- ' + item.name.replace(/^\/+/, ''));
					li.append(details);
					parent.append(li);
				}
			});
			if (view.files()) {
				items.forEach(item => {
					if (item.isFile) {
						// TODO show files
						let li = document.createElement('li'),
							btn = document.createElement('button');
						btn.item = item;
						btn.name = 'select';
						btn.textContent = 'select';
						btn.className = 'button-vue';
						btn.style.marginLeft = '1em';
						li.textContent = item.name.replace(/^.*\/([^/]+)$/, '$1');
						li.dataset.icon = '🗎';
						li.append(btn);
						parent.append(li);
					}
				});
			}
		}
		if (!view.files()) {
			let li = document.createElement('li'),
				input = document.createElement('input'),
				btn = document.createElement('button');
			btn.name = 'create';
			btn.textContent = 'create & select';
			btn.className = 'button-vue';
			btn.item_name = path;
			btn.input = input;
			li.append(input);
			li.append(btn);
			parent.append(li);
		}
	};

class NextcloudFilesPopupView extends rl.pluginPopupView {
	constructor() {
		super('NextcloudFiles');
		this.addObservables({
			files: false
		});
	}

	onBuild(dom) {
		this.tree = dom.querySelector('#sm-nc-files-tree');
		this.tree.addEventListener('click', event => {
			let el = event.target;
			if (el.matches('button')) {
				if ('select' == el.name) {
					this.select = this.files() ? [el.item] : el.item_name;
					this.close();
				} else if ('create' == el.name) {
					let name = el.input.value.replace(/[|\\?*<":>+[]\/&\s]/g, '');
					if (name.length) {
						name = el.item_name + '/' + name;
						createDirectory(name).then(response => {
							if (response.status == 201) {
								this.select = name;
								this.close();
							}
						});
					}
				}
			}
		});
	}

	// Happens after showModal()
	beforeShow(files, fResolve) {
		this.select = '';
		this.files(!!files);
		this.fResolve = fResolve;

		this.tree.innerHTML = '';
		fetchFiles('/').then(items => {
			buildTree(this, this.tree, items, '/');
		}).catch(err => console.error(err))
	}

	onHide() {
		this.fResolve(this.select);
	}
/*
beforeShow() {} // Happens before showModal()
onShow() {}     // Happens after  showModal()
afterShow() {}  // Happens after  showModal() animation transitionend
onHide() {}     // Happens before animation transitionend
afterHide() {}  // Happens after  animation transitionend
close() {}
*/
}

class NextcloudCalendarsPopupView extends rl.pluginPopupView {
	constructor() {
		super('NextcloudCalendars');
	}

	onBuild(dom) {
		this.tree = dom.querySelector('#sm-nc-calendars');
		this.tree.addEventListener('click', event => {
			let el = event.target;
			if (el.matches('button')) {
				this.select = el.href;
				this.close();
			}
		});
	}

	// Happens after showModal()
	beforeShow(fResolve) {
		this.select = '';
		this.fResolve = fResolve;
		this.tree.innerHTML = '';
		davFetch('calendars', '/', {
			method: 'PROPFIND',
			headers: {
				'Content-Type': 'application/xml; charset=utf-8'
			},
			body: propfindCal
		})
		.then(response => (response.status < 400) ? response.text() : Promise.reject(new Error({ response })))
		.then(text => {
			const
				responseList = getDavElementsByTagName(
					xmlParser.parseFromString(text, 'application/xml').documentElement,
					'response'
				);
			for (let i = 0; i < responseList.length; ++i) {
				const e = responseList.item(i);
				if (getDavElementByTagName(e, 'resourcetype').getElementsByTagNameNS(nsCalDAV, 'calendar').length) {
//				 && getDavElementsByTagName(getDavElementByTagName(e, 'current-user-privilege-set'), 'write').length) {
					const li = document.createElement('li'),
						btn = document.createElement('button');
					li.dataset.icon = '📅';
					li.textContent = getDavElementByTagName(e, 'displayname').textContent;
					btn.href = getDavElementByTagName(e, 'href').textContent
						.replace(pathRegex, '').replace(/\/$/, '');
					btn.textContent = 'select';
					btn.className = 'button-vue';
					btn.style.marginLeft = '1em';
					li.append(btn);
					this.tree.append(li);
				}
			}
		})
		.catch(err => console.error(err));
	}

	onHide() {
		this.fResolve(this.select);
	}
/*
beforeShow() {} // Happens before showModal()
onShow() {}     // Happens after  showModal()
afterShow() {}  // Happens after  showModal() animation transitionend
onHide() {}     // Happens before animation transitionend
afterHide() {}  // Happens after  animation transitionend
close() {}
*/
}

rl.nextcloud = {
	selectCalendar: () =>
		new Promise(resolve => {
			NextcloudCalendarsPopupView.showModal([
				href => resolve(href),
			]);
		}),

	calendarPut: (path, event) => {
		// Validation error in iCalendar: A calendar object on a CalDAV server MUST NOT have a METHOD property.
		event = event.replace(/METHOD:.+\r?\n/i, '');

		let m = event.match(/UID:(.+)/);
		davFetch('calendars', path + '/' + m[1] + '.ics', {
			method: 'PUT',
			headers: {
				'Content-Type': 'text/calendar'
			},
			body: event
		})
		.then(response => (response.status < 400) ? response.text() : Promise.reject(new Error({ response })))
		.then(text => {
			console.dir({event_response:text});
		});
	},

	selectFolder: () =>
		new Promise(resolve => {
			NextcloudFilesPopupView.showModal([
				false,
				folder => resolve(folder),
			]);
		}),

	selectFiles: () =>
		new Promise(resolve => {
			NextcloudFilesPopupView.showModal([
				true,
				files => resolve(files),
			]);
		})
};

})(window.rl);
