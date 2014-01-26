/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function AdminLoginViewModel()
{
	KnoinAbstractViewModel.call(this, 'Center', 'AdminLogin');

	this.login = ko.observable('');
	this.password = ko.observable('');

	this.loginError = ko.observable(false);
	this.passwordError = ko.observable(false);

	this.loginFocus = ko.observable(false);

	this.login.subscribe(function () {
		this.loginError(false);
	}, this);

	this.password.subscribe(function () {
		this.passwordError(false);
	}, this);
	
	this.submitRequest = ko.observable(false);
	this.submitError = ko.observable('');

	this.submitCommand = Utils.createCommand(this, function () {
		
		this.loginError('' === Utils.trim(this.login()));
		this.passwordError('' === Utils.trim(this.password()));

		if (this.loginError() || this.passwordError())
		{
			return false;
		}

		this.submitRequest(true);

		RL.remote().adminLogin(_.bind(function (sResult, oData) {

			if (Enums.StorageResultType.Success === sResult && oData && 'AdminLogin' === oData.Action)
			{
				if (oData.Result)
				{
					RL.loginAndLogoutReload();
				}
				else if (oData.ErrorCode)
				{
					this.submitRequest(false);
					this.submitError(Utils.getNotification(oData.ErrorCode));
				}
			}
			else
			{
				this.submitRequest(false);
				this.submitError(Utils.getNotification(Enums.Notification.UnknownError));
			}

		}, this), this.login(), this.password());

		return true;
		
	}, function () {
		return !this.submitRequest();
	});

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('AdminLoginViewModel', AdminLoginViewModel);

AdminLoginViewModel.prototype.onShow = function ()
{
	kn.routeOff();

	_.delay(_.bind(function () {
		this.loginFocus(true);
	}, this), 100);

};

AdminLoginViewModel.prototype.onHide = function ()
{
	this.loginFocus(false);
};
