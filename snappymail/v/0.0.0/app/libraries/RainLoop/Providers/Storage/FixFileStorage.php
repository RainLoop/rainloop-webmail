<?php

namespace RainLoop\Providers\Storage;

abstract class FixFileStorage
{

	/**
	 * Replace control characters, ampersand, spaces and reserved characters (based on Win95 VFAT)
	 * en.wikipedia.org/wiki/Filename#Reserved_characters_and_words
	 */
	private static function fixName($filename)
	{
		return \preg_replace('#[|\\\\?*<":>+\\[\\]/&\\s\\pC]#su', '-', $filename);
	}

	public static function FixIt(string $sDataPath)
	{
		// /cfg/ex/example@example.com
		foreach (\glob("{$sDataPath}/cfg/*", GLOB_ONLYDIR) as $sOldDir) {
			foreach (\glob("{$sOldDir}/*", GLOB_ONLYDIR) as $sDomainDir) {
				$aEmail = \explode('@', \basename($sDomainDir));
				$sDomain = \trim(1 < \count($aEmail) ? \array_pop($aEmail) : '');
				$sNewDir = $sDataPath
					.'/'.static::fixName($sDomain ?: 'unknown.tld')
					.'/'.static::fixName(\implode('@', $aEmail) ?: '.unknown');
				if (\is_dir($sNewDir) || \mkdir($sNewDir, 0700, true)) {
					foreach (\glob("{$sDomainDir}/*") as $sItem) {
						$sName = \basename($sItem);
						if ('sign_me' === $sName) {
							// Security issue
							// https://github.com/RainLoop/rainloop-webmail/issues/2133
							\unlink($sItem);
						} else {
							\rename($sItem, "{$sNewDir}/{$sName}");
						}
					}
					\MailSo\Base\Utils::RecRmDir($sDomainDir);
				}
			}
		}
		\MailSo\Base\Utils::RecRmDir("{$sDataPath}/cfg");
		\MailSo\Base\Utils::RecRmDir("{$sDataPath}/data");
		\MailSo\Base\Utils::RecRmDir("{$sDataPath}/files");
	}

}
