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
$sSsoKey = '';
if (isset($_POST['appname'], $_POST['rainloop-url'], $_POST['rainloop-sso-key']) && 'rainloop' === $_POST['appname'])
{
	OCP\Config::setAppValue('rainloop', 'rainloop-url', $_POST['rainloop-url']);
	OCP\Config::setAppValue('rainloop', 'rainloop-sso-key', $_POST['rainloop-sso-key']);

	$sUrl = OCP\Config::getAppValue('rainloop', 'rainloop-url', '');
	$sSsoKey = OCP\Config::getAppValue('rainloop', 'rainloop-sso-key', '');
}
else
{
	OC_JSON::error(array('Message' => 'Invalid Argument(s)', 'Url' => $sUrl, 'SsoKey' => $sSsoKey));
	return false;
}

OCP\JSON::success(array('Message' => 'Saved successfully', 'Url' => $sUrl, 'SsoKey' => $sSsoKey));
return true;
