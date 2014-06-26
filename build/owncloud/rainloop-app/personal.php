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

OCP\Util::addScript('rainloop', 'personal');

$sUrl = trim(OCP\Config::getAppValue('rainloop', 'rainloop-url', ''));
$sSsoKey = trim(OCP\Config::getAppValue('rainloop', 'rainloop-sso-key', ''));

if ('' === $sUrl || '' === $sSsoKey)
{
	$oTemplate = new OCP\Template('rainloop', 'empty');
}
else
{
	$sUser = OCP\User::getUser();

	$oTemplate = new OCP\Template('rainloop', 'personal');

	$sEmail = OCP\Config::getUserValue($sUser, 'rainloop', 'rainloop-email', '');

	$oTemplate->assign('rainloop-email', $sEmail);

	$sPass = OCP\Config::getUserValue($sUser, 'rainloop', 'rainloop-password', '');
	$oTemplate->assign('rainloop-password', 0 === strlen($sPass) && 0 === strlen($sEmail) ? '' : '******');
}

return $oTemplate->fetchPage();
