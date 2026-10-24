<?php
define('APP_VERSION', '1.0');
$dir = dirname(__DIR__);
require $dir . '/snappymail/v/0.0.0/app/libraries/snappymail/dav/client.php';
require $dir . '/snappymail/v/0.0.0/app/libraries/snappymail/http/exception.php';
require $dir . '/snappymail/v/0.0.0/app/libraries/snappymail/http/response.php';
require $dir . '/snappymail/v/0.0.0/app/libraries/snappymail/http/request.php';
require $dir . '/snappymail/v/0.0.0/app/libraries/snappymail/http/request/curl.php';
require $dir . '/snappymail/v/0.0.0/app/libraries/snappymail/http/request/socket.php';
require $dir . '/snappymail/v/0.0.0/app/libraries/RainLoop/Common/PdoAbstract.php';
require $dir . '/snappymail/v/0.0.0/app/libraries/RainLoop/Providers/AddressBook/CardDAV.php';
require $dir . '/snappymail/v/0.0.0/app/libraries/MailSo/Base/DateTimeHelper.php';

use \SnappyMail\DAV\Client as DAVClient;

class Logger
{
	public function AddSecret()
	{
	}
	public function __call(string $name, array $arguments)
	{
		echo "Logger->{$name}('".\implode("', '", $arguments)."');\n";
	}
}

class PdoAddressBook
{
	use \RainLoop\Providers\AddressBook\CardDAV;

	public function Sync(string $sEmail, string $sUrl, string $sUser, string $sPassword, string $sProxy = '') : bool
	{
		$oClient = $this->getDavClient($sUrl, $sUser, $sPassword, $sProxy);
		if ($oClient) {
			$aRemoteSyncData = $this->prepareDavSyncData($oClient, $oClient->__UrlPath__);
			print_r($aRemoteSyncData);
		}
		return true;
	}
}

$PdoAddressBook = new PdoAddressBook();

require $dir . '/snappymail/v/0.0.0/app/libraries/MailSo/Log/Enumerations/Type.php';
$PdoAddressBook->oLogger = new Logger();

if (false) {
	// https://try.nextcloud.com/
	$PdoAddressBook->Sync('dummy@example.com',
		'https://demo2.nextcloud.com/remote.php/dav/addressbooks/users/bEWFmaWz73ZwCpPQ/contacts/',
		'bEWFmaWz73ZwCpPQ',
		'demo'
	);
}
