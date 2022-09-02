<?php

namespace RainLoop\Providers\Domain;

class DefaultDomain implements DomainInterface
{
	/**
	 * @var string
	 */
	protected $sDomainPath;

	/**
	 * @var \MailSo\Cache\CacheClient
	 */
	protected $oCacher;

	public function __construct(string $sDomainPath, ?\MailSo\Cache\CacheClient $oCacher = null)
	{
		$this->sDomainPath = \rtrim(\trim($sDomainPath), '\\/');
		$this->oCacher = $oCacher;
	}

	private static function codeFileName(string $sName, bool $bBack = false) : string
	{
		if ($bBack && 'default' === $sName) {
			return '*';
		}

		if (!$bBack && '*' === $sName) {
			return 'default';
		}

		return $bBack
			? \str_replace('_wildcard_', '*', \MailSo\Base\Utils::IdnToUtf8($sName, true))
			: \str_replace('*', '_wildcard_', \MailSo\Base\Utils::IdnToAscii($sName, true));
	}

	private static function wildcardDomainsCacheKey() : string
	{
		return '/WildCard/DomainCache/'.\md5(APP_VERSION.APP_PRIVATE_DATA_NAME).'/';
	}

	private function getWildcardDomainsLine() : string
	{
		if ($this->oCacher)
		{
			$sResult = $this->oCacher->Get(static::wildcardDomainsCacheKey());
			if (\strlen($sResult))
			{
				return $sResult;
			}
		}

		$sResult = '';
		$aNames = array();

		$aList = \glob($this->sDomainPath.'/*.ini');
		foreach ($aList as $sFile)
		{
			$sName = \substr(\basename($sFile), 0, -4);
			if ('default' === $sName || false !== \strpos($sName, '_wildcard_'))
			{
				$aNames[] = static::codeFileName($sName, true);
			}
		}

		if (\count($aNames))
		{
			\rsort($aNames, SORT_STRING);
			$sResult = \implode(' ', $aNames);
		}

		if ($this->oCacher)
		{
			$this->oCacher->Set(static::wildcardDomainsCacheKey(), $sResult);
		}

		return $sResult;
	}

	public function Load(string $sName, bool $bFindWithWildCard = false, bool $bCheckDisabled = true, bool $bCheckAliases = true) : ?\RainLoop\Model\Domain
	{
		$mResult = null;

		$aDisabled = [];
		$sFoundValue = '';

		$sRealFileName = static::codeFileName($sName);

		if (\file_exists($this->sDomainPath.'/disabled')) {
			$aDisabled = \explode(',', \file_get_contents($this->sDomainPath.'/disabled'));
		}
		$bCheckDisabled = $bCheckDisabled && 0 < \count($aDisabled);

		if (\file_exists($this->sDomainPath.'/'.$sRealFileName.'.ini') &&
			(!$bCheckDisabled || !\in_array(\MailSo\Base\Utils::IdnToAscii($sName, true), $aDisabled)))
		{
			$aDomain = \parse_ini_file($this->sDomainPath.'/'.$sRealFileName.'.ini') ?: array();
//			if ($bCheckAliases && !empty($aDomain['alias']))
//			{
//				$oDomain = $this->Load($aDomain['alias'], false, false, false);
//				if ($oDomain && $oDomain instanceof \RainLoop\Model\Domain)
//				{
//					$oDomain->SetAliasName($sName);
//				}
//
//				return $oDomain;
//			}
			$mResult = \RainLoop\Model\Domain::NewInstanceFromDomainConfigArray($sName, $aDomain);
		}
		else if ($bCheckAliases && \file_exists($this->sDomainPath.'/'.$sRealFileName.'.alias') &&
			(!$bCheckDisabled || !\in_array(\MailSo\Base\Utils::IdnToAscii($sName, true), $aDisabled)))
		{
			$sAlias = \trim(\file_get_contents($this->sDomainPath.'/'.$sRealFileName.'.alias'));
			if (!empty($sAlias))
			{
				$oDomain = $this->Load($sAlias, false, false, false);
				if ($oDomain && $oDomain instanceof \RainLoop\Model\Domain)
				{
					$oDomain->SetAliasName($sName);
				}

				return $oDomain;
			}
		}
		else if ($bFindWithWildCard)
		{
			$sNames = $this->getWildcardDomainsLine();
			if (\strlen($sNames)
			 && \RainLoop\Plugins\Helper::ValidateWildcardValues(\MailSo\Base\Utils::IdnToUtf8($sName, true), $sNames, $sFoundValue)
			 && \strlen($sFoundValue)
			 && (!$bCheckDisabled || !\in_array($sFoundValue, $aDisabled))
			) {
				$mResult = $this->Load($sFoundValue, false);
			}
		}

		return $mResult;
	}

	public function Save(\RainLoop\Model\Domain $oDomain) : bool
	{
		$sRealFileName = static::codeFileName($oDomain->Name());

		if ($this->oCacher)
		{
			$this->oCacher->Delete(static::wildcardDomainsCacheKey());
		}

		\RainLoop\Utils::saveFile($this->sDomainPath.'/'.$sRealFileName.'.ini', $oDomain->ToIniString());

		return true;
	}

	public function SaveAlias(string $sName, string $sAlias) : bool
	{
		$sRealFileName = static::codeFileName($sName);

		if ($this->oCacher)
		{
			$this->oCacher->Delete(static::wildcardDomainsCacheKey());
		}

		\RainLoop\Utils::saveFile($this->sDomainPath.'/'.$sRealFileName.'.alias', $sAlias);
		return true;
	}

	public function Disable(string $sName, bool $bDisable) : bool
	{
		$sName = \MailSo\Base\Utils::IdnToAscii($sName, true);

		$sFile = '';
		if (\file_exists($this->sDomainPath.'/disabled'))
		{
			$sFile = \file_get_contents($this->sDomainPath.'/disabled');
		}

		$aResult = array();
		$aNames = \explode(',', $sFile);
		if ($bDisable)
		{
			\array_push($aNames, $sName);
			$aResult = $aNames;
		}
		else
		{
			foreach ($aNames as $sItem)
			{
				if ($sName !== $sItem)
				{
					$aResult[] = $sItem;
				}
			}
		}

		\RainLoop\Utils::saveFile($this->sDomainPath.'/disabled', \trim(\implode(',', \array_unique($aResult)), ', '));
		return true;
	}

	public function Delete(string $sName) : bool
	{
		$bResult = true;
		$sRealFileName = static::codeFileName($sName);

		if (\strlen($sName))
		{
			if (\file_exists($this->sDomainPath.'/'.$sRealFileName.'.ini'))
			{
				$bResult = \unlink($this->sDomainPath.'/'.$sRealFileName.'.ini');
			}
			else if (\file_exists($this->sDomainPath.'/'.$sRealFileName.'.alias'))
			{
				$bResult = \unlink($this->sDomainPath.'/'.$sRealFileName.'.alias');
			}
		}

		if ($bResult)
		{
			$this->Disable($sName, false);
		}

		if ($this->oCacher)
		{
			$this->oCacher->Delete(static::wildcardDomainsCacheKey());
		}

		return $bResult;
	}

	public function GetList(bool $bIncludeAliases = true) : array
	{
		$aDisabledNames = array();
		if (\file_exists($this->sDomainPath.'/disabled')) {
			$sDisabled = \file_get_contents($this->sDomainPath.'/disabled');
			if (\strlen($sDisabled)) {
				$aDisabledNames = \explode(',', $sDisabled);
				foreach ($aDisabledNames as &$sValue) {
					$sValue = \MailSo\Base\Utils::IdnToUtf8($sValue, true);
				}
				$aDisabledNames = \array_unique($aDisabledNames);
			}
		}

		$aResult = array();
		$aWildCards = array();
		$aAliases = array();

//		$aList = \glob($this->sDomainPath.'/*.{ini,alias}', GLOB_BRACE);
		$aList = \array_diff(\scandir($this->sDomainPath), array('.', '..'));
		foreach ($aList as $sFile) {
			$bAlias = '.alias' === \substr($sFile, -6);
			if ($bAlias || '.ini' === \substr($sFile, -4)) {
				$sName = static::codeFileName(\preg_replace('/\.(ini|alias)$/', '', $sFile), true);
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
