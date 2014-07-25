<?php

/**
 * ownCloud - RainLoop mail plugin
 *
 * @author RainLoop Team
 * @copyright 2014 RainLoop Team
 *
 * https://github.com/RainLoop/rainloop-webmail/tree/master/build/owncloud
 */

OCP\JSON::checkAdminUser();
OCP\JSON::checkAppEnabled('rainloop');
OCP\JSON::callCheck();

$sUrl = '';
$sPath = '';

if (isset($_POST['appname'], $_POST['rainloop-url'], $_POST['rainloop-path']) && 'rainloop' === $_POST['appname'])
{
	OCP\Config::setAppValue('rainloop', 'rainloop-url', $_POST['rainloop-url']);
	OCP\Config::setAppValue('rainloop', 'rainloop-path', $_POST['rainloop-path']);

	$sUrl = OCP\Config::getAppValue('rainloop', 'rainloop-url', '');
	$sPath = OCP\Config::getAppValue('rainloop', 'rainloop-path', '');
}
else
{
	OC_JSON::error(array('Message' => 'Invalid Argument(s)', 'Url' => $sUrl, 'Path' => $sPath));
	return false;
}

OCP\JSON::success(array('Message' => 'Saved successfully', 'Url' => $sUrl, 'Path' => $sPath));
return true;
