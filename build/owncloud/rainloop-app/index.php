<?php

/**
 * ownCloud - RainLoop mail plugin
 *
 * @author RainLoop Team
 * @copyright 2014 RainLoop Team
 *
 * https://github.com/RainLoop/rainloop-webmail/tree/master/build/owncloud
 */

OCP\User::checkLoggedIn();
OCP\App::checkAppEnabled('rainloop');
OCP\App::setActiveNavigationEntry('rainloop_index');

$sUrl = trim(OCP\Config::getAppValue('rainloop', 'rainloop-url', ''));
$sPath = trim(OCP\Config::getAppValue('rainloop', 'rainloop-path', ''));
$bAutologin = OCP\Config::getAppValue('rainloop', 'rainloop-autologin', false);


if ('' === $sUrl || '' === $sPath)
{
	$oTemplate = new OCP\Template('rainloop', 'index-empty', 'user');
}
else
{
	include_once OC_App::getAppPath('rainloop').'/lib/RainLoopHelper.php';

	OC_Config::setValue('xframe_restriction', false);

	$sUser = OCP\User::getUser();

	if ($bAutologin)
	{
		$sEmail = $sUser;
	}
	else
	{
		$sEmail = OCP\Config::getUserValue($sUser, 'rainloop', 'rainloop-email', '');
	}

	$sPassword = OCP\Config::getUserValue($sUser, 'rainloop', 'rainloop-password', '');

	$sPassword = OC_RainLoop_Helper::decodePassword($sPassword, md5($sEmail));
	$sSsoHash = OC_RainLoop_Helper::getSsoHash($sPath, $sEmail, $sPassword);

	OCP\Config::setUserValue($sUser, 'rainloop', 'rainloop-ssohash', $sSsoHash);

	$sUrl = OC_RainLoop_Helper::normalizeUrl($sUrl);
	$sResultUrl = empty($sSsoHash) ? $sUrl.'?sso' : $sUrl.'?sso&hash='.$sSsoHash;

	$oTemplate = new OCP\Template('rainloop', 'index', 'user');
	$oTemplate->assign('rainloop-url', $sResultUrl);
}

$oTemplate->printpage();
