/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends KnoinAbstractScreen
 */
function LoginScreen()
{
	KnoinAbstractScreen.call(this, 'login', [LoginViewModel]);
}

_.extend(LoginScreen.prototype, KnoinAbstractScreen.prototype);

LoginScreen.prototype.onShow = function ()
{
	RL.setTitle('');
};