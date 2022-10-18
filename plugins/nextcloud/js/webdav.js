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

	function fetchFiles(xml, path)
	{
		if (!parent.OC.requestToken) {
			return Promise.reject(new Error('OC.requestToken missing'));
		}
		let cfg = rl.settings.get('Nextcloud');
		return fetch(cfg.WebDAV + '/files/' + cfg.UID + path, {
			method: 'PROPFIND',
			mode: 'same-origin',
			cache: 'no-cache',
			redirect: 'error',
			credentials: 'same-origin',
			headers: {
				'Content-Type': 'application/xml; charset=utf-8',
				requesttoken: parent.OC.requestToken
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

	class NextcloudFilesPopupView extends rl.pluginPopupView {
		constructor() {
			super('NextcloudFiles');
			this.addObservables({
				folder: '',
				files: false
			});
		}

		onShow(files, fResolve) {
			this.files(!!files);
			this.fResolve = fResolve;
		}

		select() {
			this.close();
			this.fResolve(this.folder());
		}

		onClose() {
			this.close();
			this.fResolve();
			return false;
		}
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
