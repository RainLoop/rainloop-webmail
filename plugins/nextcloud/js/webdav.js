(rl => {

	const
		namespace = 'DAV:',

		propertyRequestBody = `<?xml version="1.0"?>
	<d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns" xmlns:nc="http://nextcloud.org/ns">
	  <d:prop>
			<d:getlastmodified />
			<d:getetag />
			<d:getcontenttype />
			<d:resourcetype />
			<oc:fileid />
			<oc:permissions />
			<oc:size />
			<d:getcontentlength />
			<nc:has-preview />
			<oc:favorite />
			<oc:comments-unread />
			<oc:owner-display-name />
			<oc:share-types />
	  </d:prop>
	</d:propfind>`,

		xmlParser = new DOMParser(),
		pathRegex = /.*\/remote.php\/dav\/files\/[^/]+/g,

		getDavElementsByTagName = (parent, localName) => parent.getElementsByTagNameNS(namespace, localName),
		getDavElementByTagName = (parent, localName) => getDavElementsByTagName(parent, localName)?.item(0),
		getElementByTagName = (parent, localName) => +parent.getElementsByTagName(localName)?.item(0);

	function davFetch(path, options)
	{
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
	}

	function createDirectory(path)
	{
		return davFetch(path, {
			method: 'MKCOL'
		})
		.then(response => response.status == 201);
	}

	function fetchFiles(xml, path)
	{
		if (!parent.OC.requestToken) {
			return Promise.reject(new Error('OC.requestToken missing'));
		}
		return davFetch(path, {
			method: 'PROPFIND',
			headers: {
				'Content-Type': 'application/xml; charset=utf-8'
			},
			body: xml
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
						id: parseInt(getElementByTagName(e, 'oc:fileid')?.innerHTML ?? 0),
						name: decodeURIComponent(getDavElementByTagName(e, 'href').innerHTML)
							.replace(pathRegex, '').replace(/\/$/, ''),
						isFile: false,
						lastmod: getDavElementByTagName(e, 'getlastmodified').innerHTML
					}
				if (getDavElementsByTagName(getDavElementByTagName(e, 'resourcetype'), 'collection').length) {
					// skip current directory
					if (elem.name === path) {
						continue;
					}
				} else {
					elem.isFile = true;
					elem.mime = getDavElementByTagName(e, 'getcontenttype').innerHTML;
					elem.etag = getDavElementByTagName(e, 'getetag').innerHTML;
					elem.size = getDavElementByTagName(e, 'getcontentlength')?.innerHTML;
					if (!elem.size) {
						elem.size = getElementByTagName(e, 'oc:size')?.innerHTML;
					}
					elem.haspreview = getElementByTagName(e, 'nc:has-preview')?.innerHTML === 'true';
				}
				elemList.push(elem);
			}
			return Promise.resolve(elemList);
		});
	}

	function buildTree(view, parent, items)
	{
		let empty = true;
		if (items.length) {
			items.forEach(item => {
				if (item.isFile) {
					if (view.files()) {
						empty = false;
						// TODO show files
					}
				} else {
					empty = false;
					let li = document.createElement('li'),
						details = document.createElement('details'),
						summary = document.createElement('summary'),
						ul = document.createElement('ul'),
						btn = document.createElement('button');
					li.item_name = item.name;
					details.addEventListener('toggle', () => {
						if (!ul.children.length) {
							fetchFiles(propertyRequestBody, item.name).then(items => buildTree(view, ul, items));
						}
					});
					summary.textContent = '📁 ' + item.name.replace(/^.*\/([^/]+)$/, '$1');
					btn.textContent = 'select';
					btn.className = 'button-vue';
					btn.style.marginLeft = '1em';
					summary.append(btn);
					details.append(summary);
					details.append(ul);
//					a.append('- ' + item.name.replace(/^\/+/, ''));
					li.append(details);
					parent.append(li);
				}
			});
		}
		if (empty) {
			let li = document.createElement('li');
			li.append('(empty)');
			parent.append(li);
		}
	}

	class NextcloudFilesPopupView extends rl.pluginPopupView {
		constructor() {
			super('NextcloudFiles');
			this.addObservables({
				folder: '',
				files: false
			});
		}

		onBuild(dom) {
			this.tree = dom.querySelector('#sm-nc-files-tree');
			this.tree.addEventListener('click', event => {
				if (event.target.matches('button')) {
					let li = event.target.closest('li');
					if (li.item_name) {
						this.close();
						this.fResolve(li.item_name);
					}
				}
			});
		}

		// Happens after showModal()
		beforeShow(files, fResolve) {
			this.files(!!files);
			this.fResolve = fResolve;

			this.tree.innerHTML = '';
			fetchFiles(propertyRequestBody, '/').then(items => {
				buildTree(this, this.tree, items);
			}).catch(err => console.error(err))
		}

		onClose() {
			this.close();
			this.fResolve();
			return false;
		}
/*
	onShow() {}     // Happens after  showModal()
	beforeShow() {} // Happens before showModal()
	afterShow() {}  // Happens after  showModal() animation transitionend
	onHide() {}     // Happens before animation transitionend
	afterHide() {}  // Happens after  animation transitionend
	close() {}
*/
	}

	rl.ncFiles = new class {
		async getDirectoryContents(path) {
			return await fetchFiles(propertyRequestBody, path);
		}

		selectFolder() {
			return new Promise(resolve => {
				NextcloudFilesPopupView.showModal([
					false,
					folder => resolve(folder),
				]);
			});
		}

		selectFiles() {
			return new Promise(resolve => {
				NextcloudFilesPopupView.showModal([
					true,
					files => resolve(files),
				]);
			});
		}
	}
})(window.rl);
