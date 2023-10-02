
(rl => {

	const
		forceTOTP = () => {
			if (rl.settings.get('SetupTwoFactor')) {
				setTimeout(() => document.location.hash = '#/settings/two-factor-auth', 50);
			}
		};

	addEventListener('rl-view-model', e => {
		if ('Login' === e.detail.viewModelTemplateID) {
			const container = e.detail.viewModelDom.querySelector('#plugin-Login-BottomControlGroup'),
				placeholder = 'PLUGIN_2FA/LABEL_TWO_FACTOR_CODE';
			if (container) {
				container.prepend(Element.fromHTML('<div class="controls">'
					+ '<span class="fontastic">⏱</span>'
					+ '<input name="totp_code" type="text" class="input-block-level"'
					+ ' pattern="[0-9]*" inputmode="numeric"'
					+ ' autocomplete="one-time-code" autocorrect="off" autocapitalize="none"'
					+ ' data-bind="textInput: totp, disable: submitRequest" data-i18n="[placeholder]'+placeholder
					+ '" placeholder="'+rl.i18n(placeholder)+'">'
				+ '</div>'));
			}
		}
	});

	// https://github.com/the-djmaze/snappymail/issues/349
	addEventListener('sm-show-screen', e => {
		if ('settings' !== e.detail && rl.settings.get('SetupTwoFactor')) {
			e.preventDefault();
			forceTOTP();
		}
	});

})(window.rl);
