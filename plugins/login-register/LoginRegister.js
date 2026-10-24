
(rl => {
	if (rl) {
		const
			forgotUrl = rl.settings.get('forgotPasswordLinkUrl'),
			registerUrl = rl.settings.get('registrationLinkUrl');

		if (forgotUrl || registerUrl) {
			addEventListener('rl-view-model', e => {
				if (e.detail && 'Login' === e.detail.viewModelTemplateID) {
					const container = e.detail.viewModelDom.querySelector('#plugin-Login-BottomControlGroup'),
						forgot = 'LOGIN/LABEL_FORGOT_PASSWORD',
						register = 'LOGIN/LABEL_REGISTRATION';
					if (container) {
						let html = '';
						if (forgotUrl) {
							html = html + '<p class="forgot-link">'
								+ '<a href="'+forgotUrl+'" target="_blank" class="g-ui-link" data-i18n="'+forgot+'">'+rl.i18n(forgot)+'</a>'
								+ '</p>';
						}
						if (registerUrl) {
							html = html + '<p class="registration-link">'
								+ '<a href="'+registerUrl+'" target="_blank" class="g-ui-link" data-i18n="'+register+'">'+rl.i18n(register)+'</a>'
								+ '</p>';
						}
						container.append(Element.fromHTML('<div class="controls clearfix">' + html + '</div>'));
					}
				}
			});
		}
	}

})(window.rl);
