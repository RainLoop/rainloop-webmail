(rl => {

const
	namespace = 'DAV:',

	propfindBody = `<?xml version="1.0"?>
<d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns" xmlns:nc="http://nextcloud.org/ns">
  <d:prop>
		<d:resourcetype />
		<oc:size />
		<d:getcontentlength />
  </d:prop>
</d:propfind>`,

	xmlParser = new DOMParser(),
	pathRegex = /.*\/remote.php\/dav\/files\/[^/]+/g,

	getDavElementsByTagName = (parent, localName) => parent.getElementsByTagNameNS(namespace, localName),
	getDavElementByTagName = (parent, localName) => getDavElementsByTagName(parent, localName)?.item(0),
	getElementByTagName = (parent, localName) => +parent.getElementsByTagName(localName)?.item(0),

	davFetch = (path, options) => {
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
		return fetch(cfg.WebDAV + '/files/' + cfg.UID + path, options);
	},

	createDirectory = path => davFetch(path, { method: 'MKCOL' }),

	fetchFiles = path => {
		if (!parent.OC.requestToken) {
			return Promise.reject(new Error('OC.requestToken missing'));
		}
		return davFetch(path, {
			method: 'PROPFIND',
			headers: {
				'Content-Type': 'application/xml; charset=utf-8'
			},
			body: propfindBody
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
						name: decodeURIComponent(getDavElementByTagName(e, 'href').innerHTML)
							.replace(pathRegex, '').replace(/\/$/, ''),
						isFile: false
					}
				if (getDavElementsByTagName(getDavElementByTagName(e, 'resourcetype'), 'collection').length) {
					// skip current directory
					if (elem.name === path) {
						continue;
					}
				} else {
					elem.isFile = true;
					elem.size = getDavElementByTagName(e, 'getcontentlength')?.innerHTML
						|| getElementByTagName(e, 'oc:size')?.innerHTML;
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

rl.ncFiles = {
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
