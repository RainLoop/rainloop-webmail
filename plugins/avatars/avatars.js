(rl => {

	window.identiconSvg = (hash, txt, font) => {
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
			return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" version="1.1">
				<circle fill="${color}" width="${size}" height="${size}" cx="${size/2}" cy="${size/2}" r="${size/2}"/>
				<text x="${size}%" y="${size}%" style="color:#FFF" alignment-baseline="middle" text-anchor="middle"
					 font-weight="bold" font-size="${Math.round(size*0.5)}" font-family="${font.replace(/"/g, "'")}"
					 dy=".1em" dominant-baseline="middle" fill="#FFF">${txt}</text>
				</svg>`;
		}
		return `<svg version="1.1" width="412" height="412" viewBox="0 0 412 412" xmlns="http://www.w3.org/2000/svg">
			<path fill="${color}" d="m 404.4267,343.325 c -5.439,-16.32 -15.298,-32.782 -29.839,-42.362 -27.979,-18.572 -60.578,-28.479 -92.099,-39.085 -7.604,-2.664 -15.33,-5.568 -22.279,-9.7 -6.204,-3.686 -8.533,-11.246 -9.974,-17.886 -0.636,-3.512 -1.026,-7.116 -1.228,-10.661 22.857,-31.267 38.019,-82.295 38.019,-124.136 0,-65.298 -36.896,-83.495 -82.402,-83.495 -45.515,0 -82.403,18.17 -82.403,83.468 0,43.338 16.255,96.5 40.489,127.383 -0.221,2.438 -0.511,4.876 -0.95,7.303 -1.444,6.639 -3.77,14.058 -9.97,17.743 -6.957,4.133 -14.682,6.756 -22.287,9.42 -31.520996,10.605 -64.118996,19.957 -92.090996,38.529 -14.549,9.58 -24.403,27.159 -29.838,43.479 -5.597,16.938 -7.88600003,37.917 -7.54100003,54.917 H 205.9917 411.9657 c 0.348,-16.999 -1.946,-37.978 -7.539,-54.917 z"/>
		</svg>`;
	};

	const
		size = 50,
		getEl = id => document.getElementById(id),
		queue = [],
		avatars = new Map,
		ncAvatars = new Map,
		identicons = new Map,
		templateId = 'MailMessageView',
		b64 = data => btoa(unescape(encodeURIComponent(data))),
		b64url = data => b64(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
		getBimiSelector = msg => {
			// Get 's' value out of 'v=BIMI1; s=foo;'
			let bimiSelector = msg.headers().valueByName('BIMI-Selector');
			bimiSelector = bimiSelector ? bimiSelector.match(/;.*s=([^\s;]+)/)[1] : '';
			return bimiSelector || '';
		},
		getBimiId = msg => ('pass' == msg.from[0].dkimStatus ? 1 : 0) + '-' + getBimiSelector(msg),
		email = msg => msg.from[0].email.toLowerCase(),
		getAvatarUid = msg => `${getBimiId(msg)}/${email(msg)}`,
		getAvatar = msg => ncAvatars.get(email(msg)) || avatars.get(getAvatarUid(msg)),
		getAvatarUri = msg => {
			if ('remote' === msg.avatar) {
				msg.avatar = `?Avatar/${getBimiId(msg)}/${b64url(email(msg))}`;
			}
/*
			else if (!msg.avatar.startsWith('data:')) {
				msg.avatar = null;
			}
*/
			return msg.avatar;
		},

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
		setIdenticon = (msg, fn, cb) => {
			const from = email(msg);
			if (identicons.get(from)) {
				fn(identicons.get(from));
			} else {
				hash(from).then(hash => {
					const uri = 'data:image/svg+xml;base64,' + b64(window.identiconSvg(
						hash,
						fromChars(msg.from[0]),
						window.getComputedStyle(getEl('rl-app'), null).getPropertyValue('font-family')
					));
					fn(uri);
					identicons.set(email(msg), uri);
					cb?.(uri);
				});
			}
		},

		addQueue = (msg, fn) => {
			if (msg.from?.[0]) {
				if (getAvatarUri(msg)) {
					if (rl.pluginSettingsGet('avatars', 'delay')) {
						setIdenticon(msg, fn, ()=>{
							queue.push([msg, fn]);
							runQueue();
						});
					} else {
						fn(msg.avatar);
					}
				} else {
					setIdenticon(msg, fn);
				}
			}
		},
		runQueue = (() => {
			let item = queue.shift();
			while (item) {
				let url = getAvatar(item[0]);
				if (url) {
					item[1](url);
					item = queue.shift();
					continue;
				} else if (item[0].avatar) {
					item[1](item[0].avatar);
				}
				runQueue();
				break;
			}
		}).debounce(1000);

		/**
		 * Modify templates
		 */
		getEl('MailMessageList').content.querySelectorAll('.messageCheckbox')
			.forEach(el => el.append(Element.fromHTML(`<img class="fromPic" data-bind="fromPic:$data" loading="lazy">`)));
		const messageItemHeader = getEl(templateId).content.querySelector('.messageItemHeader');
		if (messageItemHeader) {
			messageItemHeader.prepend(Element.fromHTML(
				`<img class="fromPic" data-bind="visible: viewUserPicVisible, attr: {'src': viewUserPic() }" loading="lazy">`
			));
		}

		/**
		 * Loads images from Nextcloud contacts
		 */
//		rl.pluginSettingsGet('avatars', 'nextcloud');
		if (parent.OC?.requestToken) {
			const OC = parent.OC,
				nsDAV = 'DAV:',
				nsNC = 'http://nextcloud.com/ns',
				nsCard = 'urn:ietf:params:xml:ns:carddav',
				getElementsByTagName = (parent, namespace, localName) => parent.getElementsByTagNameNS(namespace, localName),
				getElementValue = (parent, namespace, localName) =>
					getElementsByTagName(parent, namespace, localName)?.item(0)?.textContent;
			fetch(`${OC.webroot}/remote.php/dav/addressbooks/users/${OC.currentUser}/contacts/`, {
				mode: 'same-origin',
				cache: 'no-cache',
				redirect: 'error',
				credentials: 'same-origin',
				method: 'REPORT',
				headers: {
					requesttoken: OC.requestToken,
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
//	});

	/**
	 * Used by MailMessageList
	 */
	ko.bindingHandlers.fromPic = {
		init: (element, self, dummy, msg) => {
			try {
				if (msg?.from?.[0]) {
					let url = getAvatar(msg),
						fn = url=>{element.src = url};
					element.onerror = ()=>{
						element.onerror = null;
						setIdenticon(msg, fn, uri=>avatars.set(getAvatarUid(msg), uri));
					};
					if (url) {
						fn(url);
					} else if (msg.avatar?.startsWith('data:')) {
						fn(msg.avatar);
					} else {
						element.onload = ()=>{
							if (!element.src.startsWith('data:')) {
								element.onload = null;
								avatars.set(getAvatarUid(msg), element.src);
							}
						};
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
			let view = e.detail;
			view.viewUserPic = ko.observable('');
			view.viewUserPicVisible = ko.observable(false);

			view.message.subscribe(msg => {
				view.viewUserPicVisible(false);
				if (msg) {
					let url = msg.from?.[0] ? getAvatar(msg) : 0,
						fn = url => {
							view.viewUserPic(url);
							view.viewUserPicVisible(true);
						};
					if (url) {
						fn(url);
					} else if (msg.avatar) {
						fn(getAvatarUri(msg));
					} else {
						addQueue(msg, fn);
					}
				}
			});
		}
	});

})(window.rl);
