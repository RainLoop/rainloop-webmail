<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Sieve;

use MailSo\Net\Enumerations\ConnectionSecurityType;

/**
 * @category MailSo
 * @package Sieve
 */
class SieveClient extends \MailSo\Net\NetClient
{
	private bool $bIsLoggined = false;

	private array $aCapa = array();

	private array $aAuth = array();

	private array $aModules = array();

	public function hasCapability(string $sCapa) : bool
	{
		return isset($this->aCapa[\strtoupper($sCapa)]);
	}

	public function Modules() : array
	{
		return $this->aModules;
	}

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Sieve\Exceptions\*
	 */
	public function Connect(\MailSo\Net\ConnectSettings $oSettings) : void
	{
		parent::Connect($oSettings);

		$aResponse = $this->parseResponse();
		$this->parseStartupResponse($aResponse);

		if (ConnectionSecurityType::STARTTLS === $this->Settings->type
		 || (ConnectionSecurityType::AUTO_DETECT === $this->Settings->type && $this->hasCapability('STARTTLS'))) {
			$this->StartTLS();
		}
	}

	private function StartTLS() : void
	{
		if ($this->hasCapability('STARTTLS')) {
			$this->sendRequestWithCheck('STARTTLS');
			$this->EnableCrypto();
			$aResponse = $this->parseResponse();
			$this->parseStartupResponse($aResponse);
		} else {
			$this->writeLogException(
				new \MailSo\Net\Exceptions\SocketUnsuppoterdSecureConnectionException('STARTTLS is not supported'),
				\LOG_ERR);
		}
	}

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Sieve\Exceptions\*
	 */
	public function Login(Settings $oSettings) : self
	{
		$sLogin = $oSettings->Login;
		$sPassword = $oSettings->Password;
		$sLoginAuthKey = '';
		if (!\strlen($sLogin) || !\strlen($sPassword)) {
			$this->writeLogException(new \InvalidArgumentException, \LOG_ERR);
		}

		$type = '';
		if ($this->hasCapability('SASL')) {
			foreach ($oSettings->SASLMechanisms as $sasl_type) {
				if (\in_array(\strtoupper($sasl_type), $this->aAuth) && \SnappyMail\SASL::isSupported($sasl_type)) {
					$type = $sasl_type;
					break;
				}
			}
		}
		if (!$type) {
			if (!$this->Encrypted() && $this->hasCapability('STARTTLS')) {
				$this->StartTLS();
				return $this->Login($oSettings);
			}
			$this->writeLogException(new \MailSo\Sieve\Exceptions\LoginException, \LOG_ERR);
		}

		$SASL = \SnappyMail\SASL::factory($type);
		$SASL->base64 = true;

		$bAuth = false;
		try
		{
			if (0 === \strpos($type, 'SCRAM-'))
			{
/*
				$sAuthzid = $this->getResponseValue($this->SendRequestGetResponse('AUTHENTICATE', array($type)), \MailSo\Imap\Enumerations\ResponseType::CONTINUATION);
				$this->sendRaw($SASL->authenticate($sLogin, $sPassword/*, $sAuthzid* /), true);
				$sChallenge = $SASL->challenge($this->getResponseValue($this->getResponse(), \MailSo\Imap\Enumerations\ResponseType::CONTINUATION));
				$this->oLogger && $this->oLogger->AddSecret($sChallenge);
				$this->sendRaw($sChallenge);
				$oResponse = $this->getResponse();
				$SASL->verify($this->getResponseValue($oResponse));
*/
			}
			else if ('PLAIN' === $type || 'OAUTHBEARER' === $type || 'XOAUTH2' === $type)
			{
				$sAuth = $SASL->authenticate($sLogin, $sPassword, $sLoginAuthKey);
				$this->oLogger && $this->oLogger->AddSecret($sAuth);

				if ($oSettings->initialAuthPlain) {
					$this->sendRaw("AUTHENTICATE \"{$type}\" \"{$sAuth}\"");
				} else {
					$this->sendRaw("AUTHENTICATE \"{$type}\" {".\strlen($sAuth).'+}');
					$this->sendRaw($sAuth);
				}

				$aResponse = $this->parseResponse();
				$this->parseStartupResponse($aResponse);
				$bAuth = true;
			}
			else if ('LOGIN' === $type)
			{
				$sLogin = $SASL->authenticate($sLogin, $sPassword);
				$sPassword = $SASL->challenge('');
				$this->oLogger && $this->oLogger->AddSecret($sPassword);

				$this->sendRaw('AUTHENTICATE "LOGIN"');
				$this->sendRaw('{'.\strlen($sLogin).'+}');
				$this->sendRaw($sLogin);
				$this->sendRaw('{'.\strlen($sPassword).'+}');
				$this->sendRaw($sPassword);

				$aResponse = $this->parseResponse();
				$this->parseStartupResponse($aResponse);
				$bAuth = true;
			}
		}
		catch (\MailSo\Sieve\Exceptions\NegativeResponseException $oException)
		{
			$this->writeLogException(
				new \MailSo\Sieve\Exceptions\LoginBadCredentialsException($oException->GetResponses(), '', 0, $oException),
				\LOG_ERR);
		}

		$bAuth || $this->writeLogException(new \MailSo\Sieve\Exceptions\LoginBadMethodException, \LOG_ERR);

		$this->bIsLoggined = true;

		return $this;
	}

	/**
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Sieve\Exceptions\*
	 */
	public function Logout() : void
	{
		if ($this->bIsLoggined) {
			$this->sendRequestWithCheck('LOGOUT');
			$this->bIsLoggined = false;
		}
	}

	/**
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Sieve\Exceptions\*
	 */
	public function ListScripts() : array
	{
		$this->sendRequest('LISTSCRIPTS');
		$aResponse = $this->parseResponse();
		$aResult = array();
		foreach ($aResponse as $sLine) {
			$aTokens = $this->parseLine($sLine);
			if ($aTokens) {
				$aResult[$aTokens[0]] = 'ACTIVE' === \substr($sLine, -6);
			}
		}

		return $aResult;
	}

	/**
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Sieve\Exceptions\*
	 */
	public function Capability() : array
	{
		$this->sendRequest('CAPABILITY');
		$aResponse = $this->parseResponse();
		$this->parseStartupResponse($aResponse);

		return $this->aCapa;
	}

	/**
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Sieve\Exceptions\*
	 */
	public function Noop() : self
	{
		$this->sendRequestWithCheck('NOOP');

		return $this;
	}

	/**
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Sieve\Exceptions\*
	 */
	public function GetScript(string $sScriptName) : string
	{
		$sScriptName = \addcslashes($sScriptName, '"\\');
		$this->sendRequest('GETSCRIPT "'.$sScriptName.'"');
		$aResponse = $this->parseResponse();

		$sScript = '';
		if (\count($aResponse)) {
			if ('{' === $aResponse[0][0]) {
				\array_shift($aResponse);
			}

			if (\in_array(\substr($aResponse[\count($aResponse) - 1], 0, 2), array('OK', 'NO'))) {
				\array_pop($aResponse);
			}

			$sScript = \implode("\r\n", $aResponse);
		}

		return $sScript;
	}

	/**
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Sieve\Exceptions\*
	 */
	public function PutScript(string $sScriptName, string $sScriptSource) : self
	{
		$sScriptName = \addcslashes($sScriptName, '"\\');
		$sScriptSource = \preg_replace('/\r?\n/', "\r\n", $sScriptSource);
		$this->sendRequest('PUTSCRIPT "'.$sScriptName.'" {'.\strlen($sScriptSource).'+}');
		$this->sendRequestWithCheck($sScriptSource);

		return $this;
	}

	/**
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Sieve\Exceptions\*
	 */
	public function CheckScript(string $sScriptSource) : self
	{
		$sScriptSource = \preg_replace('/\r?\n/', "\r\n", $sScriptSource);
		$this->sendRequest('CHECKSCRIPT {'.\strlen($sScriptSource).'+}');
		$this->sendRequestWithCheck($sScriptSource);

		return $this;
	}

	/**
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Sieve\Exceptions\*
	 */
	public function SetActiveScript(string $sScriptName) : self
	{
		$sScriptName = \addcslashes($sScriptName, '"\\');
		$this->sendRequestWithCheck('SETACTIVE "'.$sScriptName.'"');

		return $this;
	}

	/**
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Sieve\Exceptions\*
	 */
	public function DeleteScript(string $sScriptName) : self
	{
		$sScriptName = \addcslashes($sScriptName, '"\\');
		$this->sendRequestWithCheck('DELETESCRIPT "'.$sScriptName.'"');

		return $this;
	}

	/**
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Sieve\Exceptions\*
	 */
	public function RenameScript(string $sOldName, string $sNewName) : self
	{
		$sOldName = \addcslashes($sOldName, '"\\');
		$sNewName = \addcslashes($sNewName, '"\\');
		$this->sendRequestWithCheck('RENAMESCRIPT "'.$sOldName.'" "'.$sNewName.'"');

		return $this;
	}

	private function parseLine(string $sLine) : ?array
	{
		if (!\in_array(\substr($sLine, 0, 2), array('OK', 'NO'))) {
			$aResult = array();
			if (\preg_match_all('/(?:(?:"((?:\\\\"|[^"])*)"))/', $sLine, $aResult)) {
				return \array_map('stripcslashes', $aResult[1]);
			}
		}
		return null;
	}

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 */
	private function parseStartupResponse(array $aResponse) : void
	{
		foreach ($aResponse as $sLine) {
			$aTokens = $this->parseLine($sLine);
			if (empty($aTokens[0]) || \in_array(\substr($sLine, 0, 2), array('OK', 'NO'))) {
				continue;
			}

			$sToken = \strtoupper($aTokens[0]);
			$this->aCapa[$sToken] = isset($aTokens[1]) ? $aTokens[1] : '';

			if (isset($aTokens[1])) {
				switch ($sToken) {
					case 'SASL':
						$this->aAuth = \explode(' ', \strtoupper($aTokens[1]));
						break;
					case 'SIEVE':
						$this->aModules = \explode(' ', \strtolower($aTokens[1]));
						break;
				}
			}
		}
	}

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 */
	private function sendRequest(string $sRequest) : void
	{
		if (!\strlen(\trim($sRequest))) {
			$this->writeLogException(new \InvalidArgumentException, \LOG_ERR);
		}

		$this->IsConnected(true);

		$this->sendRaw($sRequest);
	}

	/**
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Sieve\Exceptions\*
	 */
	private function sendRequestWithCheck(string $sRequest) : void
	{
		$this->sendRequest($sRequest);
		$this->parseResponse();
	}

	private function parseResponse() : array
	{
		$aResult = array();
		do
		{
			$sResponseBuffer = $this->getNextBuffer();
			if (null === $sResponseBuffer) {
				break;
			}
			$bEnd = \in_array(\substr($sResponseBuffer, 0, 2), array('OK', 'NO'));
			// convertEndOfLine
			$sLine = \trim($sResponseBuffer);
			if ('}' === \substr($sLine, -1)) {
				$iPos = \strrpos($sLine, '{');
				if (false !== $iPos) {
					$iLen = \intval(\substr($sLine, $iPos + 1, -1));
					if (0 < $iLen) {
						$sResponseBuffer = $this->getNextBuffer($iLen);
						if (\strlen($sResponseBuffer) === $iLen) {
							$sLine = \trim(\substr_replace($sLine, $sResponseBuffer, $iPos));
						}
					}
				}
			}
			$aResult[] = $sLine;
			if ($bEnd) {
				break;
			}
		}
		while (true);

		if (!$aResult || 'OK' !== \substr($aResult[\array_key_last($aResult)], 0, 2)) {
			$this->writeLogException(new \MailSo\Sieve\Exceptions\NegativeResponseException($aResult), \LOG_WARNING);
		}

		return $aResult;
	}

	public function getLogName() : string
	{
		return 'SIEVE';
	}

}
