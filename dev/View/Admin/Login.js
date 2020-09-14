import ko from 'ko';

import { StorageResultType, Notification } from 'Common/Enums';
import { getNotification } from 'Common/Translator';

import Remote from 'Remote/Admin/Fetch';

import { view, command, ViewType, routeOff, routeReload } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

@view({
	name: 'View/Admin/Login',
	type: ViewType.Center,
	templateID: 'AdminLogin'
})
class LoginAdminView extends AbstractViewNext {
	constructor() {
		super();

		const appSettingsGet = rl.settings.app;
		this.mobile = !!appSettingsGet('mobile');
		this.mobileDevice = !!appSettingsGet('mobileDevice');

		this.hideSubmitButton = appSettingsGet('hideSubmitButton') ? '' : null;

		this.login = ko.observable('');
		this.password = ko.observable('');

		this.loginError = ko.observable(false);
		this.passwordError = ko.observable(false);

		this.loginErrorAnimation = ko.observable(false).extend({ 'falseTimeout': 500 });
		this.passwordErrorAnimation = ko.observable(false).extend({ 'falseTimeout': 500 });

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
		this.loginError(false);
		this.passwordError(false);

		this.loginError(!this.login().trim());
		this.passwordError(!this.password().trim());

		if (this.loginError() || this.passwordError()) {
			return false;
		}

		this.submitRequest(true);

		Remote.adminLogin(
			(sResult, oData) => {
				if (StorageResultType.Success === sResult && oData && 'AdminLogin' === oData.Action) {
					if (oData.Result) {
						routeReload();
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
	}

	submitForm() {
		this.submitCommand();
	}
}

export { LoginAdminView, LoginAdminView as default };
