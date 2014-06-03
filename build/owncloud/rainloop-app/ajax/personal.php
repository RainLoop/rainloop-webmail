<?php

/**
 * ownCloud - RainLoop mail plugin
 *
 * @author RainLoop Team
 * @copyright 2014 RainLoop Team
 *
 * https://github.com/RainLoop/rainloop-webmail/tree/master/build/owncloud
 */

OCP\JSON::checkLoggedIn();
OCP\JSON::checkAppEnabled('rainloop');
OCP\JSON::callCheck();

$sEmail = '';
$sLogin = '';
if (isset($_POST['appname'], $_POST['rainloop-password'], $_POST['rainloop-email']) && 'rainloop' === $_POST['appname'])
{
	$sUser = OCP\User::getUser();

	$sPostEmail = $_POST['rainloop-email'];
	$sPostLogin = isset($_POST['rainloop-login']) ? $_POST['rainloop-login'] : '';

	OCP\Config::setUserValue($sUser, 'rainloop', 'rainloop-email', $sPostEmail);
	OCP\Config::setUserValue($sUser, 'rainloop', 'rainloop-login', $sPostLogin);

	$sPass = $_POST['rainloop-password'];
	if ('******' !== $sPass && '' !== $sPass)
	{
		include_once OC_App::getAppPath('rainloop').'/lib/RainLoopHelper.php';
		OCP\Config::setUserValue($sUser, 'rainloop', 'rainloop-password',
			OC_RainLoop_Helper::encodePassword($sPass, md5($sPostEmail.$sPostLogin)));
	}

	$sEmail = OCP\Config::getUserValue($sUser, 'rainloop', 'rainloop-email', '');
	$sLogin = OCP\Config::getUserValue($sUser, 'rainloop', 'rainloop-login', '');
}
else
{
	OC_JSON::error(array('Message' => 'Invalid argument(s)', 'Email' => $sEmail, 'Login' => $sLogin));
	return false;
}

OCP\JSON::success(array('Message' => 'Saved successfully', 'Email' => $sEmail, 'Login' => $sLogin));
return true;
