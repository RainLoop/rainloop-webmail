<?php

/**
 * ownCloud - RainLoop mail plugin
 *
 * @author RainLoop Team
 * @copyright 2015 RainLoop Team
 *
 * https://github.com/RainLoop/rainloop-webmail/tree/master/build/owncloud
 */

OCP\JSON::checkAdminUser();
OCP\JSON::checkAppEnabled('rainloop');
OCP\JSON::callCheck();

$sUrl = '';
$sPath = '';
$bAutologin = false;

$bInstalledLocaly = file_exists(__DIR__.'/../app/index.php');

if (isset($_POST['appname']) &&	'rainloop' === $_POST['appname'] &&
		($bInstalledLocaly ? true : isset($_POST['rainloop-url'], $_POST['rainloop-path'])))
{
	OCP\Config::setAppValue('rainloop', 'rainloop-autologin', isset($_POST['rainloop-autologin']) ?
		'1' === $_POST['rainloop-autologin'] : false);

	if (!$bInstalledLocaly)
	{
		OCP\Config::setAppValue('rainloop', 'rainloop-url', $_POST['rainloop-url']);
		OCP\Config::setAppValue('rainloop', 'rainloop-path', $_POST['rainloop-path']);

		$sUrl = OCP\Config::getAppValue('rainloop', 'rainloop-url', '');
		$sPath = OCP\Config::getAppValue('rainloop', 'rainloop-path', '');
	}

	$bAutologin = OCP\Config::getAppValue('rainloop', 'rainloop-autologin', false);
}
else
{
	sleep(1);
	OC_JSON::error(array('Message' => 'Invalid Argument(s)', 'Url' => $sUrl, 'Path' => $sPath));
	return false;
}

sleep(1);
OCP\JSON::success(array('Message' => 'Saved successfully', 'Url' => $sUrl, 'Path' => $sPath));
return true;
