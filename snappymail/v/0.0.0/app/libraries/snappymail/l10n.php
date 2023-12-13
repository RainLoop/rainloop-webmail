<?php

namespace SnappyMail;

abstract class L10n
{

	/**
	 * @staticvar array $aCache
	 */
	public static function (bool $bAdmin = false) : array
	{
		static $aCache = array();

		if (isset($aCache[$bAdmin])) {
			return $aCache[$bAdmin];
		}

		$aList = array();
		foreach (\glob(APP_VERSION_ROOT_PATH . 'app/localization/*', GLOB_ONLYDIR) as $dir) {
			if (\is_file($dir . ($bAdmin ? '/admin' : '/user') . '.json')) {
				$aList[] = \basename($dir);
			}
		}
/*
		foreach (\glob(APP_PLUGINS_PATH . 'language-*', GLOB_ONLYDIR) as $dir) {
			if (\is_file($dir . ($bAdmin ? '/admin' : '/user') . '.json')) {
				$aList[] = \substr(\basename($dir), 9);
			}
		}
*/
		\sort($aList);
		$aCache[$bAdmin] = $aList;
		return $aCache[$bAdmin];
	}

	/**
	 * When $sLanguage is like 'sv-SE', it tries to load and merge (in order): en, sv and sv-SE
	 * $sFile is either 'admin', 'static' or 'user'
	 */
	public static function load(string $sLanguage, string $sFile) : array
	{
		$sLanguage = \strtr($sLanguage, '_', '-');
		$aLangs = \array_unique(['en', \explode('-', $sLanguage)[0], $sLanguage]);
		$aLang = [];
		foreach ($aLangs as $sLanguage) {
			$file = APP_VERSION_ROOT_PATH."app/localization/{$sLanguage}/{$sFile}.json";
			if (\is_file($file)) {
				$aLang = \array_replace_recursive($aLang, \json_decode(\file_get_contents($file), true));
			}
/*			else {
				$file = APP_PLUGINS_PATH."language-{$sLanguage}/{$sFile}.json";
				if (\is_file($file)) {
					$aLang = \array_replace_recursive($aLang, \json_decode(\file_get_contents($file), true));
				}
			}
*/
		}
		return $aLang;
	}

}
