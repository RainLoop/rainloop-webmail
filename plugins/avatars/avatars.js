(rl => {
//	if (rl.settings.get('Nextcloud'))
	const
		templateId = 'MailMessageView';
//		DATA_IMAGE_USER_DOT_PIC = 'data:image/svg+xml;utf8,<svg version="1.1" xml:space="preserve" width="74.279999" height="86.666664" viewBox="0 0 74.279999 86.666664" xmlns="http://www.w3.org/2000/svg"><path d="M 557.17264,0 25.567509,-0.90909091 C 3.878663,-1.0561896 0.22727273,-0.69278176 0,92.8594 0,215.105 185.715,278.574 185.715,278.574 c 0,0 10.629,18.985 0,46.426 -39.047,28.785 -43.828,73.824 -46.43,185.715 C 147.316,622.742 225.969,650 278.57,650 331.18,650 409.82,622.793 417.859,510.715 415.262,398.824 410.477,353.785 371.434,325 c -10.637,-27.395 0,-46.426 0,-46.426 0,0 185.711,-63.469 185.711,-185.7146" style="fill:#AAAAAA;fill-opacity:1;fill-rule:nonzero;stroke:none" transform="matrix(0.13333333,0,0,-0.13333333,0,86.666667)"/></svg>';

	addEventListener('rl-view-model.create', e => {
		if (templateId === e.detail.viewModelTemplateID) {

			const
				template = document.getElementById(templateId),
				messageItemHeader = template.content.querySelector('.messageItemHeader');

			if (messageItemHeader) {
				messageItemHeader.prepend(Element.fromHTML(
					`<img class="fromPic" data-bind="visible: viewUserPicVisible, attr: {'src': viewUserPic() }">`
				));
			}

			let view = e.detail;
			view.viewUserPic = ko.observable('');
			view.viewUserPicVisible = ko.observable(false);

			view.message.subscribe(msg => {
				view.viewUserPicVisible(false);
				if (msg) {
					let from = msg.from[0],
						bimi = 'pass' == from.dkimStatus ? 1 : 0;
//					view.viewUserPic(`?Avatar/${bimi}/${encodeURIComponent(from.email)}`);
//					view.viewUserPicVisible(true);
					rl.pluginRemoteRequest((iError, data) => {
						if (!iError && data?.Result.type) {
							view.viewUserPic(`data:${data.Result.type};base64,${data.Result.data}`);
							view.viewUserPicVisible(true);
						}
					}, 'Avatar', {
						bimi: bimi,
						email: from.email
					});
				}
			});
		}
/*
		if ('MailMessageList' === e.detail.viewModelTemplateID) {
			const
				template = document.getElementById('MailMessageList' ),
				messageCheckbox = template.content.querySelector('.messageCheckbox');
			messageCheckbox.dataset.bind = 'attr:{style:$root.viewUserPic($data)}';
			e.detail.viewUserPic = msg => {
				let from = msg.from[0],
					bimi = 'pass' == from.dkimStatus ? 1 : 0;
				return `background:no-repeat url("?Avatar/${bimi}/${encodeURIComponent(from.email)}") center / contain`;
				return `background:no-repeat url("?Avatar/${bimi}/${encodeURIComponent(from.email)}") right / 32px;width:68px`;
			};
			.checkboxMessage {
				background: #000;
			}
		}
*/
	});

})(window.rl);
