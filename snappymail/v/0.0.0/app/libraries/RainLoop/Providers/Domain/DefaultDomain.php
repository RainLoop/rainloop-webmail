<?php
/**
 * Domain names are handled in lowercase punycode.
 * Because internationalized domain names can have uppercase or titlecase characters.
 */

namespace RainLoop\Providers\Domain;

use MailSo\Cache\CacheClient;

class DefaultDomain implements DomainInterface
{
	const CACHE_KEY = '/WildCardDomainsCache/';

	protected string $sDomainPath;

	protected ?CacheClient $oCacher;

	public function __construct(string $sDomainPath, ?CacheClient $oCacher = null)
	{
		$this->sDomainPath = \rtrim(\trim($sDomainPath), '\\/');
		$this->oCacher = $oCacher;
	}

	private static function decodeFileName(string $sName) : string
	{
		return ('default' === $sName) ? '*' : \str_replace('_wildcard_', '*', $sName);
	}

	private static function encodeFileName(string $sName) : string
	{
//		return ('*' === $sName) ? 'default' : \str_replace('*', '_wildcard_', \SnappyMail\IDN::toAscii($sName));
		return ('*' === $sName) ? 'default' : \str_replace('*', '_wildcard_', \strtolower(\idn_to_ascii($sName)));
	}

	private function getWildcardDomainsLine() : string
	{
		if ($this->oCacher) {
			$sResult = $this->oCacher->Get(static::CACHE_KEY);
			if (\is_string($sResult)) {
				return $sResult;
			}
		}

		$aNames = array();

//		$aList = \glob($this->sDomainPath.'/*.{ini,json,alias}', GLOB_BRACE);
		$aList = \glob($this->sDomainPath.'/*.json');
		foreach ($aList as $sFile) {
			$sName = \substr(\basename($sFile), 0, -5);
			if ('default' === $sName || false !== \strpos($sName, '_wildcard_')) {
				$aNames[] = static::decodeFileName($sName);
			}
		}
		$aList = \glob($this->sDomainPath.'/*.ini');
		foreach ($aList as $sFile) {
			$sName = \substr(\basename($sFile), 0, -4);
			if ('default' === $sName || false !== \strpos($sName, '_wildcard_')) {
				$aNames[] = static::decodeFileName($sName);
			}
		}
		$aList = \glob($this->sDomainPath.'/*.alias');
		foreach ($aList as $sFile) {
			$sName = \substr(\basename($sFile), 0, -6);
			if ('default' === $sName || false !== \strpos($sName, '_wildcard_')) {
				$aNames[] = static::decodeFileName($sName);
			}
		}

		$sResult = '';
		if ($aNames) {
			\rsort($aNames, SORT_STRING);
			$sResult = \implode(' ', \array_unique($aNames));
		}

		$this->oCacher && $this->oCacher->Set(static::CACHE_KEY, $sResult);

		return $sResult;
	}

	public function Load(string $sName, bool $bFindWithWildCard = false, bool $bCheckDisabled = true, bool $bCheckAliases = true) : ?\RainLoop\Model\Domain
	{
//		$sName = \SnappyMail\IDN::toAscii($sName);
		$sName = \strtolower(\idn_to_ascii($sName));
		if ($bCheckDisabled && \in_array($sName, $this->getDisabled())) {
			return null;
		}

		$sRealFileBase = $this->sDomainPath . '/' . static::encodeFileName($sName);

		if (\file_exists($sRealFileBase.'.json')) {
			$aDomain = \json_decode(\file_get_contents($sRealFileBase.'.json'), true) ?: array();
			return \RainLoop\Model\Domain::fromArray($sName, $aDomain);
		}

		if (\file_exists($sRealFileBase.'.ini')) {
			$aDomain = \parse_ini_file($sRealFileBase.'.ini') ?: array();
			return \RainLoop\Model\Domain::fromIniArray($sName, $aDomain);
		}

		if ($bCheckAliases && \file_exists($sRealFileBase.'.alias')) {
			$sTarget = \trim(\file_get_contents($sRealFileBase.'.alias'));
			if (!empty($sTarget)) {
				$oDomain = $this->Load($sTarget, false, false, false);
				$oDomain && $oDomain->SetAliasName($sName);
				return $oDomain;
			}
		}

		if ($bFindWithWildCard) {
			$sNames = $this->getWildcardDomainsLine();
			$sFoundValue = '';
			if (\strlen($sNames)
			 && \RainLoop\Plugins\Helper::ValidateWildcardValues($sName, $sNames, $sFoundValue)
			 && \strlen($sFoundValue)
			) {
				return $this->Load($sFoundValue);
			}
		}

		return null;
	}

	public function Save(\RainLoop\Model\Domain $oDomain) : bool
	{
		$this->Delete($oDomain->Name());
		$sRealFileName = static::encodeFileName($oDomain->Name());
		\RainLoop\Utils::saveFile($this->sDomainPath.'/'.$sRealFileName.'.json', \json_encode($oDomain, \JSON_PRETTY_PRINT));
		$this->oCacher && $this->oCacher->Delete(static::CACHE_KEY);
		return true;
	}

	public function SaveAlias(string $sName, string $sTarget) : bool
	{
//		$this->Delete($sName);
//		$sTarget = \SnappyMail\IDN::toAscii($sTarget);
		$sTarget = \strtolower(\idn_to_ascii($sTarget));
		$sRealFileName = static::encodeFileName($sName);
		\RainLoop\Utils::saveFile($this->sDomainPath.'/'.$sRealFileName.'.alias', $sTarget);
		$this->oCacher && $this->oCacher->Delete(static::CACHE_KEY);
		return true;
	}

	protected function getDisabled() : array
	{
		$sFile = '';
		if (\file_exists($this->sDomainPath.'/disabled')) {
			$sFile = \file_get_contents($this->sDomainPath.'/disabled');
		}
		$aDisabled = array();
		// RainLoop use comma, we use newline
		$sItem = \strtok($sFile, ",\n");
		while (false !== $sItem) {
//			$aDisabled[] = \SnappyMail\IDN::toAscii($sItem);
			$aDisabled[] = \strtolower(\idn_to_ascii($sItem));
			$sItem = \strtok(",\n");
		}
		return $aDisabled;
//		return \array_unique($aDisabled);
	}

	public function Disable(string $sName, bool $bDisable) : bool
	{
//		$sName = \SnappyMail\IDN::toAscii($sName);
		$sName = \strtolower(\idn_to_ascii($sName));
		if ($sName) {
			$aResult = $this->getDisabled();
			if ($bDisable) {
				$aResult[] = $sName;
			} else {
				$aResult = \array_filter($aResult, fn($v) => $v !== $sName);
			}
			\RainLoop\Utils::saveFile($this->sDomainPath.'/disabled', \implode("\n", \array_unique($aResult)));
			return $this->getDisabled() === $aResult;
		}
		return false;
	}

	public function Delete(string $sName) : bool
	{
		$bResult = true;
		if (\strlen($sName)) {
			$sRealFileName = $this->sDomainPath . '/' . static::encodeFileName($sName);
			$bResult =
				(!\file_exists($sRealFileName.'.json') || \unlink($sRealFileName.'.json'))
				&& (!\file_exists($sRealFileName.'.ini') || \unlink($sRealFileName.'.ini'))
				&& (!\file_exists($sRealFileName.'.alias') || \unlink($sRealFileName.'.alias'));
			$this->Disable($sName, !$bResult);
			if ($this->oCacher) {
				$this->oCacher->Delete(static::CACHE_KEY);
			}
		}
		return $bResult;
	}

	public function GetList(bool $bIncludeAliases = true) : array
	{
		$aDisabledNames = $this->getDisabled();
		$aResult = array();
		$aWildCards = array();
		$aAliases = array();

//		$aList = \glob($this->sDomainPath.'/*.{ini,json,alias}', GLOB_BRACE);
		$aList = \array_diff(\scandir($this->sDomainPath), array('.', '..'));
		foreach ($aList as $sFile) {
			$bAlias = '.alias' === \substr($sFile, -6);
			if ($bAlias || '.json' === \substr($sFile, -5) || '.ini' === \substr($sFile, -4)) {
				$sName = static::decodeFileName(\preg_replace('/\.(ini|json|alias)$/', '', $sFile));
				if ($bAlias) {
					if ($bIncludeAliases) {
						$aAliases[$sName] = array(
							'name' => $sName,
							'disabled' => \in_array($sName, $aDisabledNames),
							'alias' => true
						);
					}
				} else if (false !== \strpos($sName, '*')) {
					$aWildCards[$sName] = array(
						'name' => $sName,
						'disabled' => \in_array($sName, $aDisabledNames),
						'alias' => false
					);
				} else {
					$aResult[$sName] = array(
						'name' => $sName,
						'disabled' => \in_array($sName, $aDisabledNames),
						'alias' => false
					);
				}
			}
		}

		\ksort($aResult, SORT_STRING);
		\ksort($aAliases, SORT_STRING);
		\krsort($aWildCards, SORT_STRING);
		return \array_values(\array_merge($aResult, $aAliases, $aWildCards));
	}
}
