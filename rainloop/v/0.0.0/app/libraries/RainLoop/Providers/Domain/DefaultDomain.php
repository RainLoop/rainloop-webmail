<?php

namespace RainLoop\Providers\Domain;

class DefaultDomain implements \RainLoop\Providers\Domain\DomainAdminInterface
{
	/**
	 * @var string
	 */
	protected $sDomainPath;

	/**
	 * @param string $sDomainPath
	 *
	 * @return void
	 */
	public function __construct($sDomainPath)
	{
		$this->sDomainPath = \rtrim(\trim($sDomainPath), '\\/');
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

		$sName = \strtolower($sName);
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
	 * @param string $sName
	 * @param bool $bFindWithWildCard = false
	 *
	 * @return \RainLoop\Domain | null
	 */
	public function Load($sName, $bFindWithWildCard = false)
	{
		$mResult = null;
		$sName = \strtolower($sName);
		$sRealFileName = $this->codeFileName($sName);
		if (\file_exists($this->sDomainPath.'/'.$sRealFileName.'.ini'))
		{
			$mResult = \RainLoop\Domain::NewInstanceFromDomainConfigArray(
				$sName, @\parse_ini_file($this->sDomainPath.'/'.$sRealFileName.'.ini'));

			if ($mResult instanceof \RainLoop\Domain)
			{
				if (\file_exists($this->sDomainPath.'/disabled'))
				{
					$sDisabled = @\file_get_contents($this->sDomainPath.'/disabled');
					if (false !== $sDisabled && 0 < \strlen($sDisabled))
					{
						$mResult->SetDisabled(false !== \strpos(strtolower(','.$sDisabled.','), \strtolower(','.$sName.',')));
					}
				}
			}
		}
		else if ($bFindWithWildCard)
		{
			// TODO
//			$sNames = '';
//			$aNames = array();
//
//			$aList = \glob($this->sDomainPath.'/*.ini');
//			foreach ($aList as $sFile)
//			{
//				$sName = \strtolower(\substr(\basename($sFile), 0, -4));
//				if ('default' === $sName || false !== strpos($sName, '_wildcard_'))
//				{
//					$aNames[] = $this->codeFileName($sName, true);
//				}
//			}
//
//			if (0 < \count($aNames))
//			{
//				\rsort($sNames, SORT_STRING);
//				$sNames = \implode(' ', $aNames);
//			}
//
//			if (0 < \strlen($sNames))
//			{
//				$sFoundedValue = '';
//				if (\RainLoop\Plugins\Helper::ValidateWildcardValues($sName, $sNames, $sFoundedValue) && 0 < \strlen($sFoundedValue))
//				{
//					$mResult = $this->Load($sFoundedValue, false);
//				}
//			}
			
			$mResult = $this->Load('default', false);
		}

		return $mResult;
	}

	/**
	 * @param \RainLoop\Domain $oDomain
	 *
	 * @return bool
	 */
	public function Save(\RainLoop\Domain $oDomain)
	{
		$sName = \strtolower($oDomain->Name());
		$sRealFileName = $this->codeFileName($sName);

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
		$sName = \strtolower($sName);
		$sRealFileName = $this->codeFileName($sName);

		if (0 < \strlen($sName) && \file_exists($this->sDomainPath.'/'.$sRealFileName.'.ini'))
		{
			$bResult = \unlink($this->sDomainPath.'/'.$sRealFileName.'.ini');
		}

		if ($bResult)
		{
			$this->Disable($sName, false);
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
			$sName = \strtolower(\substr(\basename($sFile), 0, -4));
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
				$aDisabledNames = \explode(',', strtolower($sDisabled));
				$aDisabledNames = \array_unique($aDisabledNames);
			}
		}

		$aReturn = array();
		foreach ($aResult as $sName)
		{
			$aReturn[$sName] = !\in_array(\strtolower($sName), $aDisabledNames);
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