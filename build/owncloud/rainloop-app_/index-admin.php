<?php

/**
 * ownCloud - RainLoop mail plugin
 *
 * @author RainLoop Team
 * @copyright 2014 RainLoop Team
 *
 * https://github.com/RainLoop/rainloop-webmail/tree/master/build/owncloud
 */

OCP\User::checkAdminUser();
OCP\App::checkAppEnabled('rainloop');
OCP\App::setActiveNavigationEntry('rainloop_index_admin');

$sUrl = OCP\Util::linkTo('apps/rainloop/app', 'index.php');
$sResultUrl = $sUrl.'?admin';

$oTemplate = new OCP\Template('rainloop', 'iframe', 'user');
$oTemplate->assign('rainloop-url', $sResultUrl);

$oTemplate->printpage();
