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

	public function __construct(Domain\DomainInterface $oDriver,
		\RainLoop\Plugins\Manager $oPlugins)
	{
		$this->oDriver = $oDriver;
		$this->oPlugins = $oPlugins;
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
		return $this->oDriver->Save($oDomain);
	}

	public function SaveAlias(string $sName, string $sAlias) : bool
	{
		if ($this->Load($sName, false, false))
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::DomainAlreadyExists);
		}

		return $this->oDriver->SaveAlias($sName, $sAlias);
	}

	public function Delete(string $sName) : bool
	{
		return $this->oDriver->Delete($sName);
	}

	public function Disable(string $sName, bool $bDisabled) : bool
	{
		return $this->oDriver->Disable($sName, $bDisabled);
	}

	public function GetList(bool $bIncludeAliases = true) : array
	{
		return $this->oDriver->GetList($bIncludeAliases);
	}

	public function LoadOrCreateNewFromAction(\RainLoop\Actions $oActions, string $sNameForTest = null) : ?\RainLoop\Model\Domain
	{
		$oDomain = null;

		$sName = (string) $oActions->GetActionParam('Name', '');

		if (\strlen($sName) && $sNameForTest && !\str_contains($sName, '*'))
		{
			$sNameForTest = null;
		}

		if (\strlen($sName) || $sNameForTest)
		{
			$bCreate = !empty($oActions->GetActionParam('Create', 0));
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
			}
			else
			{
				$oDomain = new \RainLoop\Model\Domain($sNameForTest ?: $sName);
			}

			$sIncHost = \MailSo\Base\Utils::IdnToAscii($sIncHost);
			$sSieveHost = \MailSo\Base\Utils::IdnToAscii($sSieveHost);
			$sOutHost = \MailSo\Base\Utils::IdnToAscii($sOutHost);

			$oDomain->SetConfig(
				$sIncHost, $iIncPort, $iIncSecure, $bIncShortLogin,
				$bUseSieve, $sSieveHost, $iSievePort, $iSieveSecure,
				$sOutHost, $iOutPort, $iOutSecure, $bOutShortLogin, $bOutAuth, $bOutSetSender, $bOutUsePhpMail,
				$sWhiteList);
		}

		return $oDomain;
	}

	public function IsActive() : bool
	{
		return $this->oDriver instanceof Domain\DomainInterface;
	}
}
