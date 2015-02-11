<?php

/**
 * ownCloud - RainLoop mail plugin
 *
 * @author RainLoop Team
 * @copyright 2015 RainLoop Team
 *
 * https://github.com/RainLoop/rainloop-webmail/tree/master/build/owncloud
 */

OCP\User::checkAdminUser();

OCP\Util::addScript('rainloop', 'admin');

$bInstalledLocaly = file_exists(__DIR__.'/app/index.php');
if ($bInstalledLocaly)
{
	$oTemplate = new OCP\Template('rainloop', 'admin-local');
	$oTemplate->assign('rainloop-admin-panel-link',
		OC_RainLoop_Helper::getAppUrl().'?admin');
}
else
{
	$oTemplate = new OCP\Template('rainloop', 'admin');
	$oTemplate->assign('rainloop-admin-panel-link', '');
	$oTemplate->assign('rainloop-url', OCP\Config::getAppValue('rainloop', 'rainloop-url', ''));
	$oTemplate->assign('rainloop-path', OCP\Config::getAppValue('rainloop', 'rainloop-path', ''));
}

$oTemplate->assign('rainloop-autologin', OCP\Config::getAppValue('rainloop', 'rainloop-autologin', false));
return $oTemplate->fetchPage();
