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
		$this->sDomainPath = rtrim(trim($sDomainPath), '\\/');
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
		if (file_exists($this->sDomainPath.'/disabled'))
		{
			$sFile = @file_get_contents($this->sDomainPath.'/disabled');
		}

		$aResult = array();
		$aNames = explode(',', $sFile);
		if ($bDisable)
		{
			array_push($aNames, $sName);
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

		$aResult = array_unique($aResult);
		return false !== file_put_contents($this->sDomainPath.'/disabled', trim(implode(',', $aResult), ', '));
	}

	/**
	 * @param string $sName
	 *
	 * @return \RainLoop\Domain | null
	 */
	public function Load($sName)
	{
		$mResult = null;
		$sName = strtolower($sName);
		if (file_exists($this->sDomainPath.'/'.$sName.'.ini'))
		{
			$mResult = \RainLoop\Domain::NewInstanceFromDomainConfigArray(
				$sName, @parse_ini_file($this->sDomainPath.'/'.$sName.'.ini'));

			if ($mResult instanceof \RainLoop\Domain)
			{
				if (file_exists($this->sDomainPath.'/disabled'))
				{
					$sDisabled = @file_get_contents($this->sDomainPath.'/disabled');
					if (false !== $sDisabled && 0 < strlen($sDisabled))
					{
						$mResult->SetDisabled(false !== strpos(strtolower(','.$sDisabled.','), strtolower(','.$sName.',')));
					}
				}
			}
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
		$mResult = file_put_contents($this->sDomainPath.'/'.strtolower($oDomain->Name()).'.ini', $oDomain->ToIniString());
		return is_int($mResult) && 0 < $mResult;
	}

	/**
	 * @param string $sName
	 *
	 * @return bool
	 */
	public function Delete($sName)
	{
		$bResult = true;
		$sName = strtolower($sName);
		if (0 < strlen($sName) && file_exists($this->sDomainPath.'/'.$sName.'.ini'))
		{
			$bResult = unlink($this->sDomainPath.'/'.$sName.'.ini');
		}

		return $bResult;
	}

	/**
	 * @param int $iOffset
	 * @param int $iLimit = 20
	 * @param string $sSearch = ''
	 *
	 * @return array
	 */
	public function GetList($iOffset, $iLimit = 20, $sSearch = '')
	{
		$aResult = array();
		$aList = glob($this->sDomainPath.'/*.ini');

		$sSearch = strtolower($sSearch);
		foreach ($aList as $sFile)
		{
			$sName = strtolower(substr(basename($sFile), 0, -4));
			if (0 === strlen($sSearch) || false !== strpos($sName, $sSearch))
			{
				$aResult[] = $sName;
			}
		}

		$iOffset = (0 > $iOffset) ? 0 : $iOffset;
		$iLimit = (0 > $iLimit) ? 0 : ((999 < $iLimit) ? 999 : $iLimit);

		$aResult = array_slice($aResult, $iOffset, $iLimit);

		$aDisabledNames = array();
		if (0 < count($aResult) && file_exists($this->sDomainPath.'/disabled'))
		{
			$sDisabled = @file_get_contents($this->sDomainPath.'/disabled');
			if (false !== $sDisabled && 0 < strlen($sDisabled))
			{
				$aDisabledNames = explode(',', strtolower($sDisabled));
				$aDisabledNames = array_unique($aDisabledNames);
			}
		}

		$aReturn = array();
		foreach ($aResult as $sName)
		{
			$aReturn[$sName] = !in_array(strtolower($sName), $aDisabledNames);
		}

		return $aReturn;
	}

	/**
	 * @param string $sSearch = ''
	 *
	 * @return int
	 */
	public function Count($sSearch = '')
	{
		return count($this->GetList(0, 999, $sSearch));
	}
}