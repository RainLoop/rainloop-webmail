<?php

namespace SnappyMail\PGP;

defined('GNUPG_SIG_MODE_NORMAL') || define('GNUPG_SIG_MODE_NORMAL', 0);
defined('GNUPG_SIG_MODE_DETACH') || define('GNUPG_SIG_MODE_DETACH', 1);
defined('GNUPG_SIG_MODE_CLEAR') || define('GNUPG_SIG_MODE_CLEAR', 2);

use SnappyMail\GPG\PGP as GPG;

abstract class GnuPG
{
	public static function isSupported() : bool
	{
		return GPG::isSupported() || PECL::isSupported();
	}

	private static $instance = null;
	public static function getInstance(string $homedir) : ?PGPInterface
	{
		if (!static::$instance) {
			if (GPG::isSupported()) {
				static::$instance = new GPG($homedir);
			}
			else if (PECL::isSupported()) {
				static::$instance = new PECL($homedir);
			}
		}
		return static::$instance;
	}
}
