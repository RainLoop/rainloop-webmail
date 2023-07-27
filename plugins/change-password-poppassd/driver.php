<?php

use MailSo\Net\ConnectSettings;

class ChangePasswordPoppassdDriver extends \MailSo\Net\NetClient
{
	const
		NAME        = 'Poppassd',
		DESCRIPTION = 'Change passwords using Poppassd.';

	private
		$oConfig = null;

	function __construct(\RainLoop\Config\Plugin $oConfig, \MailSo\Log\Logger $oLogger)
	{
		$this->oConfig = $oConfig;
		$this->oLogger = $oLogger;
	}


	public static function configMapping() : array
	{
		return array(
			\RainLoop\Plugins\Property::NewInstance('poppassd_host')->SetLabel('POPPASSD Host')
				->SetDefaultValue('127.0.0.1'),
			\RainLoop\Plugins\Property::NewInstance('poppassd_port')->SetLabel('POPPASSD Port')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::INT)
				->SetDefaultValue(106),
			\RainLoop\Plugins\Property::NewInstance('poppassd_allowed_emails')->SetLabel('Allowed emails')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
				->SetDescription('Allowed emails, space as delimiter, wildcard supported. Example: user1@domain1.net user2@domain1.net *@domain2.net')
				->SetDefaultValue('*')
		);
	}

	public function ChangePassword(\RainLoop\Model\Account $oAccount, string $sPrevPassword, string $sNewPassword) : bool
	{
		if (!\RainLoop\Plugins\Helper::ValidateWildcardValues($oAccount->Email(), $this->oConfig->Get('plugin', 'poppassd_allowed_emails', ''))) {
			return false;
		}

		try
		{
			$oSettings = new ConnectSettings;
			$oSettings->host = $this->oConfig->Get('plugin', 'poppassd_host', '');
			$oSettings->port = (int) $this->oConfig->Get('plugin', 'poppassd_port', 106);
			$this->Connect($oSettings);

			if ($this->bIsLoggined) {
				$this->writeLogException(
					new \RuntimeException('Already authenticated for this session'),
					\LOG_ERR, true);
			}

			try
			{
				$this->sendRequestWithCheck('user', $oAccount->IncLogin(), true);
				$this->sendRequestWithCheck('pass', $sPrevPassword, true);
			}
			catch (\Throwable $oException)
			{
				$this->writeLogException($oException, \LOG_NOTICE, true);
			}

			$this->bIsLoggined = true;

			if ($this->bIsLoggined) {
				$this->sendRequestWithCheck('newpass', $sNewPassword);
			} else {
				$this->writeLogException(
					new \RuntimeException('Required login'),
					\LOG_ERR, true);
			}


			$this->Disconnect();

			return true;
		}
		catch (\Throwable $oException)
		{
		}

		return false;
	}

	private
		$bIsLoggined = false,
		$iRequestTime = 0;

	public function Connect(ConnectSettings $oSettings) : void
	{
		$this->iRequestTime = \microtime(true);
		parent::Connect($oSettings);
		$this->validateResponse();
	}

	public function supportsAuthType(string $sasl_type) : bool
	{
		return true;
	}

	public static function isSupported() : bool
	{
		return true;
	}

	public function Logout() : void
	{
		if ($this->bIsLoggined) {
			$this->sendRequestWithCheck('quit');
		}
		$this->bIsLoggined = false;
	}

	private function secureRequestParams($sCommand, $sAddToCommand) : ?string
	{
		if (\strlen($sAddToCommand)) {
			switch (\strtolower($sCommand))
			{
				case 'pass':
				case 'newpass':
					return '********';
			}
		}

		return null;
	}

	private function sendRequestWithCheck(string $sCommand, string $sAddToCommand = '', bool $bAuthRequestValidate = false) : void
	{
		$sCommand = \trim($sCommand);
		if (!\strlen($sCommand)) {
			$this->writeLogException(new \MailSo\Base\Exceptions\InvalidArgumentException(), \LOG_ERR, true);
		}

		$this->IsConnected(true);

		$sRealCommand = $sCommand . (\strlen($sAddToCommand) ? ' '.$sAddToCommand : '');

		$sFakeCommand = '';
		$sFakeAddToCommand = $this->secureRequestParams($sCommand, $sAddToCommand);
		if (\strlen($sFakeAddToCommand)) {
			$sFakeCommand = $sCommand . ' ' . $sFakeAddToCommand;
		}

		$this->iRequestTime = \microtime(true);
		$this->sendRaw($sRealCommand, true, $sFakeCommand);

		$this->validateResponse($bAuthRequestValidate);
	}

	private function validateResponse(bool $bAuthRequestValidate = false) : self
	{
		$this->getNextBuffer();

		$bResult = \preg_match($bAuthRequestValidate ? '/^[23]\d\d/' : '/^2\d\d/', trim($this->sResponseBuffer));

		if (!$bResult) {
			// POP3 validation hack
			$bResult = '+OK ' === \substr(\trim($this->sResponseBuffer), 0, 4);
		}

		if (!$bResult) {
			$this->writeLogException(new \MailSo\Base\Exceptions\Exception(), \LOG_WARNING, true);
		}

		$this->writeLog((\microtime(true) - $this->iRequestTime), \LOG_DEBUG);

		return $this;
	}

	function getLogName() : string
	{
		return 'POPPASSD';
	}
}
