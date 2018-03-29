<?php

/**
 * ownCloud - RainLoop mail plugin
 *
 * @author RainLoop Team
 *
 * https://github.com/RainLoop/rainloop-webmail/tree/master/build/owncloud
 */

OCP\User::checkLoggedIn();
OCP\App::checkAppEnabled('rainloop');

OCP\Util::addScript('rainloop', 'personal');

if (OCP\Config::getAppValue('rainloop', 'rainloop-autologin', false))
{
	$oTemplate = new OCP\Template('rainloop', 'empty');
}
else
{
	$sUser = OCP\User::getUser();

	$oTemplate = new OCP\Template('rainloop', 'personal');

	$sEmail = OCP\Config::getUserValue($sUser, 'rainloop', 'rainloop-email', '');
	$sPass = OCP\Config::getUserValue($sUser, 'rainloop', 'rainloop-password', '');

	$oTemplate->assign('rainloop-email', $sEmail);
	$oTemplate->assign('rainloop-password', 0 === strlen($sPass) && 0 === strlen($sEmail) ? '' : '******');
}

return $oTemplate->fetchPage();
