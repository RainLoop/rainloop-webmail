<?php

namespace RainLoop\Providers\Domain;

class DefaultDomain implements \RainLoop\Providers\Domain\DomainAdminInterface
{
	/**
	 * @var string
	 */
	protected $sDomainPath;

	/**
	 * @var \MailSo\Cache\CacheClient
	 */
	protected $oCacher;

	/**
	 * @param string $sDomainPath
	 * @param \MailSo\Cache\CacheClient $oCacher = null
	 *
	 * @return void
	 */
	public function __construct($sDomainPath, $oCacher = null)
	{
		$this->sDomainPath = \rtrim(\trim($sDomainPath), '\\/');
		$this->oCacher = $oCacher;
	}

	/**
	 * @param string $sName
	 * @param bool $bBack = false
	 *
	 * @return string
	 */
	public function codeFileName($sName, $bBack = false)
	{
		if ($bBack && 'default' === $sName)
		{
			return '*';
		}
		else if (!$bBack && '*' === $sName)
		{
			return 'default';
		}

		if ($bBack)
		{
			$sName = \MailSo\Base\Utils::IdnToUtf8($sName, true);
		}
		else
		{
			$sName = \MailSo\Base\Utils::IdnToAscii($sName, true);
		}

		return $bBack ? \str_replace('_wildcard_', '*', $sName) : \str_replace('*', '_wildcard_', $sName);
	}

	/**
	 * @param string $sName
	 * @param bool $bDisable
	 *
	 * @return bool
	 */
	public function Disable($sName, $bDisable)
	{
		$sName = \MailSo\Base\Utils::IdnToAscii($sName, true);

		$sFile = '';
		if (\file_exists($this->sDomainPath.'/disabled'))
		{
			$sFile = @\file_get_contents($this->sDomainPath.'/disabled');
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

		$aResult = \array_unique($aResult);
		return false !== \file_put_contents($this->sDomainPath.'/disabled', \trim(\implode(',', $aResult), ', '));
	}

	/**
	 * @return string
	 */
	private function wildcardDomainsCacheKey()
	{
		return '/WildCard/DomainCache/'.\md5(APP_VERSION.APP_PRIVATE_DATA_NAME).'/';
	}

	/**
	 * @return string
	 */
	private function getWildcardDomainsLine()
	{
		if ($this->oCacher)
		{
			$sResult = $this->oCacher->Get($this->wildcardDomainsCacheKey());
			if (0 < \strlen($sResult))
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
				$aNames[] = $this->codeFileName($sName, true);
			}
		}

		if (0 < \count($aNames))
		{
			\rsort($aNames, SORT_STRING);
			$sResult = \implode(' ', $aNames);
		}

		if ($this->oCacher)
		{
			$this->oCacher->Set($this->wildcardDomainsCacheKey(), $sResult);
		}

		return $sResult;
	}

	/**
	 * @param string $sName
	 * @param bool $bFindWithWildCard = false
	 * @param bool $bCheckDisabled = true
	 *
	 * @return \RainLoop\Model\Domain|null
	 */
	public function Load($sName, $bFindWithWildCard = false, $bCheckDisabled = true)
	{
		$mResult = null;

		$sDisabled = '';
		$sFoundedValue = '';

		$sRealFileName = $this->codeFileName($sName);

		if (\file_exists($this->sDomainPath.'/disabled'))
		{
			$sDisabled = @\file_get_contents($this->sDomainPath.'/disabled');
		}

		if (\file_exists($this->sDomainPath.'/'.$sRealFileName.'.ini') &&
			(!$bCheckDisabled || 0 === \strlen($sDisabled) || false === \strpos(','.$sDisabled.',', ','.\MailSo\Base\Utils::IdnToAscii($sName, true).',')))
		{
			$aDomain = \RainLoop\Utils::CustomParseIniFile($this->sDomainPath.'/'.$sRealFileName.'.ini');
			// fix misspellings (#119)
			if (\is_array($aDomain))
			{
				if (isset($aDomain['smpt_host']))
				{
					$aDomain['smtp_host'] = $aDomain['smpt_host'];
				}

				if (isset($aDomain['smpt_port']))
				{
					$aDomain['smtp_port'] = $aDomain['smpt_port'];
				}

				if (isset($aDomain['smpt_secure']))
				{
					$aDomain['smtp_secure'] = $aDomain['smpt_secure'];
				}

				if (isset($aDomain['smpt_auth']))
				{
					$aDomain['smtp_auth'] = $aDomain['smpt_auth'];
				}
			}
			//---

			$mResult = \RainLoop\Model\Domain::NewInstanceFromDomainConfigArray($sName, $aDomain);
		}
		else if ($bFindWithWildCard)
		{
			$sNames = $this->getWildcardDomainsLine();
			if (0 < \strlen($sNames))
			{
				if (\RainLoop\Plugins\Helper::ValidateWildcardValues(
					\MailSo\Base\Utils::IdnToUtf8($sName, true), $sNames, $sFoundedValue) && 0 < \strlen($sFoundedValue))
				{
					if (!$bCheckDisabled || 0 === \strlen($sDisabled) || false === \strpos(','.$sDisabled.',', ','.$sFoundedValue.','))
					{
						$mResult = $this->Load($sFoundedValue, false);
					}
				}
			}
		}

		return $mResult;
	}

	/**
	 * @param \RainLoop\Model\Domain $oDomain
	 *
	 * @return bool
	 */
	public function Save(\RainLoop\Model\Domain $oDomain)
	{
		$sRealFileName = $this->codeFileName($oDomain->Name());

		if ($this->oCacher)
		{
			$this->oCacher->Delete($this->wildcardDomainsCacheKey());
		}

		$mResult = \file_put_contents($this->sDomainPath.'/'.$sRealFileName.'.ini', $oDomain->ToIniString());
		return \is_int($mResult) && 0 < $mResult;
	}

	/**
	 * @param string $sName
	 *
	 * @return bool
	 */
	public function Delete($sName)
	{
		$bResult = true;
		$sRealFileName = $this->codeFileName($sName);

		if (0 < \strlen($sName) && \file_exists($this->sDomainPath.'/'.$sRealFileName.'.ini'))
		{
			$bResult = \unlink($this->sDomainPath.'/'.$sRealFileName.'.ini');
		}

		if ($bResult)
		{
			$this->Disable($sName, false);
		}

		if ($this->oCacher)
		{
			$this->oCacher->Delete($this->wildcardDomainsCacheKey());
		}

		return $bResult;
	}

	/**
	 * @param int $iOffset
	 * @param int $iLimit = 20
	 *
	 * @return array
	 */
	public function GetList($iOffset, $iLimit = 20)
	{
		$aResult = array();
		$aWildCards = array();
		$aList = \glob($this->sDomainPath.'/*.ini');

		foreach ($aList as $sFile)
		{
			$sName = \substr(\basename($sFile), 0, -4);
			$sName = $this->codeFileName($sName, true);

			if (false === \strpos($sName, '*'))
			{
				$aResult[] = $sName;
			}
			else
			{
				$aWildCards[] = $sName;
			}
		}

		\sort($aResult, SORT_STRING);
		\rsort($aWildCards, SORT_STRING);

		$aResult = \array_merge($aResult, $aWildCards);

		$iOffset = (0 > $iOffset) ? 0 : $iOffset;
		$iLimit = (0 > $iLimit) ? 0 : ((999 < $iLimit) ? 999 : $iLimit);

		$aResult = \array_slice($aResult, $iOffset, $iLimit);

		$aDisabledNames = array();
		if (0 < \count($aResult) && \file_exists($this->sDomainPath.'/disabled'))
		{
			$sDisabled = @\file_get_contents($this->sDomainPath.'/disabled');
			if (false !== $sDisabled && 0 < strlen($sDisabled))
			{
				$aDisabledNames = \explode(',', $sDisabled);
				$aDisabledNames = \array_unique($aDisabledNames);
				foreach ($aDisabledNames as $iIndex => $sValue)
				{
					$aDisabledNames[$iIndex] = \MailSo\Base\Utils::IdnToUtf8($sValue, true);
				}
			}
		}

		$aReturn = array();
		foreach ($aResult as $sName)
		{
			$aReturn[$sName] = !\in_array($sName, $aDisabledNames);
		}

		return $aReturn;
	}

	/**
	 * @param string $sSearch = ''
	 *
	 * @return int
	 */
	public function Count()
	{
		return \count($this->GetList(0, 999));
	}
}