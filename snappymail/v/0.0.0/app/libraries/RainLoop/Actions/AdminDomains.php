<?php

namespace RainLoop\Actions;

use RainLoop\Enumerations\PluginPropertyType;
use RainLoop\Exceptions\ClientException;

trait AdminDomains
{
	public function DoAdminDomainLoad() : array
	{
		$this->IsAdminLoggined();

		return $this->DefaultResponse($this->DomainProvider()->Load($this->GetActionParam('name', ''), false, false));
	}

	public function DoAdminDomainList() : array
	{
		$this->IsAdminLoggined();
		$bIncludeAliases = !empty($this->GetActionParam('includeAliases', '1'));
		return $this->DefaultResponse($this->DomainProvider()->GetList($bIncludeAliases));
	}

	public function DoAdminDomainDelete() : array
	{
		$this->IsAdminLoggined();

		return $this->DefaultResponse($this->DomainProvider()->Delete((string) $this->GetActionParam('name', '')));
	}

	public function DoAdminDomainDisable() : array
	{
		$this->IsAdminLoggined();

		return $this->DefaultResponse($this->DomainProvider()->Disable(
			(string) $this->GetActionParam('name', ''),
			!empty($this->GetActionParam('disabled', '0'))
		));
	}

	public function DoAdminDomainSave() : array
	{
		$this->IsAdminLoggined();

		$oDomain = $this->DomainProvider()->LoadOrCreateNewFromAction($this);

		return $this->DefaultResponse($oDomain ? $this->DomainProvider()->Save($oDomain) : false);
	}

	public function DoAdminDomainAliasSave() : array
	{
		$this->IsAdminLoggined();

		return $this->DefaultResponse($this->DomainProvider()->SaveAlias(
			(string) $this->GetActionParam('name', ''),
			(string) $this->GetActionParam('alias', '')
		));
	}

	public function DoAdminDomainMatch() : array
	{
		$sEmail = $this->GetActionParam('username');
		$sPassword = '********';
		$sLogin = '';
		$this->resolveLoginCredentials($sEmail, $sPassword, $sLogin);
		$oDomain = \str_contains($sEmail, '@')
			? $this->DomainProvider()->Load(\MailSo\Base\Utils::GetDomainFromEmail($sEmail), true)
			: null;
		return $this->DefaultResponse(array(
			'email' => $sEmail,
			'login' => $sLogin,
			'domain' => $oDomain,
			'whitelist' => $oDomain ? $oDomain->ValidateWhiteList($sEmail, $sLogin) : null
		));
	}

	public function DoAdminDomainTest() : array
	{
		$this->IsAdminLoggined();

		$mImapResult = false;
		$sImapErrorDesc = '';
		$mSmtpResult = false;
		$sSmtpErrorDesc = '';
		$mSieveResult = false;
		$sSieveErrorDesc = '';

		$oDomain = $this->DomainProvider()->LoadOrCreateNewFromAction($this, 'test.example.com');
		if ($oDomain) {
			$aAuth = $this->GetActionParam('auth');

			try
			{
				$oImapClient = new \MailSo\Imap\ImapClient();
				$oImapClient->SetLogger($this->Logger());

				$oSettings = $oDomain->ImapSettings();
				$oImapClient->Connect($oSettings);
				$mImapResult = [
					'connectCapa' => $oImapClient->Capabilities()
				];

				if (!empty($aAuth['user'])) {
					$oSettings->Login = $aAuth['user'];
					$oSettings->Password = $aAuth['pass'];
					$oImapClient->Login($oSettings);
					$mImapResult['authCapa'] = \array_values(\array_unique(\array_map(function($n){
							return \str_starts_with($n, 'THREAD=') ? 'THREAD' : $n;
						},
						$oImapClient->Capabilities()
					)));
				}

				$oImapClient->Disconnect();
			}
			catch (\MailSo\Net\Exceptions\SocketCanNotConnectToHostException $oException)
			{
				$this->logException($oException, \LOG_ERR);
				$sImapErrorDesc = $oException->getSocketMessage();
				if (empty($sImapErrorDesc)) {
					$sImapErrorDesc = $oException->getMessage();
				}
			}
			catch (\Throwable $oException)
			{
				$this->logException($oException, \LOG_ERR);
				$sImapErrorDesc = $oException->getMessage();
			}

			if ($oDomain->OutUsePhpMail()) {
				$mSmtpResult = \MailSo\Base\Utils::FunctionCallable('mail');
				if (!$mSmtpResult) {
					$sSmtpErrorDesc = 'PHP: mail() function is undefined';
				}
			} else {
				try
				{
					$oSmtpClient = new \MailSo\Smtp\SmtpClient();
					$oSmtpClient->SetLogger($this->Logger());

					$oSettings = $oDomain->SmtpSettings();
					$oSettings->Ehlo = \MailSo\Smtp\SmtpClient::EhloHelper();
					$oSmtpClient->Connect($oSettings);
					$mSmtpResult = [
						'connectCapa' => $oSmtpClient->Capability()
					];

					if (!empty($aAuth['user'])) {
						$oSettings->Login = $aAuth['user'];
						$oSettings->Password = $aAuth['pass'];
						$oSmtpClient->Login($oSettings);
						$mSmtpResult['authCapa'] = $oSmtpClient->Capability();
					}

					$oSmtpClient->Disconnect();
				}
				catch (\MailSo\Net\Exceptions\SocketCanNotConnectToHostException $oException)
				{
					$this->logException($oException, \LOG_ERR);
					$sSmtpErrorDesc = $oException->getSocketMessage();
					if (empty($sSmtpErrorDesc)) {
						$sSmtpErrorDesc = $oException->getMessage();
					}
				}
				catch (\Throwable $oException)
				{
					$this->logException($oException, \LOG_ERR);
					$sSmtpErrorDesc = $oException->getMessage();
				}
			}

			if ($oDomain->UseSieve()) {
				try
				{
					$oSieveClient = new \MailSo\Sieve\SieveClient();
					$oSieveClient->SetLogger($this->Logger());

					$oSettings = $oDomain->SieveSettings();
					$oSieveClient->Connect($oSettings);
					$mSieveResult = [
						'connectCapa' => $oSieveClient->Capability()
					];

					if (!empty($aAuth['user'])) {
						$oSettings->Login = $aAuth['user'];
						$oSettings->Password = $aAuth['pass'];
						$oSieveClient->Login($oSettings);
						$mSieveResult['authCapa'] = $oSieveClient->Capability();
					}

					$oSieveClient->Disconnect();
				}
				catch (\MailSo\Net\Exceptions\SocketCanNotConnectToHostException $oException)
				{
					$this->logException($oException, \LOG_ERR);
					$sSieveErrorDesc = $oException->getSocketMessage();
					if (empty($sSieveErrorDesc)) {
						$sSieveErrorDesc = $oException->getMessage();
					}
				}
				catch (\Throwable $oException)
				{
					$this->logException($oException, \LOG_ERR);
					$sSieveErrorDesc = $oException->getMessage();
				}
			} else {
				$mSieveResult = true;
			}
		}

		return $this->DefaultResponse(array(
			'Imap' => $mImapResult ? true : $sImapErrorDesc,
			'Smtp' => $mSmtpResult ? true : $sSmtpErrorDesc,
			'Sieve' => $mSieveResult ? true : $sSieveErrorDesc,
			'ImapResult' => $mImapResult,
			'SmtpResult' => $mSmtpResult,
			'SieveResult' => $mSieveResult
		));
	}

}
