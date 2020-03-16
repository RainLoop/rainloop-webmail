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

	protected function __construct()
	{
		parent::__construct();

		$this->bIsLoggined = false;
		$this->iRequestTime = 0;
		$this->aCapa = array();
		$this->aModules = array();

		$this->__USE_INITIAL_AUTH_PLAIN_COMMAND = true;
	}

	public static function NewInstance() : self
	{
		return new self();
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
		bool $bVerifySsl = false, bool $bAllowSelfSigned = true,
		string $sClientCert = '') : object
	{
		$this->iRequestTime = \microtime(true);

		parent::Connect($sServerName, $iPort, $iSecurityType, $bVerifySsl, $bAllowSelfSigned);

		$mResponse = $this->parseResponse();
		$this->validateResponse($mResponse);
		$this->parseStartupResponse($mResponse);

		if (\MailSo\Net\Enumerations\ConnectionSecurityType::UseStartTLS(
			$this->IsSupported('STARTTLS'), $this->iSecurityType))
		{
			$this->sendRequestWithCheck('STARTTLS');
			$this->EnableCrypto();

			$mResponse = $this->parseResponse();
			$this->validateResponse($mResponse);
			$this->parseStartupResponse($mResponse);
		}
		else if (\MailSo\Net\Enumerations\ConnectionSecurityType::STARTTLS === $this->iSecurityType)
		{
			$this->writeLogException(
				new \MailSo\Net\Exceptions\SocketUnsuppoterdSecureConnectionException('STARTTLS is not supported'),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		return $this;
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Sieve\Exceptions\LoginException
	 */
	public function Login(string $sLogin, string $sPassword, string $sLoginAuthKey = '') : self
	{
		if (!\MailSo\Base\Validator::NotEmptyString($sLogin, true) ||
			!\MailSo\Base\Validator::NotEmptyString($sPassword, true))
		{
			$this->writeLogException(
				new \MailSo\Base\Exceptions\InvalidArgumentException(),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		if ($this->IsSupported('SASL'))
		{
			$bAuth = false;
			try
			{
				if ($this->IsAuthSupported('PLAIN'))
				{
					$sAuth = \base64_encode($sLoginAuthKey."\0".$sLogin."\0".$sPassword);

					if ($this->__USE_INITIAL_AUTH_PLAIN_COMMAND)
					{
						$this->sendRequest('AUTHENTICATE "PLAIN" "'.$sAuth.'"');
					}
					else
					{
						$this->sendRequest('AUTHENTICATE "PLAIN" {'.\strlen($sAuth).'+}');
						$this->sendRequest($sAuth);
					}

					$mResponse = $this->parseResponse();
					$this->validateResponse($mResponse);
					$this->parseStartupResponse($mResponse);
					$bAuth = true;
				}
				else if ($this->IsAuthSupported('LOGIN'))
				{
					$sLogin = \base64_encode($sLogin);
					$sPassword = \base64_encode($sPassword);

					$this->sendRequest('AUTHENTICATE "LOGIN"');
					$this->sendRequest('{'.\strlen($sLogin).'+}');
					$this->sendRequest($sLogin);
					$this->sendRequest('{'.\strlen($sPassword).'+}');
					$this->sendRequest($sPassword);

					$mResponse = $this->parseResponse();
					$this->validateResponse($mResponse);
					$this->parseStartupResponse($mResponse);
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
					new \MailSo\Sieve\Exceptions\LoginBadMethodException(),
					\MailSo\Log\Enumerations\Type::ERROR, true);
			}
		}
		else
		{
			$this->writeLogException(
				new \MailSo\Sieve\Exceptions\LoginException(),
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
		$mResponse = $this->parseResponse();
		$this->validateResponse($mResponse);

		$aResult = array();
		if (\is_array($mResponse))
		{
			foreach ($mResponse as $sLine)
			{
				$aTokens = $this->parseLine($sLine);
				if (false === $aTokens)
				{
					continue;
				}

				$aResult[$aTokens[0]] = 'ACTIVE' === substr($sLine, -6);
			}
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
		$mResponse = $this->parseResponse();
		$this->validateResponse($mResponse);
		$this->parseStartupResponse($mResponse);

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
		$mResponse = $this->parseResponse();
		$this->validateResponse($mResponse);

		$sScript = '';
		if (\is_array($mResponse) && 0 < \count($mResponse))
		{
			if ('{' === $mResponse[0]{0})
			{
				\array_shift($mResponse);
			}

			if (\in_array(\substr($mResponse[\count($mResponse) - 1], 0, 2), array('OK', 'NO')))
			{
				\array_pop($mResponse);
			}

			$sScript = \implode("\n", $mResponse);
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
	public function GetActiveScriptName() : string
	{
		$aList = $this->ListScripts();
		if (\is_array($aList) && 0 < \count($aList))
		{
			foreach ($aList as $sName => $bIsActive)
			{
				if ($bIsActive)
				{
					return $sName;
				}
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

	private function parseLine(string $sLine) : array
	{
		if (false === $sLine || null === $sLine || \in_array(\substr($sLine, 0, 2), array('OK', 'NO')))
		{
			return false;
		}

		$iStart = -1;
		$iIndex = 0;
		$aResult = false;

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
					$aResult = \is_array($aResult) ? $aResult : array();
					$aResult[$iIndex++] = \substr($sLine, $iStart + 1, $iPos - $iStart - 1);
					$iStart = -1;
				}
			}
		}

		return \is_array($aResult) && isset($aResult[0]) ? $aResult : false;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 */
	private function parseStartupResponse($mResponse) : void
	{
		foreach ($mResponse as $sLine)
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
		if (!\MailSo\Base\Validator::NotEmptyString($sRequest, true))
		{
			$this->writeLogException(
				new \MailSo\Base\Exceptions\InvalidArgumentException(),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		$this->IsConnected(true);

		$this->sendRaw($sRequest);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
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
		if (!\is_array($aResponse) || 0 === \count($aResponse) ||
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
