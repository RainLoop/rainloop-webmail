
(rl => {

	rl && addEventListener('rl-view-model', e => {
		if (e.detail && 'Login' === e.detail.viewModelTemplateID) {
			const container = e.detail.viewModelDom.querySelector('#plugin-Login-BottomControlGroup'),
				placeholder = 'LOGIN/LABEL_TWO_FACTOR_CODE';
			if (container) {
				container.prepend(Element.fromHTML('<div class="controls">'
					+ '<div class="input-append">'
						+ '<input name="totp_code" type="text" class="input-block-level inputIcon"'
						+ ' pattern="[0-9]*" inputmode="numeric"'
						+ ' autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false"'
						+ ' data-bind="textInput: totp, disable: submitRequest" data-i18n="[placeholder]'+placeholder
						+ '" placeholder="'+rl.i18n(placeholder)+'">'
						+ '<i class="add-on fontastic">🔑</i>'
					+ '</div>'
				+ '</div>'));
			}
		}
	});

})(window.rl);
