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
$sSsoKey = trim(OCP\Config::getAppValue('rainloop', 'rainloop-sso-key', ''));

if ('' === $sUrl || '' === $sSsoKey)
{
	$oTemplate = new OCP\Template('rainloop', 'index-empty', 'user');
}
else
{
	OC_Config::setValue('xframe_restriction', false);

	$sUser = OCP\User::getUser();

	$sEmail = OCP\Config::getUserValue($sUser, 'rainloop', 'rainloop-email', '');
	$sLogin = OCP\Config::getUserValue($sUser, 'rainloop', 'rainloop-login', '');
	$sPassword = OCP\Config::getUserValue($sUser, 'rainloop', 'rainloop-password', '');

	$sUrl = \rtrim($sUrl, '/\\');
	if ('.php' !== \strtolower(\substr($sUrl), -4))
	{
		$sUrl .= '/';
	}

	include_once OC_App::getAppPath('rainloop').'/lib/RainLoopHelper.php';
	$sPassword = OC_RainLoop_Helper::decodePassword($sPassword, md5($sEmail.$sLogin));
	$sSsoHash = OC_RainLoop_Helper::getSsoHash($sUrl, $sSsoKey, $sEmail, $sPassword, $sLogin);

	$sResultUrl = empty($sSsoHash) ? $sUrl.'?sso' : $sUrl.'?sso&hash='.$sSsoHash;

	$oTemplate = new OCP\Template('rainloop', 'index', 'user');
	$oTemplate->assign('rainloop-url', $sResultUrl);
}

$oTemplate->printpage();
