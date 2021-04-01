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

/**
 * @category MailSo
 * @package Sieve
 */
class ManageSieveClient extends \MailSo\Net\NetClient
{
	/**
	 * @var bool
	 */
	private $bIsLoggined;

	/**
	 * @var array
	 */
	private $aCapa;

	/**
	 * @var int
	 */
	private $iRequestTime;

	/**
	 * @var bool
	 */
	public $__USE_INITIAL_AUTH_PLAIN_COMMAND;

	function __construct()
	{
		parent::__construct();

		$this->bIsLoggined = false;
		$this->iRequestTime = 0;
		$this->aCapa = array();
		$this->aModules = array();

		$this->__USE_INITIAL_AUTH_PLAIN_COMMAND = true;
	}

	public function IsSupported(string $sCapa) : bool
	{
		return isset($this->aCapa[\strtoupper($sCapa)]);
	}

	public function IsModuleSupported(string $sModule) : bool
	{
		return $this->IsSupported('SIEVE') && \in_array(\strtolower(\trim($sModule)), $this->aModules);
	}

	public function Modules() : array
	{
		return $this->aModules;
	}

	public function IsAuthSupported(string $sAuth) : bool
	{
		return $this->IsSupported('SASL') && \in_array(\strtoupper($sAuth), $this->aAuth);
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Sieve\Exceptions\ResponseException
	 */
	public function Connect(string $sServerName, int $iPort,
		int $iSecurityType = \MailSo\Net\Enumerations\ConnectionSecurityType::AUTO_DETECT,
		bool $bVerifySsl = false, bool $bAllowSelfSigned = true, string $sClientCert = '') : void
	{
		$this->iRequestTime = \microtime(true);

		parent::Connect($sServerName, $iPort, $iSecurityType, $bVerifySsl, $bAllowSelfSigned);

		$aResponse = $this->parseResponse();
		$this->validateResponse($aResponse);
		$this->parseStartupResponse($aResponse);

		if (\MailSo\Net\Enumerations\ConnectionSecurityType::UseStartTLS(
			$this->IsSupported('STARTTLS'), $this->iSecurityType))
		{
			$this->sendRequestWithCheck('STARTTLS');
			$this->EnableCrypto();

			$aResponse = $this->parseResponse();
			$this->validateResponse($aResponse);
			$this->parseStartupResponse($aResponse);
		}
		else if (\MailSo\Net\Enumerations\ConnectionSecurityType::STARTTLS === $this->iSecurityType)
		{
			$this->writeLogException(
				new \MailSo\Net\Exceptions\SocketUnsuppoterdSecureConnectionException('STARTTLS is not supported'),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Sieve\Exceptions\LoginException
	 */
	public function Login(string $sLogin, string $sPassword, string $sLoginAuthKey = '') : self
	{
		if (!strlen(\trim($sLogin)) || !strlen(\trim($sPassword)))
		{
			$this->writeLogException(
				new \MailSo\Base\Exceptions\InvalidArgumentException,
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		if ($this->IsSupported('SASL'))
		{
//			$encrypted = !empty(\stream_get_meta_data($this->rConnect)['crypto']);
			$type = '';
			$types = [
//				'SCRAM-SHA-256' => 1, // !$encrypted
//				'SCRAM-SHA-1' => 1, // !$encrypted
//				'CRAM-MD5' => 1, // $encrypted
				'PLAIN' => 1, // $encrypted
				'LOGIN' => 1 // $encrypted
			];
			foreach ($types as $sasl_type => $active) {
				if ($active && $this->IsAuthSupported($sasl_type) && \SnappyMail\SASL::isSupported($sasl_type)) {
					$type = $sasl_type;
					break;
				}
			}

			$SASL = \SnappyMail\SASL::factory($type);
			$SASL->base64 = true;

			$bAuth = false;
			try
			{
				if ('PLAIN' === $type)
				{
					$sAuth = $SASL->authenticate($sLogin, $sPassword, $sLoginAuthKey);

					if ($this->__USE_INITIAL_AUTH_PLAIN_COMMAND)
					{
						$this->sendRequest('AUTHENTICATE "PLAIN" "'.$sAuth.'"');
					}
					else
					{
						$this->sendRequest('AUTHENTICATE "PLAIN" {'.\strlen($sAuth).'+}');
						$this->sendRequest($sAuth);
					}

					$aResponse = $this->parseResponse();
					$this->validateResponse($aResponse);
					$this->parseStartupResponse($aResponse);
					$bAuth = true;
				}
				else if ('LOGIN' === $type)
				{
					$sLogin = $SASL->authenticate($sLogin, $sPassword);
					$sPassword = $SASL->challenge('');

					$this->sendRequest('AUTHENTICATE "LOGIN"');
					$this->sendRequest('{'.\strlen($sLogin).'+}');
					$this->sendRequest($sLogin);
					$this->sendRequest('{'.\strlen($sPassword).'+}');
					$this->sendRequest($sPassword);

					$aResponse = $this->parseResponse();
					$this->validateResponse($aResponse);
					$this->parseStartupResponse($aResponse);
					$bAuth = true;
				}
			}
			catch (\MailSo\Sieve\Exceptions\NegativeResponseException $oException)
			{
				$this->writeLogException(
					new \MailSo\Sieve\Exceptions\LoginBadCredentialsException(
						$oException->GetResponses(), '', 0, $oException),
					\MailSo\Log\Enumerations\Type::ERROR, true);
			}

			if (!$bAuth)
			{
				$this->writeLogException(
					new \MailSo\Sieve\Exceptions\LoginBadMethodException,
					\MailSo\Log\Enumerations\Type::ERROR, true);
			}
		}
		else
		{
			$this->writeLogException(
				new \MailSo\Sieve\Exceptions\LoginException,
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		$this->bIsLoggined = true;

		return $this;
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Sieve\Exceptions\NegativeResponseException
	 */
	public function Logout() : self
	{
		if ($this->bIsLoggined)
		{
			$this->sendRequestWithCheck('LOGOUT');
			$this->bIsLoggined = false;
		}

		return $this;
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Sieve\Exceptions\NegativeResponseException
	 */
	public function ListScripts() : array
	{
		$this->sendRequest('LISTSCRIPTS');
		$aResponse = $this->parseResponse();
		$this->validateResponse($aResponse);

		$aResult = array();
		foreach ($aResponse as $sLine)
		{
			$aTokens = $this->parseLine($sLine);
			if (!$aTokens)
			{
				continue;
			}

			$aResult[$aTokens[0]] = 'ACTIVE' === substr($sLine, -6);
		}

		return $aResult;
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Sieve\Exceptions\NegativeResponseException
	 */
	public function Capability() : array
	{
		$this->sendRequest('CAPABILITY');
		$aResponse = $this->parseResponse();
		$this->validateResponse($aResponse);
		$this->parseStartupResponse($aResponse);

		return $this->aCapa;
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Sieve\Exceptions\NegativeResponseException
	 */
	public function Noop() : self
	{
		$this->sendRequestWithCheck('NOOP');

		return $this;
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Sieve\Exceptions\NegativeResponseException
	 */
	public function GetScript(string $sScriptName) : string
	{
		$this->sendRequest('GETSCRIPT "'.$sScriptName.'"');
		$aResponse = $this->parseResponse();
		$this->validateResponse($aResponse);

		$sScript = '';
		if (0 < \count($aResponse))
		{
			if ('{' === $aResponse[0][0])
			{
				\array_shift($aResponse);
			}

			if (\in_array(\substr($aResponse[\count($aResponse) - 1], 0, 2), array('OK', 'NO')))
			{
				\array_pop($aResponse);
			}

			$sScript = \implode("\n", $aResponse);
		}

		return $sScript;
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Sieve\Exceptions\NegativeResponseException
	 */
	public function PutScript(string $sScriptName, string $sScriptSource) : self
	{
		$this->sendRequest('PUTSCRIPT "'.$sScriptName.'" {'.\strlen($sScriptSource).'+}');
		$this->sendRequestWithCheck($sScriptSource);

		return $this;
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Sieve\Exceptions\NegativeResponseException
	 */
	public function CheckScript(string $sScriptSource) : self
	{
		$this->sendRequest('CHECKSCRIPT {'.\strlen($sScriptSource).'+}');
		$this->sendRequestWithCheck($sScriptSource);

		return $this;
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Sieve\Exceptions\NegativeResponseException
	 */
	public function SetActiveScript(string $sScriptName) : self
	{
		$this->sendRequestWithCheck('SETACTIVE "'.$sScriptName.'"');

		return $this;
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Sieve\Exceptions\NegativeResponseException
	 */
	public function DeleteScript(string $sScriptName) : self
	{
		$this->sendRequestWithCheck('DELETESCRIPT "'.$sScriptName.'"');

		return $this;
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Sieve\Exceptions\NegativeResponseException
	 */
	public function RenameScript(string $sOldName, string $sNewName) : self
	{
		$this->sendRequestWithCheck('RENAMESCRIPT "'.$sOldName.'" "'.$sNewName.'"');

		return $this;
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Sieve\Exceptions\NegativeResponseException
	 */
	public function GetActiveScriptName() : string
	{
		$aList = $this->ListScripts();
		foreach ($aList as $sName => $bIsActive)
		{
			if ($bIsActive)
			{
				return $sName;
			}
		}

		return '';
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Sieve\Exceptions\NegativeResponseException
	 */
	public function IsActiveScript(string $sScriptName) : bool
	{
		return $sScriptName === $this->GetActiveScriptName();
	}

	private function parseLine(string $sLine) : ?array
	{
		if (false === $sLine || null === $sLine || \in_array(\substr($sLine, 0, 2), array('OK', 'NO')))
		{
			return null;
		}

		$iStart = -1;
		$iIndex = 0;
		$aResult = array();

		for ($iPos = 0; $iPos < \strlen($sLine); $iPos++)
		{
			if ('"' === $sLine[$iPos] && '\\' !== $sLine[$iPos])
			{
				if (-1 === $iStart)
				{
					$iStart = $iPos;
				}
				else
				{
					$aResult[$iIndex++] = \substr($sLine, $iStart + 1, $iPos - $iStart - 1);
					$iStart = -1;
				}
			}
		}

		return isset($aResult[0]) ? $aResult : null;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 */
	private function parseStartupResponse(array $aResponse) : void
	{
		foreach ($aResponse as $sLine)
		{
			$aTokens = $this->parseLine($sLine);

			if (false === $aTokens || !isset($aTokens[0]) ||
				\in_array(\substr($sLine, 0, 2), array('OK', 'NO')))
			{
				continue;
			}

			$sToken = \strtoupper($aTokens[0]);
			$this->aCapa[$sToken] = isset($aTokens[1]) ? $aTokens[1] : '';

			if (isset($aTokens[1]))
			{
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
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 */
	private function sendRequest(string $sRequest) : void
	{
		if (!strlen(\trim($sRequest)))
		{
			$this->writeLogException(
				new \MailSo\Base\Exceptions\InvalidArgumentException,
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		$this->IsConnected(true);

		$this->sendRaw($sRequest);
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Sieve\Exceptions\NegativeResponseException
	 */
	private function sendRequestWithCheck(string $sRequest) : void
	{
		$this->sendRequest($sRequest);
		$this->validateResponse($this->parseResponse());
	}

	private function convertEndOfLine(string $sLine) : string
	{
		$sLine = \trim($sLine);
		if ('}' === \substr($sLine, -1))
		{
			$iPos = \strrpos($sLine, '{');
			if (false !== $iPos)
			{
				$sSunLine = \substr($sLine, $iPos + 1, -1);
				if (\is_numeric($sSunLine) && 0 < (int) $sSunLine)
				{
					$iLen = (int) $sSunLine;

					$this->getNextBuffer($iLen, true);

					if (\strlen($this->sResponseBuffer) === $iLen)
					{
						$sLine = \trim(\substr_replace($sLine, $this->sResponseBuffer, $iPos));
					}
				}
			}
		}

		return $sLine;
	}

	private function parseResponse() : array
	{
		$this->iRequestTime = \microtime(true);

		$aResult = array();
		do
		{
			$this->getNextBuffer();

			$sLine = $this->sResponseBuffer;
			if (false === $sLine)
			{
				break;
			}
			else if (\in_array(\substr($sLine, 0, 2), array('OK', 'NO')))
			{
				$aResult[] = $this->convertEndOfLine($sLine);
				break;
			}
			else
			{
				$aResult[] = $this->convertEndOfLine($sLine);
			}
		}
		while (true);

		$this->writeLog((\microtime(true) - $this->iRequestTime),
			\MailSo\Log\Enumerations\Type::TIME);

		return $aResult;
	}

	/**
	 * @throws \MailSo\Sieve\Exceptions\NegativeResponseException
	 */
	private function validateResponse(array $aResponse)
	{
		if (!$aResponse ||
			'OK' !== \substr($aResponse[\count($aResponse) - 1], 0, 2))
		{
			$this->writeLogException(
				new \MailSo\Sieve\Exceptions\NegativeResponseException($aResponse),
				\MailSo\Log\Enumerations\Type::WARNING, true);
		}
	}

	protected function getLogName() : string
	{
		return 'SIEVE';
	}

}
