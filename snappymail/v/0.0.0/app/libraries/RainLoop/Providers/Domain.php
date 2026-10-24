<?php

namespace RainLoop\Providers;

use RainLoop\Notifications;
use RainLoop\Exceptions\ClientException;

class Domain extends AbstractProvider
{
	private Domain\DomainInterface $oDriver;

	private \RainLoop\Plugins\Manager $oPlugins;

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
			throw new ClientException(\RainLoop\Notifications::DomainAlreadyExists);
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

	public function LoadOrCreateNewFromAction(\RainLoop\Actions $oActions, ?string $sNameForTest = null) : ?\RainLoop\Model\Domain
	{
		$sName = \mb_strtolower((string) $oActions->GetActionParam('name', ''));
		if (\strlen($sName) && $sNameForTest && !\str_contains($sName, '*')) {
			$sNameForTest = null;
		}
		if (\strlen($sName) || $sNameForTest) {
			if (!$sNameForTest && !empty($oActions->GetActionParam('create', 0)) && $this->Load($sName)) {
				throw new ClientException(\RainLoop\Notifications::DomainAlreadyExists);
			}
			return \RainLoop\Model\Domain::fromArray($sNameForTest ?: $sName, [
				'IMAP' => $oActions->GetActionParam('IMAP'),
				'SMTP' => $oActions->GetActionParam('SMTP'),
				'Sieve' => $oActions->GetActionParam('Sieve'),
				'whiteList' => $oActions->GetActionParam('whiteList')
			]);
		}
		return null;
	}

	public function IsActive() : bool
	{
		return $this->oDriver instanceof Domain\DomainInterface;
	}

	public function getByEmailAddress(string $sEmail) : \RainLoop\Model\Domain
	{
		$oDomain = $this->Load(\MailSo\Base\Utils::getEmailAddressDomain($sEmail), true);
		if (!$oDomain) {
			throw new ClientException(Notifications::DomainNotAllowed, null, "{$sEmail} has no domain configuration");
		}
		if (!$oDomain->ValidateWhiteList($sEmail)) {
			throw new ClientException(Notifications::AccountNotAllowed, null, "{$sEmail} not whitelisted");
		}
		return $oDomain;
	}
}
