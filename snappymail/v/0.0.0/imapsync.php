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

if (4 > \count($_SERVER['argv']) || \in_array('--help', $_SERVER['argv'])) {
echo 'OPTIONS

    usage: imapsync.php [options]

    The standard options are the six values forming the credentials. Three
    values on each side are needed to login into the IMAP servers. These six
    values are a hostname, a username, and a password, two times.

  OPTIONS/credentials

     --host1        : Source or "from" imap server.
     --port1        : Port to connect on host1.
                      Optional since default ports are the
                      well known ports imap/143 or imaps/993.
     --user1        : User to login on host1.
     --password1    : Password of user1.

     --host2        : "destination" imap server.
     --port2        : Port to connect on host2. Optional
     --user2        : User to login on host2.
     --password2    : Password of user2.

    If you don\'t pass the user1 password via --password1 then imapsync will
    prompt to enter the password on the terminal. Same thing for user2 password.

  OPTIONS/encryption

     --nossl1       : Do not use a SSL connection on host1.
     --ssl1         : Use a SSL connection on host1. On by default if possible.

     --nossl2       : Do not use a SSL connection on host2.
     --ssl2         : Use a SSL connection on host2. On by default if possible.

     --notls1       : Do not use a TLS connection on host1.
     --tls1         : Use a TLS connection on host1. On by default if possible.

     --notls2       : Do not use a TLS connection on host2.
     --tls2         : Use a TLS connection on host2. On by default if possible.

  OPTIONS/folders

     --rootfolder   : prepend this name to each target folder.
                      Like "INBOX" becomes "test.INBOX"

  OPTIONS/behavior

     --timeout1     : Connection timeout in seconds for host1.
                      Default is 300 and 0 means no timeout at all.
     --timeout2     : Connection timeout in seconds for host2.
                      Default is 300 and 0 means no timeout at all.

     --justconnect  : Just connect to both servers and print useful information.

     --justlogin    : Just login to both host1 and host2 with users
                      credentials, then exit.

     --help         : print this help.

';
	exit;
}

// php.net/getopt doesn't allow spaced values like `--host1 example.com`
// and we also ask on the command line when value is empty
function get_opt(string $short_options, array $long_options) {
	$opts = [];
	foreach ($long_options as $option) {
		$key = \rtrim($option,':');
		$arg = "--{$key}";
		$optional = 2 === \substr_count($option, ':');
		$required = 1 === \substr_count($option, ':');
		foreach ($_SERVER['argv'] as $i => $v) {
			if ($v === $arg) {
				if ($required || $optional) {
					$opts[$key] = '';
					if (!empty($_SERVER['argv'][$i+1]) && '--' != \substr($_SERVER['argv'][$i+1], 0, 2)) {
						$opts[$key] = $_SERVER['argv'][$i+1];
					}
				} else {
					$opts[$key] = true;
				}
			} else if (($required || $optional) && 0 === \strpos($v, "{$arg}=")) {
				$opts[$key] = \substr($v, 1+\strlen($arg));
			}
		}
		// When empty, prompt on command line for value
		if (($required && empty($opts[$key]))
		 || ($optional && isset($opts[$key]) && !\strlen($opts[$key]))
		) {
			if (\is_callable('readline')) {
				$opts[$key] = \readline("{$key}: ");
			} else {
				echo "{$key}: ";
				$opts[$key] = \stream_get_line(STDIN, 1024, PHP_EOL);
			}
			if ($required && empty($opts[$key])) {
				exit("Missing required argument {$arg}");
			}
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
	'nossl1',
	'ssl1',
	'notls1',
	'tls1',
	'timeout1::',

	// "destination" imap server.
	'host2::',
	'port2::',
	'user2:',
	'password2:',
	'nossl2',
	'ssl2',
	'notls2',
	'tls2',
	'timeout2::',
	'rootfolder::',

	// global
	'justconnect',
	'justlogin'
]);

chdir(__DIR__);
define('APP_VERSION', basename(__DIR__));
$_ENV['SNAPPYMAIL_INCLUDE_AS_API'] = true;
require __DIR__ . '/include.php';

function getImapClient(int $host)
{
	global $options;

	$type = SecurityType::AUTO_DETECT;
	if (isset($options["tls{$host}"])) {
		$type = SecurityType::STARTTLS;
	} else if (isset($options["ssl{$host}"])) {
		$type = SecurityType::SSL;
	} else if (isset($options["notls{$host}"])) {
		$type = SecurityType::NONE;
	}
	$ImapSettings = \MailSo\Imap\Settings::fromArray([
		'host' => $options["host{$host}"] ?? 'localhost',
		'port' => $options["port{$host}"] ?? 143,
		'type' => $type,
//		'sasl' => [],
		'ssl' => []
	]);
	if (993 === $ImapSettings->port) {
		$ImapSettings->type = SecurityType::SSL;
	} else if (143 === $ImapSettings->port && SecurityType::SSL == $ImapSettings->type) {
		$ImapSettings->port = 993;
	}
	if (isset($options["timeout{$host}"])) {
		$ImapSettings->timeout = (int) $options["timeout{$host}"];
	}
	$ImapSettings->Login = $options["user{$host}"]; // convert to punycode?
	$ImapSettings->Password = $options["password{$host}"];
//	$ImapSettings1->ProxyAuthUser = '';
//	$ImapSettings1->ProxyAuthPassword = '';
	$ImapSettings->useAuth = true;

	$oImapClient = new \MailSo\Imap\ImapClient;
//	$oAccount = new \RainLoop\Model\Account;
	$oImapClient->SetLogger(\RainLoop\API::Logger());
//	$oPlugins->RunHook('imap.before-connect', array($oAccount, $oImapClient, $ImapSettings));
	$oImapClient->Connect($ImapSettings);
//	$oPlugins->RunHook('imap.after-connect', array($oAccount, $oImapClient, $ImapSettings));
	if (!isset($options['justconnect'])) {
//		$oPlugins->RunHook('imap.before-login', array($oAccount, $oImapClient, $ImapSettings));
		$oImapClient->Login($ImapSettings);
//		$oPlugins->RunHook('imap.after-login', array($oAccount, $oImapClient, $bResult, $ImapSettings));
	}
	return $oImapClient;
}

$oSync = new \SnappyMail\Imap\Sync;
$oSync->oImapSource = getImapClient(1);
$oSync->oImapTarget = getImapClient(2);

if (!isset($options['justconnect']) && !isset($options['justlogin'])) {
	$oSync->import($options['rootfolder'] ?? '');
}
