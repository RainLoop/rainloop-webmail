
var cfg = require('./_config.js');

casper.start(cfg.url);

casper.then(function() {
	this.echo('testing: ' + cfg.url);
}).wait(100);

casper.then(function() {

	casper.test.begin('Login page should contains "Sign In" button', 1, function (test) {

		casper.then(function() {
			test.assertExists('button.buttonLogin');
		});

		casper.then(function() {
			test.done();
		});
	});

	casper.test.begin('Login page should allow langs selection', 3, function (test) {

		casper.then(function() {
			test.assertExists('.e-languages .flag-selector .flag-name');
		});

		casper.then(function() {
			this.click('.e-languages .flag-selector .flag-name');
		}).wait(300);

		casper.then(function() {
			test.assertExists('.b-languages-content');
		});

		casper.then(function() {
			this.click('.b-languages-content .lang-item .flag.flag-ru_ru');
		}).wait(1000);

		casper.then(function() {
			test.assertEquals('Войти', this.fetchText('button.buttonLogin'));
		});

		casper.then(function() {
			test.done();
		});
	});

	casper.test.begin('Login page submit', 1, function (test) {

		casper.then(function() {
			this.fill('form.loginForm', {
				'RainLoopEmail': cfg.testLogin,
				'RainLoopPassword': cfg.testPassword
			}, true);
		}).wait(3000);

		casper.then(function() {
			test.assertEquals(cfg.testLogin, this.fetchText('.accountPlace'));
		});

		casper.then(function() {
			test.done();
		});
	});

});

casper.run();
