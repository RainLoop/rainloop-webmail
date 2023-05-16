<?php

$_ENV['SNAPPYMAIL_INCLUDE_AS_API'] = true;
require_once '/var/lib/snappymail/index.php';

	\SnappyMail\Repository::installPackage('plugin', 'change-password');
	\SnappyMail\Repository::installPackage('plugin', 'change-password-hestia');
	$sFile = APP_PRIVATE_DATA.'configs/plugin-change-password.json';
	if (!file_exists($sFile)) {
		file_put_contents('', json_encode([
			'plugin' => [
				'pass_min_length': 8,
				'pass_min_strength': 60,
				'driver_hestia_enabled': true,
				'driver_hestia_allowed_emails': '*',
				'hestia_host': gethostname(),
				'hestia_port': 8083 // $BACKEND_PORT
			]
		], JSON_PRETTY_PRINT));
	}
//	\SnappyMail\Repository::enablePackage('change-password');

	\SnappyMail\Repository::installPackage('plugin', 'add-x-originating-ip-header');
//	\SnappyMail\Repository::enablePackage('add-x-originating-ip-header');

	$sFile = APP_PRIVATE_DATA.'domains/hestia.json';
	if (!file_exists($sFile)) {
		$config = json_decode(file_get_contents(__DIR__ . '/app/domains/default.json'), true);
		$config['IMAP']['shortLogin'] = true;
		$config['SMTP']['shortLogin'] = true;
		file_put_contents($sFile, json_encode($config, JSON_PRETTY_PRINT));
	}
