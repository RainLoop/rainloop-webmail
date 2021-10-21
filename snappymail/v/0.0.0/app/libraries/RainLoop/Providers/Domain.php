<?php

namespace RainLoop\Providers;

class Domain extends AbstractProvider
{
	/**
	 * @var Domain\DomainInterface
	 */
	private $oDriver;

	/**
	 * @var \RainLoop\Plugins\Manager
	 */
	private $oPlugins;

	/**
	 * @var bool
	 */
	private $bAdmin;

	public function __construct(Domain\DomainInterface $oDriver,
		\RainLoop\Plugins\Manager $oPlugins)
	{
		$this->oDriver = $oDriver;
		$this->oPlugins = $oPlugins;
		$this->bAdmin = $this->oDriver instanceof Domain\DomainAdminInterface;
	}

	public function IsAdmin() : bool
	{
		return $this->bAdmin;
	}

	public function Load(string $sName, bool $bFindWithWildCard = false, bool $bCheckDisabled = true, bool $bCheckAliases = true) : ?\RainLoop\Model\Domain
	{
		$oDomain = $this->oDriver->Load($sName, $bFindWithWildCard, $bCheckDisabled, $bCheckAliases);
		if ($oDomain instanceof \RainLoop\Model\Domain)
		{
			$this->oPlugins->RunHook('filter.domain', array(&$oDomain));
		}

		return $oDomain;
	}

	public function Save(\RainLoop\Model\Domain $oDomain) : bool
	{
		return $this->bAdmin ? $this->oDriver->Save($oDomain) : false;
	}

	public function SaveAlias(string $sName, string $sAlias) : bool
	{
		if ($this->Load($sName, false, false))
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::DomainAlreadyExists);
		}

		return $this->bAdmin ? $this->oDriver->SaveAlias($sName, $sAlias) : false;
	}

	public function Delete(string $sName) : bool
	{
		return $this->bAdmin ? $this->oDriver->Delete($sName) : false;
	}

	public function Disable(string $sName, bool $bDisabled) : bool
	{
		return $this->bAdmin ? $this->oDriver->Disable($sName, $bDisabled) : false;
	}

	public function GetList(int $iOffset = 0, int $iLimit = 20, string $sSearch = '', bool $bIncludeAliases = true) : array
	{
		$sSearch = \trim($sSearch);

		if ($iOffset < 0)
		{
			$iOffset = 0;
		}

		if ($iLimit < 20)
		{
			$iLimit = 20;
		}

		return $this->bAdmin ? $this->oDriver->GetList($iOffset, $iLimit, $sSearch, $bIncludeAliases) : array();
	}

	public function Count(string $sSearch = '') : int
	{
		return $this->oDriver->Count($sSearch);
	}

	public function LoadOrCreateNewFromAction(\RainLoop\Actions $oActions, string $sNameForTest = null) : ?\RainLoop\Model\Domain
	{
		$oDomain = null;

		if ($this->bAdmin)
		{
			$sName = (string) $oActions->GetActionParam('Name', '');

			if (\strlen($sName) && $sNameForTest && !\str_contains($sName, '*'))
			{
				$sNameForTest = null;
			}

			if (\strlen($sName) || $sNameForTest)
			{
				$bCreate = '1' === (string) $oActions->GetActionParam('Create', '0');
				$sIncHost = (string) $oActions->GetActionParam('IncHost', '');
				$iIncPort = (int) $oActions->GetActionParam('IncPort', 143);
				$iIncSecure = (int) $oActions->GetActionParam('IncSecure', \MailSo\Net\Enumerations\ConnectionSecurityType::NONE);
				$bIncShortLogin = '1' === (string) $oActions->GetActionParam('IncShortLogin', '0');
				$bUseSieve = '1' === (string) $oActions->GetActionParam('UseSieve', '0');
				$sSieveHost = (string) $oActions->GetActionParam('SieveHost', '');
				$iSievePort = (int) $oActions->GetActionParam('SievePort', 4190);
				$iSieveSecure = (int) $oActions->GetActionParam('SieveSecure', \MailSo\Net\Enumerations\ConnectionSecurityType::NONE);
				$sOutHost = (string) $oActions->GetActionParam('OutHost', '');
				$iOutPort = (int) $oActions->GetActionParam('OutPort', 25);
				$iOutSecure = (int) $oActions->GetActionParam('OutSecure', \MailSo\Net\Enumerations\ConnectionSecurityType::NONE);
				$bOutShortLogin = '1' === (string) $oActions->GetActionParam('OutShortLogin', '0');
				$bOutAuth = '1' === (string) $oActions->GetActionParam('OutAuth', '1');
				$bOutSetSender = '1' === (string) $oActions->GetActionParam('OutSetSender', '0');
				$bOutUsePhpMail = '1' === (string) $oActions->GetActionParam('OutUsePhpMail', '0');
				$sWhiteList = (string) $oActions->GetActionParam('WhiteList', '');

				$oDomain = $sNameForTest ? null : $this->Load($sName);
				if ($oDomain instanceof \RainLoop\Model\Domain)
				{
					if ($bCreate)
					{
						throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::DomainAlreadyExists);
					}
					else
					{
						$oDomain->UpdateInstance(
							$sIncHost, $iIncPort, $iIncSecure, $bIncShortLogin,
							$bUseSieve, $sSieveHost, $iSievePort, $iSieveSecure,
							$sOutHost, $iOutPort, $iOutSecure, $bOutShortLogin, $bOutAuth, $bOutSetSender, $bOutUsePhpMail,
							$sWhiteList);
					}
				}
				else
				{
					$oDomain = new \RainLoop\Model\Domain($sNameForTest ?: $sName,
						$sIncHost, $iIncPort, $iIncSecure, $bIncShortLogin,
						$bUseSieve, $sSieveHost, $iSievePort, $iSieveSecure,
						$sOutHost, $iOutPort, $iOutSecure, $bOutShortLogin, $bOutAuth, $bOutSetSender, $bOutUsePhpMail,
						$sWhiteList);
				}
			}
		}

		return $oDomain;
	}

	public function IsActive() : bool
	{
		return $this->oDriver instanceof Domain\DomainInterface;
	}
}
