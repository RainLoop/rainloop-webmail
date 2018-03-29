<?php

/**
 * ownCloud - RainLoop mail plugin
 *
 * @author RainLoop Team
 *
 * https://github.com/RainLoop/owncloud
 */

OC::$CLASSPATH['OC_RainLoop_Helper'] = OC_App::getAppPath('rainloop') . '/lib/RainLoopHelper.php';

OCP\App::registerAdmin('rainloop', 'admin');
OCP\App::registerPersonal('rainloop', 'personal');

if (OCP\Config::getAppValue('rainloop', 'rainloop-autologin', false))
{
	OCP\Util::connectHook('OC_User', 'post_login', 'OC_RainLoop_Helper', 'login');
	OCP\Util::connectHook('OC_User', 'post_setPassword', 'OC_RainLoop_Helper', 'changePassword');
}

OCP\Util::connectHook('OC_User', 'logout', 'OC_RainLoop_Helper', 'logout');

OCP\Util::addScript('rainloop', 'rainloop');

OCP\App::addNavigationEntry(array(
	'id' => 'rainloop_index',
	'order' => 10,
	'href' => OCP\Util::linkToRoute('rainloop_index'),
	'icon' => OCP\Util::imagePath('rainloop', 'mail.png'),
	'name' => 'Email'
));

