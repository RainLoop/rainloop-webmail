(rl => {

	const size = 50;

	window.identiconSvg = (hash, txt) => {
		// color defaults to last 7 chars as hue at 70% saturation, 50% brightness
		// hsl2rgb adapted from: https://gist.github.com/aemkei/1325937
		let h = (parseInt(hash.substr(-7), 16) / 0xfffffff) * 6, s = 0.7, l = 0.5,
			v = [
				l += s *= l < .5 ? l : 1 - l,
				l - h % 1 * s * 2,
				l -= s *= 2,
				l,
				l + h % 1 * s,
				l + s
			],
			m = txt ? 128 : 200,
			color = 'rgb(' + [
				v[ ~~h % 6 ] * m, // red
				v[ (h | 16) % 6 ] * m, // green
				v[ (h |  8) % 6 ] * m // blue
			].map(Math.round).join(',') + ')';

		if (txt) {
			return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}px" height="${size}px" viewBox="0 0 ${size} ${size}" version="1.1">
				<circle fill="${color}" width="${size}" height="${size}" cx="${size/2}" cy="${size/2}" r="${size/2}"/>
				<text x="${size}%" y="${size}%" style="color:#FFF" alignment-baseline="middle" text-anchor="middle"
					 font-weight="bold" font-size="${Math.round(size*0.5)}"
					 dy=".1em" dominant-baseline="middle" fill="#FFF">${txt}</text>
				</svg>`;
		}
		return `<svg version="1.1" width="412" height="412" viewBox="0 0 412 412" xmlns="http://www.w3.org/2000/svg">
			<path fill="${color}" d="m 404.4267,343.325 c -5.439,-16.32 -15.298,-32.782 -29.839,-42.362 -27.979,-18.572 -60.578,-28.479 -92.099,-39.085 -7.604,-2.664 -15.33,-5.568 -22.279,-9.7 -6.204,-3.686 -8.533,-11.246 -9.974,-17.886 -0.636,-3.512 -1.026,-7.116 -1.228,-10.661 22.857,-31.267 38.019,-82.295 38.019,-124.136 0,-65.298 -36.896,-83.495 -82.402,-83.495 -45.515,0 -82.403,18.17 -82.403,83.468 0,43.338 16.255,96.5 40.489,127.383 -0.221,2.438 -0.511,4.876 -0.95,7.303 -1.444,6.639 -3.77,14.058 -9.97,17.743 -6.957,4.133 -14.682,6.756 -22.287,9.42 -31.520996,10.605 -64.118996,19.957 -92.090996,38.529 -14.549,9.58 -24.403,27.159 -29.838,43.479 -5.597,16.938 -7.88600003,37.917 -7.54100003,54.917 H 205.9917 411.9657 c 0.348,-16.999 -1.946,-37.978 -7.539,-54.917 z"/>
		</svg>`;
	};

	let isMobile;

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
		hash = async txt => {
			if (/^[0-9a-f]{15,}$/i.test(txt)) {
				return txt;
			}
			const hashArray = Array.from(new Uint8Array(
//				await crypto.subtle.digest('SHA-256', (new TextEncoder()).encode(txt.toLowerCase()))
				await crypto.subtle.digest('SHA-1', (new TextEncoder()).encode(txt.toLowerCase()))
			));
			return hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
		},
		fromChars = from =>
//			(from.name?.split(/[^\p{Lu}]+/gu) || []).reduce((a, s) => a + (s || '')), '')
			(from.name?.split(/[^\p{L}]+/gu) || []).reduce((a, s) => a + (s[0] || ''), '')
			.slice(0,2)
			.toUpperCase(),
		setIdenticon = (from, fn) => hash(from.email).then(hash =>
			fn('data:image/svg+xml;base64,' + btoa(window.identiconSvg(hash, fromChars(from))))
		),
		addQueue = (msg, fn) => {
			setIdenticon(msg.from[0], fn);
			if (rl.pluginSettingsGet('avatars', 'delay')) {
				queue.push([msg, fn]);
				runQueue();
			}
		},
		runQueue = (() => {
			let item = queue.shift();
			while (item) {
				let url = getAvatar(item[0]),
					uid = getAvatarUid(item[0]);
				if (url) {
					item[1](url);
					item = queue.shift();
				} else if (!avatars.has(uid)) {
					let from = item[0].from[0];
					rl.pluginRemoteRequest((iError, data) => {
						if (!iError && data?.Result.type) {
							url = `data:${data.Result.type};base64,${data.Result.data}`;
							avatars.set(uid, url);
							item[1](url);
						} else {
							avatars.set(uid, '');
						}
						runQueue();
					}, 'Avatar', {
						bimi: 'pass' == from.dkimStatus ? 1 : 0,
						email: from.email
					});
					break;
				} else {
					runQueue();
					break;
				}
			}
		}).debounce(1000);

	/**
	 * Loads images from Nextcloud contacts
	 */
	addEventListener('DOMContentLoaded', () => {
//		rl.pluginSettingsGet('avatars', 'nextcloud');
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
							[...getElementValue(item, nsCard, 'address-data').matchAll(/EMAIL.*?:([^@\r\n]+@[^@\r\n]+)/g)]
							.forEach(match => {
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
			try {
				if (msg?.from?.[0]) {
					let url = getAvatar(msg),
						from = msg.from[0],
						fn = url=>{element.src = url};
					if (url) {
						fn(url);
					} else if (msg.avatar || isMobile()) {
						if (msg.avatar?.startsWith('data:')) {
							fn(msg.avatar);
						} else if (isMobile()) {
							setIdenticon(from, fn);
						} else {
							element.onerror = () => setIdenticon(from, fn);
							fn(`?Avatar/${'pass' == from.dkimStatus ? 1 : 0}/${msg.avatar}`);
						}
					} else {
						addQueue(msg, fn);
					}
				}
			} catch (e) {
				console.error(e);
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
						fn(msg.avatar.startsWith('data:') ? msg.avatar
							: `?Avatar/${'pass' == msg.from[0].dkimStatus ? 1 : 0}/${msg.avatar}`);
					} else {
//						let from = msg.from[0];
//						view.viewUserPic(`?Avatar/${'pass' == from.dkimStatus ? 1 : 0}/${encodeURIComponent(from.email)}`);
//						view.viewUserPicVisible(true);
						addQueue(msg, fn);
					}
				}
			});
		}

		if ('MailMessageList' === e.detail.viewModelTemplateID) {
			isMobile = e.detail.isMobile;
			document.getElementById('MailMessageList').content.querySelectorAll('.messageCheckbox')
				.forEach(el => el.append(Element.fromHTML(`<img class="fromPic" data-bind="fromPic:$data" loading="lazy">`)));
		}
	});

})(window.rl);
