<?php

/**
 * ownCloud - RainLoop mail plugin
 *
 * @author RainLoop Team
 * @copyright 2014 RainLoop Team
 *
 * https://github.com/RainLoop/owncloud
 */

OCP\App::registerPersonal('rainloop', 'personal');

OCP\Util::addScript('rainloop', 'rainloop');

OCP\App::addNavigationEntry(array(
	'id' => 'rainloop_index',
	'order' => 20,
	'href' => OCP\Util::linkTo('rainloop', 'index.php'),
	'icon' => OCP\Util::imagePath('rainloop', 'mail.png'),
	'name' => 'RainLoop'
));

if(OC_User::isAdminUser(OCP\User::getUser()))
{
	OCP\App::addNavigationEntry(array(
		'id' => 'rainloop_index_admin',
		'order' => 21,
		'href' => OCP\Util::linkTo('rainloop', 'index-admin.php'),
		'icon' => OCP\Util::imagePath('rainloop', 'mail.png'),
		'name' => 'RainLoop (Admin)'
	));
}
