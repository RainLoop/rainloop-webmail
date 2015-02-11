<?php

/**
 * ownCloud - RainLoop mail plugin
 *
 * @author RainLoop Team
 * @copyright 2015 RainLoop Team
 *
 * https://github.com/RainLoop/rainloop-webmail/tree/master/build/owncloud
 */

OCP\User::checkLoggedIn();
OCP\App::checkAppEnabled('rainloop');
OCP\App::setActiveNavigationEntry('rainloop_index');

include_once OC_App::getAppPath('rainloop').'/lib/RainLoopHelper.php';

$sUrl = '';
$sPath = '';

$bInstalledLocaly = file_exists(__DIR__.'/app/index.php');
if ($bInstalledLocaly)
{
	$sUrl = OC_RainLoop_Helper::getAppUrl();
	$sPath = __DIR__.'/app/';
}
else
{
	$sUrl = trim(OCP\Config::getAppValue('rainloop', 'rainloop-url', ''));
	$sPath = trim(OCP\Config::getAppValue('rainloop', 'rainloop-path', ''));
}

$bAutologin = OCP\Config::getAppValue('rainloop', 'rainloop-autologin', false);

if ('' === $sUrl || '' === $sPath)
{
	$oTemplate = new OCP\Template('rainloop', 'index-empty', 'user');
}
else
{
	$sUser = OCP\User::getUser();

	if ($bAutologin)
	{
		$sEmail = $sUser;
		$sEncodedPassword = OCP\Config::getUserValue($sUser, 'rainloop', 'rainloop-autologin-password', '');
	}
	else
	{
		$sEmail = OCP\Config::getUserValue($sUser, 'rainloop', 'rainloop-email', '');
		$sEncodedPassword = OCP\Config::getUserValue($sUser, 'rainloop', 'rainloop-password', '');
	}

	$sDecodedPassword = OC_RainLoop_Helper::decodePassword($sEncodedPassword, md5($sEmail));
	$sSsoHash = OC_RainLoop_Helper::getSsoHash($sPath, $sEmail, $sDecodedPassword);

	$sUrl = OC_RainLoop_Helper::normalizeUrl($sUrl);
	$sResultUrl = empty($sSsoHash) ? $sUrl.'?sso' : $sUrl.'?sso&hash='.$sSsoHash;

	$oTemplate = new OCP\Template('rainloop', 'index', 'user');
	$oTemplate->assign('rainloop-url', $sResultUrl);
}

$oTemplate->printpage();
