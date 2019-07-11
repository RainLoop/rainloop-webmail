import ko from 'ko';
import _ from '_';

import { trim, triggerAutocompleteInputChange } from 'Common/Utils';

import { StorageResultType, Notification, Magics } from 'Common/Enums';
import { getNotification } from 'Common/Translator';
import { $win } from 'Common/Globals';

import * as Settings from 'Storage/Settings';

import Remote from 'Remote/Admin/Ajax';

import { getApp } from 'Helper/Apps/Admin';

import { view, command, ViewType, routeOff } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

@view({
	name: 'View/Admin/Login',
	type: ViewType.Center,
	templateID: 'AdminLogin'
})
class LoginAdminView extends AbstractViewNext {
	constructor() {
		super();

		this.mobile = !!Settings.appSettingsGet('mobile');
		this.mobileDevice = !!Settings.appSettingsGet('mobileDevice');

		this.hideSubmitButton = !!Settings.appSettingsGet('hideSubmitButton');

		this.login = ko.observable('');
		this.password = ko.observable('');

		this.loginError = ko.observable(false);
		this.passwordError = ko.observable(false);

		this.loginErrorAnimation = ko.observable(false).extend({ 'falseTimeout': 500 });
		this.passwordErrorAnimation = ko.observable(false).extend({ 'falseTimeout': 500 });

		this.loginFocus = ko.observable(false);

		this.formHidden = ko.observable(false);

		this.formError = ko.computed(() => this.loginErrorAnimation() || this.passwordErrorAnimation());

		this.login.subscribe(() => this.loginError(false));

		this.password.subscribe(() => this.passwordError(false));

		this.loginError.subscribe((v) => this.loginErrorAnimation(!!v));

		this.passwordError.subscribe((v) => {
			this.passwordErrorAnimation(!!v);
		});

		this.submitRequest = ko.observable(false);
		this.submitError = ko.observable('');
	}

	@command((self) => !self.submitRequest())
	submitCommand() {
		triggerAutocompleteInputChange();

		this.loginError(false);
		this.passwordError(false);

		this.loginError('' === trim(this.login()));
		this.passwordError('' === trim(this.password()));

		if (this.loginError() || this.passwordError()) {
			return false;
		}

		this.submitRequest(true);
		$win.trigger('rl.tooltips.diactivate');

		Remote.adminLogin(
			(sResult, oData) => {
				$win.trigger('rl.tooltips.diactivate');
				$win.trigger('rl.tooltips.activate');

				if (StorageResultType.Success === sResult && oData && 'AdminLogin' === oData.Action) {
					if (oData.Result) {
						getApp().loginAndLogoutReload(true);
					} else if (oData.ErrorCode) {
						this.submitRequest(false);
						this.submitError(getNotification(oData.ErrorCode));
					}
				} else {
					this.submitRequest(false);
					this.submitError(getNotification(Notification.UnknownError));
				}
			},
			this.login(),
			this.password()
		);

		return true;
	}

	onShow() {
		routeOff();

		_.delay(() => {
			this.loginFocus(true);
		}, Magics.Time100ms);
	}

	onHide() {
		this.loginFocus(false);
	}

	onBuild() {
		triggerAutocompleteInputChange(true);
	}

	submitForm() {
		this.submitCommand();
	}
}

export { LoginAdminView, LoginAdminView as default };
