(rl => {

	const
		queue = [],
		avatars = new Map,
		ncAvatars = new Map,
		templateId = 'MailMessageView',
		getAvatarUid = msg => {
			let from = msg.from[0],
				bimi = 'pass' == from.dkimStatus ? 1 : 0;
			return `${bimi}/${from.email.toLowerCase()}`;
		},
		getAvatar = msg => ncAvatars.get(msg.from[0].email.toLowerCase()) || avatars.get(getAvatarUid(msg)),
		runQueue = (() => {
			let item = queue.shift();
			while (item) {
				let url = getAvatar(item[0]);
				if (url) {
					item[1](url);
					item = queue.shift();
				} else {
					let from = item[0].from[0];
					rl.pluginRemoteRequest((iError, data) => {
						if (!iError && data?.Result.type) {
							url = `data:${data.Result.type};base64,${data.Result.data}`;
							avatars.set(getAvatarUid(item[0]), url);
							item[1](url);
						} else if (window.identiconSvg) {
							window.identiconSvg(from.email).then(svg => {
								url = 'data:image/svg+xml;base64,'+btoa(svg);
								avatars.set(getAvatarUid(item[0]), url);
								item[1](url);
							});
						}
						runQueue();
					}, 'Avatar', {
						bimi: 'pass' == from.dkimStatus ? 1 : 0,
						email: from.email
					});
					break;
				}
			}
		}).debounce(1000);

	/**
	 * Loads images from Nextcloud contacts
	 */
	addEventListener('DOMContentLoaded', () => {
		if (parent.OC) {
			const OC = () => parent.OC,
				nsDAV = 'DAV:',
				nsNC = 'http://nextcloud.com/ns',
				nsCard = 'urn:ietf:params:xml:ns:carddav',
				getElementsByTagName = (parent, namespace, localName) => parent.getElementsByTagNameNS(namespace, localName),
				getElementValue = (parent, namespace, localName) =>
					getElementsByTagName(parent, namespace, localName)?.item(0)?.textContent,
				generateUrl = path => OC().webroot + '/remote.php' + path;
			if (OC().requestToken) {
				fetch(generateUrl(`/dav/addressbooks/users/${OC().currentUser}/contacts/`), {
					mode: 'same-origin',
					cache: 'no-cache',
					redirect: 'error',
					credentials: 'same-origin',
					method: 'REPORT',
					headers: {
						requesttoken: OC().requestToken,
						'Content-Type': 'application/xml; charset=utf-8',
						Depth: 1
					},
					body: '<x4:addressbook-query xmlns:x4="urn:ietf:params:xml:ns:carddav"><x0:prop xmlns:x0="DAV:"><x4:address-data><x4:prop name="EMAIL"/></x4:address-data><x3:has-photo xmlns:x3="http://nextcloud.com/ns"/></x0:prop></x4:addressbook-query>'
				})
				.then(response => (response.status < 400) ? response.text() : Promise.reject(new Error({ response })))
				.then(text => {
					const
						xmlParser = new DOMParser(),
						responseList = getElementsByTagName(
							xmlParser.parseFromString(text, 'application/xml').documentElement,
							nsDAV,
							'response');
					for (let i = 0; i < responseList.length; ++i) {
						const item = responseList.item(i);
						if (1 == getElementValue(item, nsNC, 'has-photo')) {
							[...getElementValue(item, nsCard, 'address-data').matchAll(/EMAIL.*?:([^@\r\n]+@[^@\r\n]+)/g)].forEach(match => {
								ncAvatars.set(
									match[1].toLowerCase(),
									getElementValue(item, nsDAV, 'href') + '?photo'
								);
							});
						}
					}
				});
			}
		}
	});

	ko.bindingHandlers.fromPic = {
		init: (element, self, dummy, msg) => {
			if (msg) {
				let url = getAvatar(msg),
					fn = url=>{element.src = url};
				if (url) {
					fn(url);
				} else if (msg.avatar) {
					let bimi = 'pass' == msg.from[0].dkimStatus ? 1 : 0;
					if (window.identiconSvg) {
						element.onerror = () => {
							window.identiconSvg(msg.from[0].email).then(svg =>
								fn('data:image/svg+xml;base64,'+btoa(svg))
							);
						}
					}
					fn(`?Avatar/${bimi}/${msg.avatar}`);
				} else {
					queue.push([msg, fn]);
					runQueue();
				}
			}
		}
	};

	addEventListener('rl-view-model.create', e => {
		if (templateId === e.detail.viewModelTemplateID) {

			const
				template = document.getElementById(templateId),
				messageItemHeader = template.content.querySelector('.messageItemHeader');

			if (messageItemHeader) {
				messageItemHeader.prepend(Element.fromHTML(
					`<img class="fromPic" data-bind="visible: viewUserPicVisible, attr: {'src': viewUserPic() }" loading="lazy">`
				));
			}

			let view = e.detail;
			view.viewUserPic = ko.observable('');
			view.viewUserPicVisible = ko.observable(false);

			view.message.subscribe(msg => {
				view.viewUserPicVisible(false);
				if (msg) {
					let url = getAvatar(msg),
						fn = url => {
							view.viewUserPic(url);
							view.viewUserPicVisible(true);
						};
					if (url) {
						fn(url);
					} else if (msg.avatar) {
						let bimi = 'pass' == msg.from[0].dkimStatus ? 1 : 0;
						fn(`?Avatar/${bimi}/${msg.avatar}`);
					} else {
//						let from = msg.from[0], bimi = 'pass' == from.dkimStatus ? 1 : 0;
//						view.viewUserPic(`?Avatar/${bimi}/${encodeURIComponent(from.email)}`);
//						view.viewUserPicVisible(true);
						queue.push([msg, fn]);
						runQueue();
					}
				}
			});
		}

		if ('MailMessageList' === e.detail.viewModelTemplateID) {
			document.getElementById('MailMessageList').content.querySelector('.messageCheckbox')
				.append(Element.fromHTML(`<img class="fromPic" data-bind="fromPic:$data" loading="lazy">`));
		}
	});

})(window.rl);
