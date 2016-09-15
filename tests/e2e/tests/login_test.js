
Feature('login');

Before(function(I) {
	I.amOnPage('/');
	I.resizeWindow(1000, 1000);
	I.waitForElement('.e-powered', 10);
});

Scenario('login/page', function(I) {
	I.see('Powered by RainLoop', '.e-powered');
	I.see('Remember Me');
});

Scenario('login/auth-error', function(I) {
	I.fillField('.inputEmail', 'xxx');
	I.fillField('.inputPassword', 'yyy');
	I.click('.login-submit-icon');
	I.waitForVisible('.alertError', 3);
	I.see('Authentication failed', '.alertError');
});

Scenario('login/language-popup', function(I) {
	I.click('.flag-name');
	I.wait(1);
	I.see('Choose your language', '.b-languages-content');
	I.click('.close', '.b-languages-content');
	I.wait(1);
	I.dontSee('Choose your language');
});
