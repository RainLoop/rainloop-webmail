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

	public function __construct(Domain\DomainInterface $oDriver, \RainLoop\Plugins\Manager $oPlugins)
	{
		$this->oDriver = $oDriver;
		$this->oPlugins = $oPlugins;
	}

	public function Load(string $sName, bool $bFindWithWildCard = false, bool $bCheckDisabled = true, bool $bCheckAliases = true) : ?\RainLoop\Model\Domain
	{
		$oDomain = $this->oDriver->Load($sName, $bFindWithWildCard, $bCheckDisabled, $bCheckAliases);
		$oDomain && $this->oPlugins->RunHook('filter.domain', array($oDomain));
		return $oDomain;
	}

	public function Save(\RainLoop\Model\Domain $oDomain) : bool
	{
		return $this->oDriver->Save($oDomain);
	}

	public function SaveAlias(string $sName, string $sAlias) : bool
	{
		if ($this->Load($sName, false, false)) {
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
		$sName = (string) $oActions->GetActionParam('Name', '');
		if (\strlen($sName) && $sNameForTest && !\str_contains($sName, '*')) {
			$sNameForTest = null;
		}
		if (\strlen($sName) || $sNameForTest) {
			if (!$sNameForTest && !empty($oActions->GetActionParam('Create', 0)) && $this->Load($sName)) {
				throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::DomainAlreadyExists);
			}
			return \RainLoop\Model\Domain::fromArray($sNameForTest ?: $sName, [
				'imapHost' => $oActions->GetActionParam('IncHost', ''),
				'imapPort' => $oActions->GetActionParam('IncPort', 143),
				'imapSecure' => $oActions->GetActionParam('IncSecure', \MailSo\Net\Enumerations\ConnectionSecurityType::NONE),
				'imapShortLogin' => $oActions->GetActionParam('IncShortLogin', 0),
				'useSieve' => $oActions->GetActionParam('UseSieve', 0),
				'sieveHost' => $oActions->GetActionParam('SieveHost', ''),
				'sievePort' => $oActions->GetActionParam('SievePort', 4190),
				'sieveSecure' => $oActions->GetActionParam('SieveSecure', \MailSo\Net\Enumerations\ConnectionSecurityType::NONE),
				'smtpHost' => $oActions->GetActionParam('OutHost', ''),
				'smtpPort' => $oActions->GetActionParam('OutPort', 25),
				'smtpSecure' => $oActions->GetActionParam('OutSecure', \MailSo\Net\Enumerations\ConnectionSecurityType::NONE),
				'smtpShortLogin' => $oActions->GetActionParam('OutShortLogin', 0),
				'smtpAuth' => $oActions->GetActionParam('OutAuth', 1),
				'smtpSetSender' => $oActions->GetActionParam('OutSetSender', 0),
				'smtpPhpMail' => $oActions->GetActionParam('OutUsePhpMail', 0),
				'whiteList' => $oActions->GetActionParam('WhiteList', '')
			]);
		}
		return null;
	}

	public function IsActive() : bool
	{
		return $this->oDriver instanceof Domain\DomainInterface;
	}
}
