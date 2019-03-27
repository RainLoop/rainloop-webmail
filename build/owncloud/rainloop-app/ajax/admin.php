<?php

/**
 * ownCloud - RainLoop mail plugin
 *
 * @author RainLoop Team
 *
 * https://github.com/RainLoop/rainloop-webmail/tree/master/build/owncloud
 */

OCP\JSON::checkAdminUser();
OCP\JSON::checkAppEnabled('rainloop');
OCP\JSON::callCheck();

$sUrl = '';
$sPath = '';
$bAutologin = false;

if (isset($_POST['appname']) &&	'rainloop' === $_POST['appname'])
{
	OCP\Config::setAppValue('rainloop', 'rainloop-autologin', isset($_POST['rainloop-autologin']) ?
		'1' === $_POST['rainloop-autologin'] : false);

	$bAutologin = OCP\Config::getAppValue('rainloop', 'rainloop-autologin', false);
}
else
{
	sleep(1);
	OC_JSON::error(array('Message' => 'Invalid Argument(s)'));
	return false;
}

sleep(1);
OCP\JSON::success(array('Message' => 'Saved successfully'));
return true;
