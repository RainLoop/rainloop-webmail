
(rl => {

	addEventListener('rl-view-model', e => {
		if (e.detail && 'Login' === e.detail.viewModelTemplateID) {
			const container = e.detail.viewModelDom.querySelector('#plugin-Login-BottomControlGroup'),
				placeholder = 'PLUGIN_2FA/LABEL_TWO_FACTOR_CODE';
			if (container) {
				container.prepend(Element.fromHTML('<div class="controls">'
					+ '<span class="fontastic">⏱</span>'
					+ '<input name="totp_code" type="text" class="input-block-level"'
					+ ' pattern="[0-9]*" inputmode="numeric"'
					+ ' autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false"'
					+ ' data-bind="textInput: totp, disable: submitRequest" data-i18n="[placeholder]'+placeholder
					+ '" placeholder="'+rl.i18n(placeholder)+'">'
				+ '</div>'));
			}
		}
	});

	// https://github.com/the-djmaze/snappymail/issues/349
	let code;
	addEventListener('sm-user-login', e => {
		code = e.detail.get('totp_code');
	});
	addEventListener('sm-user-login-response', e => {
		if (e.detail && !e.detail.error && rl.settings.get('RequireTwoFactor') && !code) {
			document.location.hash = '#/settings/two-factor-auth';
		}
	});

})(window.rl);
