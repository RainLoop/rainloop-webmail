<?php

/**
 * ownCloud - RainLoop mail plugin
 *
 * @author RainLoop Team
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

	OCP\Config::setUserValue($sUser, 'rainloop', 'rainloop-email', $sPostEmail);

	$sPass = $_POST['rainloop-password'];
	if ('******' !== $sPass && '' !== $sPass)
	{
		include_once OC_App::getAppPath('rainloop').'/lib/RainLoopHelper.php';

		OCP\Config::setUserValue($sUser, 'rainloop', 'rainloop-password',
			OC_RainLoop_Helper::encodePassword($sPass, md5($sPostEmail)));
	}

	$sEmail = OCP\Config::getUserValue($sUser, 'rainloop', 'rainloop-email', '');
}
else
{
	sleep(1);
	OC_JSON::error(array('Message' => 'Invalid argument(s)', 'Email' => $sEmail));
	return false;
}

sleep(1);
OCP\JSON::success(array('Message' => 'Saved successfully', 'Email' => $sEmail));
return true;
