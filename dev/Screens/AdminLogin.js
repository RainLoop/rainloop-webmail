/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends KnoinAbstractScreen
 */
function AdminLoginScreen()
{
	KnoinAbstractScreen.call(this, 'login', [AdminLoginViewModel]);
}

_.extend(AdminLoginScreen.prototype, KnoinAbstractScreen.prototype);

AdminLoginScreen.prototype.onShow = function ()
{
	RL.setTitle('');
};