#!/usr/bin/php
<?php
/*
https://imapsync.lamiral.info/README
imapsync.php \
  --host1 test1.snappymail.eu \
  --user1 test1               \
  --password1 "secret1"       \
  --host2 test2.snappymail.eu \
  --user2 test2               \
  --password2 "secret2"
*/

use MailSo\Net\Enumerations\ConnectionSecurityType as SecurityType;

// php.net/getopt doesn't allow spaced values like `--host1 example.com`
function get_opt(string $short_options, array $long_options) {
	$opts = [];
	foreach ($long_options as $option) {
		$key = \rtrim($option,':');
		$arg = "--{$key}";
		$optional = 2 === \substr_count($option, ':');
		$required = 1 === \substr_count($option, ':');
		foreach ($_SERVER['argv'] as $i => $v) {
			if ($v === $arg) {
				$opts[$key] = ($required || $optional) ? $_SERVER['argv'][$i+1] : true;
			}
			if (($required || $optional) && 0 === \strpos($v, "{$arg}=")) {
				$opts[$key] = \substr($v, 1+\strlen($arg));
			}
		}
		if ($required && !isset($opts[$key])) {
			exit("Missing required argument {$arg}");
		}
	}
	return $opts;
}
$options = get_opt('', [
	// Source or "from" imap server.
	'host1::',
	'port1::',
	'user1:',
	'password1:',
	'nossl1',             // Do not use a SSL connection on host1.
	'ssl1',               // Use a SSL connection on host1. On by default if possible.
	'notls1',             // Do not use a TLS connection on host1.
	'tls1',               // Use a TLS connection on host1. On by default if possible.

	// "destination" imap server.
	'host2::',
	'port2::',
	'user2:',
	'password2:',
	'nossl2',             // Do not use a SSL connection on host2.
	'ssl2',               // Use a SSL connection on host2. On by default if possible.
	'notls2',             // Do not use a TLS connection on host2.
	'tls2',               // Use a TLS connection on host2. On by default if possible.
	'rootfolder::'        // Added as prefix to destination folders
]);

chdir(__DIR__);
define('APP_VERSION', basename(__DIR__));
$_ENV['SNAPPYMAIL_INCLUDE_AS_API'] = true;
require __DIR__ . '/include.php';

function getImapClient(int $host)
{
	global $options;

	$oConfig = \RainLoop\API::Config();

	$type = SecurityType::AUTO_DETECT;
	if (isset($options["tls{$host}"])) {
		$type = SecurityType::STARTTLS;
	}
	else if (isset($options["ssl{$host}"])) {
		$type = SecurityType::SSL;
	}
	else if (isset($options["notls{$host}"])) {
		$type = SecurityType::NONE;
	}
	$ImapSettings = \MailSo\Imap\Settings::fromArray([
		'host' => $options["host{$host}"] ?? 'localhost',
		'port' => $options["port{$host}"] ?? 143,
		'type' => $type,
		'ssl' => []
	]);
	if (993 === $ImapSettings->port) {
		$ImapSettings->type = SecurityType::SSL;
	}
	if ($oConfig->Get('labs', 'sasl_allow_scram_sha', false)) {
		\array_push($ImapSettings->SASLMechanisms, 'SCRAM-SHA3-512', 'SCRAM-SHA-512', 'SCRAM-SHA-256', 'SCRAM-SHA-1');
	}
	if ($oConfig->Get('labs', 'sasl_allow_cram_md5', false)) {
		$ImapSettings->SASLMechanisms[] = 'CRAM-MD5';
	}
	if ($oConfig->Get('labs', 'sasl_allow_plain', true)) {
		$ImapSettings->SASLMechanisms[] = 'PLAIN';
	}
	$ImapSettings->Login = $options["user{$host}"];
	$ImapSettings->Password = $options["password{$host}"];
//	$ImapSettings1->ProxyAuthUser = '';
//	$ImapSettings1->ProxyAuthPassword = '';
	$ImapSettings->useAuth = true;

	$oImapClient = new \MailSo\Imap\ImapClient;
	//$oImapTarget->SetLogger($this->Logger());
	$oImapClient->__FORCE_SELECT_ON_EXAMINE__ = !!$oConfig->Get('imap', 'use_force_selection');
	$oImapClient->__DISABLE_METADATA = !!$oConfig->Get('imap', 'disable_metadata');
	//$oPlugins->RunHook('imap.before-connect', array($this, $oImapClient, $ImapSettings));
	$oImapClient->Connect($ImapSettings);
	//$oPlugins->RunHook('imap.after-connect', array($this, $oImapClient, $ImapSettings));
	//$oPlugins->RunHook('imap.before-login', array($this, $oImapClient, $ImapSettings));
	$oImapClient->Login($ImapSettings);
	//$oPlugins->RunHook('imap.after-login', array($this, $oImapClient, $bResult, $ImapSettings));

	return $oImapClient;
}

$oSync = new \SnappyMail\Imap\Sync;
$oSync->oImapSource = getImapClient(1);
$oSync->oImapTarget = getImapClient(2);

$oSync->import($options['rootfolder'] ?: 'test');
