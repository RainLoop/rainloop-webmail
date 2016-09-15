
var cfg = require('../configuration');

Feature('mailbox');

Before((I) => {
	I.amOnPage('/');
	I.resizeWindow(1000, 1000);
	I.waitForElement('.e-powered', 10);
	I.fillField('.inputEmail', cfg.user);
	I.fillField('.inputPassword', cfg.pass);
	I.click('.login-submit-icon');
	I.waitForText('test@rainloop.de', 10, '.accountPlace');
	I.resizeWindow(1000, 1000);
});

Scenario('mailbox/main', (I) => {
	I.see('Select message in list to view it here.');
	I.see('Inbox', '.b-folders-system');

	I.click('#top-system-dropdown-id');
	I.see('Logout', '.RL-SystemDropDown');
	I.click('Logout', '.RL-SystemDropDown');
	I.waitForText('Powered by RainLoop', 10, '.e-powered');
});
