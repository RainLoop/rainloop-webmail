(rl => {

const
	nsDAV = 'DAV:',
	nsNC = 'http://nextcloud.org/ns',
	nsOC = 'http://owncloud.org/ns',
	nsOCS = 'http://open-collaboration-services.org/ns',
	nsCalDAV = 'urn:ietf:params:xml:ns:caldav',

	OC = () => parent.OC,

	// Nextcloud 19 deprecated generateUrl, but screw `import { generateUrl } from "@nextcloud/router"`
	shareUrl = () => OC().webroot + '/ocs/v2.php/apps/files_sharing/api/v1/shares',
	generateUrl = path => OC().webroot + (OC().config.modRewriteWorking ? '' : '/index.php') + path,
	generateRemoteUrl = path => location.protocol + '//' + location.host + generateUrl(path),

//	shareTypes = {0 = user, 1 = group, 3 = public link}

	propfindFiles = `<?xml version="1.0"?>
<propfind xmlns="DAV:" xmlns:oc="${nsOC}" xmlns:ocs="${nsOCS}" xmlns:nc="${nsNC}">
	<prop>
		<oc:fileid/>
		<oc:size/>
		<resourcetype/>
		<getcontentlength/>
		<ocs:share-permissions/>
		<oc:share-types/>
	</prop>
</propfind>`,

	propfindCal = `<?xml version="1.0"?>
<propfind xmlns="DAV:">
	<prop>
		<resourcetype/>
		<current-user-privilege-set/>
		<displayname/>
	</prop>
</propfind>`,

	xmlParser = new DOMParser(),
	pathRegex = /.*\/remote.php\/dav\/[^/]+\/[^/]+/g,

	getElementsByTagName = (parent, namespace, localName) => parent.getElementsByTagNameNS(namespace, localName),
	getDavElementsByTagName = (parent, localName) => getElementsByTagName(parent, nsDAV, localName),
	getDavElementByTagName = (parent, localName) => getDavElementsByTagName(parent, localName)?.item(0),
	getElementByTagName = (parent, localName) => +parent.getElementsByTagName(localName)?.item(0),

	ncFetch = (path, options) => {
		if (!OC().requestToken) {
			return Promise.reject(new Error('OC.requestToken missing'));
		}
		options = Object.assign({
			mode: 'same-origin',
			cache: 'no-cache',
			redirect: 'error',
			credentials: 'same-origin',
			headers: {}
		}, options);
		options.headers.requesttoken = OC().requestToken;
		return fetch(path, options);
	},

	davFetch = (mode, path, options) => {
		let cfg = rl.settings.get('Nextcloud');
//		cfg.UID = document.head.dataset.user
		return ncFetch(cfg.WebDAV + '/' + mode + '/' + cfg.UID + path, options);
	},

	davFetchFiles = (path, options) => davFetch('files', path, options),

	createDirectory = path => davFetchFiles(path, { method: 'MKCOL' }),

	fetchFiles = path => {
		if (!OC().requestToken) {
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
					elem.id = e.getElementsByTagNameNS(nsOC, 'fileid')?.item(0)?.textContent;
					elem.size = getDavElementByTagName(e, 'getcontentlength')?.textContent
						|| getElementByTagName(e, 'oc:size')?.textContent;
					elem.shared = [...e.getElementsByTagNameNS(nsOC, 'share-type')].some(node => '3' == node.textContent);
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
						btn.name = 'select';
						btn.textContent = 'select';
						btn.className = 'button-vue';
						summary.append(btn);
						summary.item_name = item.name;
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
						let li = document.createElement('li'),
							cb = document.createElement('input');

						li.item = item;
						li.textContent = item.name.replace(/^.*\/([^/]+)$/, '$1');
						li.dataset.icon = '🗎';

						cb.type = 'checkbox';
						li.append(cb);

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
			btn.input = input;
			li.item_path = path;
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

	attach() {
		this.select = [];
		this.tree.querySelectorAll('input').forEach(input =>
			input.checked && this.select.push(input.parentNode.item)
		);
		this.close();
	}

	shareInternal() {
		this.select = [];
		this.tree.querySelectorAll('input').forEach(input =>
			input.checked && this.select.push({url:generateRemoteUrl(`/f/${input.parentNode.item.id}`)})
		);
		this.close();
	}

	sharePublic() {
		const inputs = [...this.tree.querySelectorAll('input')],
			loop = () => {
				if (!inputs.length) {
					this.close();
					return;
				}
				const input = inputs.pop();
				if (!input.checked) {
					loop();
				} else {
					const item = input.parentNode.item;
					if (item.shared) {
						ncFetch(
							shareUrl() + `?format=json&path=${encodeURIComponent(item.name)}&reshares=true`
						)
						.then(response => (response.status < 400) ? response.json() : Promise.reject(new Error({ response })))
						.then(json => {
							this.select.push({url:json.ocs.data[0].url});
							loop();
//							json.data[0].password
						});
					} else {
						ncFetch(
							shareUrl(),
							{
								method:'POST',
								headers: {
									Accept: 'application/json',
									'Content-Type': 'application/json'
								},
								body: JSON.stringify({
									path:item.name,
									shareType:3,
									attributes:"[]"
								})
							}
						)
						.then(response => (response.status < 400) ? response.json() : Promise.reject(new Error({ response })))
						.then(json => {
//							PUT /ocs/v2.php/apps/files_sharing/api/v1/shares/2 {"password":"ABC09"}
							this.select.push({url:json.ocs.data.url});
							loop();
						});
					}
				}
			};

		this.select = [];
		loop();
	}

	onBuild(dom) {
		this.tree = dom.querySelector('#sm-nc-files-tree');
		this.tree.addEventListener('click', event => {
			let el = event.target;
			if (el.matches('button')) {
				let parent = el.parentNode;
				if ('select' == el.name) {
					this.select = parent.item_name;
					this.close();
				} else if ('create' == el.name) {
					let name = el.input.value.replace(/[|\\?*<":>+[]\/&\s]/g, '');
					if (name.length) {
						name = parent.item_path + '/' + name;
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
		davFetch('calendars', path + '/' + event.UID + '.ics', {
			method: 'PUT',
			headers: {
				'Content-Type': 'text/calendar'
			},
			// Validation error in iCalendar: A calendar object on a CalDAV server MUST NOT have a METHOD property.
			body: event.rawText
				.replace('METHOD:', 'X-METHOD:')
				// https://github.com/nextcloud/calendar/issues/4684
				.replace('ATTENDEE:', 'X-ATTENDEE:')
				.replace('ORGANIZER:', 'X-ORGANIZER:')
				.replace(/RSVP=TRUE/g, 'RSVP=FALSE')
				.replace(/\r?\n/g, '\r\n')
		})
		.then(response => {
			if (201 == response.status) {
				// Created
			} else if (204 == response.status) {
				// Not modified
			} else {
//				response.text().then(text => console.error({status:response.status, body:text}));
				Promise.reject(new Error({ response }));
			}
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
