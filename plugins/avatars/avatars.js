(rl => {
	const
		queue = [],
		avatars = new Map,
		templateId = 'MailMessageView',
		getAvatarUid = msg => {
			let from = msg.from[0],
				bimi = 'pass' == from.dkimStatus ? 1 : 0;
			return `${bimi}/${from.email.toLowerCase()}`;
		},
		getAvatar = msg => avatars.get(getAvatarUid(msg)),
		runQueue = (() => {
			let item = queue.shift();
			while (item) {
				let url = getAvatar(item[0]);
				if (url) {
					item[1](url);
					item = queue.shift();
				} else {
					// TODO: fetch vCard from Nextcloud contacts
//					let cfg = rl.settings.get('Nextcloud'),

					let from = item[0].from[0];
					rl.pluginRemoteRequest((iError, data) => {
						if (!iError && data?.Result.type) {
							url = `data:${data.Result.type};base64,${data.Result.data}`;
							avatars.set(getAvatarUid(item[0]), url);
							item[1](url);
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

	ko.bindingHandlers.fromPic = {
		init: (element, self, dummy, msg) => {
			if (msg) {
				let url = getAvatar(msg),
					fn = url=>{element.src = url};
				if (url) {
					fn(url);
				} else if (msg.avatar) {
					let bimi = 'pass' == msg.from[0].dkimStatus ? 1 : 0;
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
