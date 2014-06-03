<?php

/**
 * ownCloud - RainLoop mail plugin
 *
 * @author RainLoop Team
 * @copyright 2014 RainLoop Team
 *
 * https://github.com/RainLoop/owncloud
 */

OCP\App::registerAdmin('rainloop', 'admin');
OCP\App::registerPersonal('rainloop', 'personal');

OCP\Util::addScript('rainloop', 'rainloop');

OCP\App::addNavigationEntry(array(
	'id' => 'rainloop_index',
	'order' => 10,
	'href' => OCP\Util::linkTo('rainloop', 'index.php'),
	'icon' => OCP\Util::imagePath('rainloop', 'mail.png'),
	'name' => 'RainLoop'
));
