(rl => {
	addEventListener('rl-view-model.create', e => {
		if ('MailMessageView' === e.detail.viewModelTemplateID) {
			let view = e.detail;
			view.saveNextcloudError = ko.observable(false).extend({ falseTimeout: 7000 });
			view.saveNextcloudLoading = ko.observable(false);
			view.saveNextcloud = () => {
				const
					hashes = (view.message()?.attachments || [])
					.map(item => item?.checked() /*&& !item?.isLinked()*/ ? item.download : '')
					.filter(v => v);
				if (hashes.length) {
					rl.fetchJSON('./?/Json/&q[]=/0/', {}, {
						Action: 'AttachmentsActions',
						Do: 'nextcloud',
						Hashes: hashes
					})
					.then(result => {
						if (result?.Result) {
							// success
						} else {
							view.saveNextcloudError(true);
						}
					})
					.catch(() => view.saveNextcloudError(true));
				}
			};
		}
	});

	let template = document.getElementById('MailMessageView');
	const attachmentsControls = template.content.querySelector('.attachmentsControls');
	if (attachmentsControls) {
		attachmentsControls.append(Element.fromHTML('<span>'
			+ '<i class="fontastic iconcolor-red" data-bind="visible: saveNextcloudError">✖</i>'
			+ '<i class="fontastic" data-bind="visible: !saveNextcloudError(), css: {\'icon-spinner\': saveNextcloudLoading()}">💾</i>'
			+ '<span class="g-ui-link" data-bind="click: saveNextcloud" data-i18n="NEXTCLOUD/SAVE_ATTACHMENTS">Save Nextcloud</span>'
		+ '</span>'));
	}
})(window.rl);
