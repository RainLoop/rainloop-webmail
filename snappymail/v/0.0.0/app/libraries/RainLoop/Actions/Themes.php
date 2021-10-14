<?php

namespace RainLoop\Actions;

trait Themes
{
	public function GetTheme(bool $bAdmin): string
	{
		static $sTheme;
		if ($sTheme) {
			return $sTheme;
		}
		$sTheme = $this->Config()->Get('webmail', 'theme', 'Default');
		if (!$bAdmin
		 && ($oAccount = $this->getAccountFromToken(false))
		 && $this->GetCapa(false, \RainLoop\Enumerations\Capa::THEMES, $oAccount)
		 && ($oSettingsLocal = $this->SettingsProvider(true)->Load($oAccount))) {
			$sTheme = (string) $oSettingsLocal->GetConf('Theme', $sTheme);
		}
		$sTheme = $this->ValidateTheme($sTheme) ?: 'Default';
		return $sTheme;
	}

	/**
	 * @staticvar array $aCache
	 */
	public function GetThemes(): array
	{
		static $aCache = array();
		if ($aCache) {
			return $aCache;
		}

		$bClear = false;
		$bDefault = false;
		$aCache = array();
		$sDir = APP_VERSION_ROOT_PATH . 'themes';
		if (\is_dir($sDir)) {
			$rDirH = \opendir($sDir);
			if ($rDirH) {
				while (($sFile = \readdir($rDirH)) !== false) {
					if ('.' !== $sFile[0] && \is_dir($sDir . '/' . $sFile)
					 && (\file_exists("{$sDir}/{$sFile}/styles.css") || \file_exists("{$sDir}/{$sFile}/styles.less"))) {
						if ('Default' === $sFile) {
							$bDefault = true;
						} else if ('Clear' === $sFile) {
							$bClear = true;
						} else {
							$aCache[] = $sFile;
						}
					}
				}
				closedir($rDirH);
			}
		}

		$sDir = APP_INDEX_ROOT_PATH . 'themes'; // custom user themes
		if (\is_dir($sDir)) {
			$rDirH = \opendir($sDir);
			if ($rDirH) {
				while (($sFile = \readdir($rDirH)) !== false) {
					if ('.' !== $sFile[0] && \is_dir($sDir . '/' . $sFile)
					 && (\file_exists("{$sDir}/{$sFile}/styles.css") || \file_exists("{$sDir}/{$sFile}/styles.less"))) {
						$aCache[] = $sFile . '@custom';
					}
				}

				\closedir($rDirH);
			}
		}

		$aCache = \array_unique($aCache);
		\sort($aCache);

		if ($bDefault) {
			\array_unshift($aCache, 'Default');
		}

		if ($bClear) {
			\array_push($aCache, 'Clear');
		}

		return $aCache;
	}

	public function ThemeLink(bool $bAdmin): string
	{
		return './?/Css/0/' . ($bAdmin ? 'Admin' : 'User') . '/-/' . $this->GetTheme($bAdmin) . '/-/' . $this->StaticCache() . '/Hash/-/';
	}

	public function ValidateTheme(string $sTheme): string
	{
		return \in_array($sTheme, $this->GetThemes()) ? $sTheme : $this->Config()->Get('themes', 'default', 'Default');
	}

	public function compileCss(string $sTheme, bool $bAdmin) : string
	{
		$bCustomTheme = '@custom' === \substr($sTheme, -7);
		if ($bCustomTheme) {
			$sTheme = \substr($sTheme, 0, -7);
		}

		$oLess = new \LessPHP\lessc();
		$oLess->setFormatter('compressed');

		$aResult = array();

		$sThemeCSSFile = ($bCustomTheme ? APP_INDEX_ROOT_PATH : APP_VERSION_ROOT_PATH).'themes/'.$sTheme.'/styles.css';
		$sThemeLessFile = ($bCustomTheme ? APP_INDEX_ROOT_PATH : APP_VERSION_ROOT_PATH).'themes/'.$sTheme.'/styles.less';

		$sBase = ($bCustomTheme ? \RainLoop\Utils::WebPath() : \RainLoop\Utils::WebVersionPath())
				. "themes/{$sTheme}/";

		if (\is_file($sThemeCSSFile)) {
			$aResult[] = \preg_replace('@(url\(["\']?)(\\./)?([a-z]+[^:a-z])@',
				"\$1{$sBase}\$3",
				\str_replace('@{base}', $sBase, \file_get_contents($sThemeCSSFile)));
		} else if (\is_file($sThemeLessFile)) {
			$aResult[] = "@base: \"{$sBase}\";";
			$aResult[] = \file_get_contents($sThemeLessFile);
		}

		$aResult[] = $this->Plugins()->CompileCss($bAdmin);

		return $oLess->compile(\implode("\n", $aResult));
	}
}
