<?php

namespace RainLoop\Providers;

class Domain extends \RainLoop\Providers\AbstractProvider
{
	/**
	 * @var \RainLoop\Providers\Domain\DomainInterface
	 */
	private $oDriver;

	/**
	 * @var bool
	 */
	private $bAdmin;

	/**
	 * @param \RainLoop\Providers\Domain\DomainInterface $oDriver
	 *
	 * @return void
	 */
	public function __construct(\RainLoop\Providers\Domain\DomainInterface $oDriver)
	{
		$this->oDriver = $oDriver;
		$this->bAdmin = $this->oDriver instanceof \RainLoop\Providers\Domain\DomainAdminInterface;
	}

	/**
	 * @return bool
	 */
	public function IsAdmin()
	{
		return $this->bAdmin;
	}

	/**
	 * @param string $sName
	 * @param bool $bDefaultOnNull = false
	 *
	 * @return \RainLoop\Domain|null
	 */
	public function Load($sName, $bDefaultOnNull = false)
	{
		return $this->oDriver->Load($sName, $bDefaultOnNull);
	}

	/**
	 * @param \RainLoop\Domain $oDomain
	 *
	 * @return bool
	 */
	public function Save(\RainLoop\Domain $oDomain)
	{
		return $this->bAdmin ? $this->oDriver->Save($oDomain) : false;
	}

	/**
	 * @param string $sName
	 *
	 * @return bool
	 */
	public function Delete($sName)
	{
		return $this->bAdmin ? $this->oDriver->Delete($sName) : false;
	}

	/**
	 * @param string $sName
	 * @param bool $bDisabled
	 *
	 * @return bool
	 */
	public function Disable($sName, $bDisabled)
	{
		return $this->bAdmin ? $this->oDriver->Disable($sName, $bDisabled) : false;
	}

	/**
	 * @param int $iOffset = 0
	 * @param int $iLimit = 20
	 * @param string $sSearch = ''
	 *
	 * @return array
	 */
	public function GetList($iOffset = 0, $iLimit = 20, $sSearch = '')
	{
		return $this->bAdmin ? $this->oDriver->GetList($iOffset, $iLimit, $sSearch) : array();
	}

	/**
	 * @param string $sSearch = ''
	 *
	 * @return int
	 */
	public function Count($sSearch = '')
	{
		return $this->oDriver->Count($sSearch);
	}

	/**
	 * @param \RainLoop\Actions $oActions
	 * @param string $sNameForTest = ''
	 *
	 * @return \RainLoop\Domain | null
	 */
	public function LoadOrCreateNewFromAction(\RainLoop\Actions $oActions, $sNameForTest = '')
	{
		$oDomain = null;

		if ($this->bAdmin)
		{
			$bCreate = '1' === (string) $oActions->GetActionParam('Create', '0');
			$sName = (string) $oActions->GetActionParam('Name', '');
			$sIncHost = (string) $oActions->GetActionParam('IncHost', '');
			$iIncPort = (int) $oActions->GetActionParam('IncPort', 143);
			$iIncSecure = (int) $oActions->GetActionParam('IncSecure', \MailSo\Net\Enumerations\ConnectionSecurityType::NONE);
			$bIncShortLogin = '1' === (string) $oActions->GetActionParam('IncShortLogin', '0');
			$sOutHost = (string) $oActions->GetActionParam('OutHost', '');
			$iOutPort = (int) $oActions->GetActionParam('OutPort', 25);
			$iOutSecure = (int) $oActions->GetActionParam('OutSecure', \MailSo\Net\Enumerations\ConnectionSecurityType::NONE);
			$bOutShortLogin = '1' === (string) $oActions->GetActionParam('OutShortLogin', '0');
			$bOutAuth = '1' === (string) $oActions->GetActionParam('OutAuth', '1');
			$sWhiteList = (string) $oActions->GetActionParam('WhiteList', '');

			if (0 < strlen($sName) || 0 < strlen($sNameForTest))
			{
				$oDomain = 0 < strlen($sNameForTest) ? null : $this->Load($sName);
				if ($oDomain instanceof \RainLoop\Domain)
				{
					if ($bCreate)
					{
						throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::DomainAlreadyExists);
					}
					else
					{
						$oDomain->UpdateInstance(
							$sIncHost, $iIncPort, $iIncSecure, $bIncShortLogin,
							$sOutHost, $iOutPort, $iOutSecure, $bOutShortLogin, $bOutAuth,
							$sWhiteList);
					}
				}
				else
				{
					$oDomain = \RainLoop\Domain::NewInstance(0 < strlen($sNameForTest) ? $sNameForTest : $sName,
						$sIncHost, $iIncPort, $iIncSecure, $bIncShortLogin,
						$sOutHost, $iOutPort, $iOutSecure, $bOutShortLogin, $bOutAuth,
						$sWhiteList);
				}
			}
		}

		return $oDomain;
	}

	/**
	 * @return bool
	 */
	public function IsActive()
	{
		return $this->oDriver instanceof \RainLoop\Providers\Domain\DomainInterface;
	}
}