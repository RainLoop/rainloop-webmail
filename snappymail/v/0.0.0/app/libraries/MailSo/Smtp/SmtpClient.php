<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * https://datatracker.ietf.org/doc/html/rfc2034
 * https://datatracker.ietf.org/doc/html/rfc2821
 */

namespace MailSo\Smtp;

use MailSo\Net\Enumerations\ConnectionSecurityType;
use SnappyMail\IDN;

/**
 * @category MailSo
 * @package Smtp
 */
class SmtpClient extends \MailSo\Net\NetClient
{
	private bool $bIsLoggined = false;

	private string $sEhlo = '';

	private bool $bRcpt = false;

	private bool $bMail = false;

	private array $aAuthTypes = array();

	private array $aCapa = array();

	/**
	 * RFC 1870
	 */
	private int $iSizeCapaValue = 0;

	private array $aResults = array();

	public function Capability() : array
	{
		return $this->aCapa;
	}

	public function hasCapability(string $sCapa) : bool
	{
		return \in_array(\strtoupper($sCapa), $this->aCapa);
	}

	public function maxSize() : int
	{
		return $this->iSizeCapaValue;
	}

	public static function EhloHelper() : string
	{
		$sEhloHost = empty($_SERVER['SERVER_NAME']) ? '' : \trim($_SERVER['SERVER_NAME']);
		if (empty($sEhloHost)) {
			$sEhloHost = empty($_SERVER['HTTP_HOST']) ? '' : \trim($_SERVER['HTTP_HOST']);
		}

		if (empty($sEhloHost)) {
			$sEhloHost = \function_exists('gethostname') ? \gethostname() : 'localhost';
		}

		$sEhloHost = \trim(\preg_replace('/:\d+$/', '', \trim($sEhloHost)));

		if (\preg_match('/^\d+\.\d+\.\d+\.\d+$/', $sEhloHost)) {
			$sEhloHost = '['.$sEhloHost.']';
		}

		return empty($sEhloHost) ? 'localhost' : $sEhloHost;
	}

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Smtp\Exceptions\*
	 */
	public function Connect(\MailSo\Net\ConnectSettings $oSettings) : void
	{
		parent::Connect($oSettings);

		$this->validateResponse(220);

		$this->ehloOrHelo($oSettings->Ehlo);
		$this->sEhlo = $oSettings->Ehlo;

		if (ConnectionSecurityType::STARTTLS === $this->Settings->type
		 || (ConnectionSecurityType::AUTO_DETECT === $this->Settings->type && $this->hasCapability('STARTTLS'))) {
			$this->StartTLS();
		}
	}

	private function StartTLS() : void
	{
		if ($this->hasCapability('STARTTLS')) {
			$this->sendRequestWithCheck('STARTTLS', 220);
			$this->EnableCrypto();
			$this->ehloOrHelo($this->sEhlo);
		} else {
			$this->writeLogException(
				new \MailSo\Net\Exceptions\SocketUnsuppoterdSecureConnectionException('STARTTLS is not supported'),
				\LOG_ERR);
		}
	}

	public function supportsAuthType(string $sasl_type) : bool
	{
		return \in_array(\strtoupper($sasl_type), $this->aAuthTypes);
	}

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Smtp\Exceptions\*
	 */
	public function Login(Settings $oSettings) : self
	{
		if ($this->bIsLoggined) {
			return $this;
		}

		$sLogin = $oSettings->username;
		$sPassword = $oSettings->passphrase;

		$type = '';
		foreach ($oSettings->SASLMechanisms as $sasl_type) {
			if (\in_array(\strtoupper($sasl_type), $this->aAuthTypes) && \SnappyMail\SASL::isSupported($sasl_type)) {
				$type = $sasl_type;
				break;
			}
		}
		if (!$type) {
			if (!$this->Encrypted() && $this->hasCapability('STARTTLS')) {
				$this->StartTLS();
				return $this->Login($oSettings);
			}
			\trigger_error("SMTP {$this->GetConnectedHost()} no supported AUTH options. Disable login");
			$this->writeLogException(new \MailSo\Smtp\Exceptions\LoginBadMethodException);
		}

		$SASL = \SnappyMail\SASL::factory($type);

		if ($this->Settings->authPlainLine && $SASL instanceof \SnappyMail\SASL\Plain) {
			// https://github.com/the-djmaze/snappymail/issues/1038
			try
			{
				$sRequest = $SASL->authenticate($sLogin, $sPassword);
				$this->logMask($sRequest);
				$sResult = $this->sendRequestWithCheck('AUTH PLAIN ' . $sRequest, 235);
			}
			catch (\MailSo\Smtp\Exceptions\NegativeResponseException $oException)
			{
				$this->writeLogException(
					new \MailSo\Smtp\Exceptions\LoginBadCredentialsException($oException->GetResponses(), $oException->getMessage(), 0, $oException)
				);
			}
		} else {
			// Start authentication
			try
			{
				$sResult = $this->sendRequestWithCheck("AUTH {$type}", 334);
			}
			catch (\MailSo\Smtp\Exceptions\NegativeResponseException $oException)
			{
				$this->writeLogException(
					new \MailSo\Smtp\Exceptions\LoginBadMethodException($oException->GetResponses(), $oException->getMessage(), 0, $oException)
				);
			}

			try
			{
				$sRequest = '';
				if (\str_starts_with($type, 'SCRAM-')) {
					// RFC 5802
					$sRequest = $SASL->authenticate($sLogin, $sPassword, $sResult);
					$this->logMask($sRequest);
					$sResult = $this->sendRequestWithCheck($sRequest, 234);
					$sRequest = $SASL->challenge($sResult);
				} else switch ($type) {
				// RFC 4616
				case 'PLAIN':
				case 'XOAUTH2':
				case 'OAUTHBEARER':
					$sRequest = $SASL->authenticate($sLogin, $sPassword);
					break;

				case 'LOGIN':
					$sRequest = $SASL->authenticate($sLogin, $sPassword, $sResult);
					$this->logMask($sRequest);
					$sResult = $this->sendRequestWithCheck($sRequest, 334);
					$sRequest = $SASL->challenge($sResult);
					break;

				// RFC 2195
				case 'CRAM-MD5':
					$sRequest = $SASL->authenticate($sLogin, $sPassword, $sResult);
					break;
				}
				if ($sRequest) {
					$this->logMask($sRequest);
					$SASL->verify($this->sendRequestWithCheck($sRequest, 235));
				}
			}
			catch (\MailSo\Smtp\Exceptions\NegativeResponseException $oException)
			{
				$this->writeLogException(
					new \MailSo\Smtp\Exceptions\LoginBadCredentialsException($oException->GetResponses(), $oException->getMessage(), 0, $oException)
				);
			}
		}

		$this->bIsLoggined = true;

		return $this;
	}

	/**
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Smtp\Exceptions\*
	 */
	public function MailFrom(string $sFrom, int $iSizeIfSupported = 0, bool $bDsn = false, bool $bRequireTLS = false) : self
	{
//		$sFrom = IDN::emailToAscii($sFrom);
		$sCmd = "FROM:<{$sFrom}>";
		// RFC 6531
		if ($this->hasCapability('SMTPUTF8')) {
//			$sFrom = IDN::emailToUtf8($sFrom);
//			$sCmd = "FROM:<{$sFrom}> SMTPUTF8";
		}

		if (0 < $iSizeIfSupported && $this->hasCapability('SIZE')) {
			$sCmd .= ' SIZE='.$iSizeIfSupported;
		}

		// RFC 3461
		if ($bDsn && $this->hasCapability('DSN')) {
			$sCmd .= ' RET=HDRS';
		}

		// RFC 6152
		if ($this->hasCapability('8BITMIME')) {
//			$sCmd .= ' BODY=8BITMIME';
		}
		// RFC 3030
		else if ($this->hasCapability('BINARYMIME')) {
//			$sCmd .= ' BODY=BINARYMIME';
		}

		// RFC 8689
		if ($bRequireTLS && $this->hasCapability('REQUIRETLS')) {
			$sCmd .= ' REQUIRETLS';
		}

		$this->sendRequestWithCheck("MAIL {$sCmd}", 250);

		$this->bMail = true;
		$this->bRcpt = false;

		return $this;
	}

	/**
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Smtp\Exceptions\*
	 */
	public function Rcpt(string $sTo, bool $bDsn = false) : self
	{
		if (!$this->bMail) {
			$this->writeLogException(new \MailSo\RuntimeException('No sender reverse path has been supplied'), \LOG_ERR);
		}

//		$sTo = IDN::emailToAscii($sTo);

		$sCmd = 'TO:<'.$sTo.'>';

		if ($bDsn && $this->hasCapability('DSN')) {
			$sCmd .= ' NOTIFY=SUCCESS,FAILURE';
		}

		$this->sendRequestWithCheck("RCPT {$sCmd}", [250, 251], "Failed to add recipient '{$sTo}'");

		$this->bRcpt = true;

		return $this;
	}

	/**
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Smtp\Exceptions\*
	 */
	public function MailTo(string $sTo) : self
	{
		return $this->Rcpt($sTo);
	}

	/**
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Smtp\Exceptions\*
	 */
	public function Data(string $sData) : self
	{
		if (!\strlen(\trim($sData))) {
			throw new \InvalidArgumentException;
		}

		$rDataStream = \MailSo\Base\ResourceRegistry::CreateMemoryResourceFromString($sData);
		unset($sData);
		$this->DataWithStream($rDataStream);
		\MailSo\Base\ResourceRegistry::CloseMemoryResource($rDataStream);

		return $this;
	}

	/**
	 * @param resource $rDataStream
	 *
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Smtp\Exceptions\*
	 */
	public function DataWithStream($rDataStream) : self
	{
		if (!\is_resource($rDataStream)) {
			throw new \InvalidArgumentException;
		}

		if (!$this->bRcpt) {
			$this->writeLogException(new \MailSo\RuntimeException('No recipient forward path has been supplied'), \LOG_ERR);
		}

/*
		// RFC 3030
		if ($this->hasCapability('CHUNKING')) {
			$this->bRunningCallback = true;
			while (!\feof($rDataStream)) {
				$sBuffer = \fgets($rDataStream);
				if (false === $sBuffer) {
					if (!\feof($rDataStream)) {
						$this->writeLogException(new \MailSo\RuntimeException('Cannot read input resource'), \LOG_ERR);
					}
					break;
				}
				$this->sendRequestWithCheck("BDAT " . \strlen($sBuffer) . "\r\n{$sBuffer}", 250);
				\MailSo\Base\Utils::ResetTimeLimit();
			}
			$this->sendRequestWithCheck("BDAT 0 LAST\r\n", 250);
		}
		else {
*/
		$this->sendRequestWithCheck('DATA', 354);

		$this->writeLog('Message data.');

		$this->bRunningCallback = true;

		while (!\feof($rDataStream)) {
			$sBuffer = \fgets($rDataStream);
			if (false === $sBuffer) {
				if (!\feof($rDataStream)) {
					$this->writeLogException(new \MailSo\RuntimeException('Cannot read input resource'), \LOG_ERR);
				}
				break;
			}
			if (\str_starts_with($sBuffer, '.')) {
				$sBuffer = '.' . $sBuffer;
			}
			$this->sendRaw(\rtrim($sBuffer, "\r\n"), false);
			\MailSo\Base\Utils::ResetTimeLimit();
		}

		$this->sendRequestWithCheck('.', 250);

		$this->bRunningCallback = false;

		return $this;
	}

	/**
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Smtp\Exceptions\*
	 */
	public function Rset() : self
	{
		$this->sendRequestWithCheck('RSET', [250, 220]);

		$this->bMail = false;
		$this->bRcpt = false;

		return $this;
	}

	/**
	 * VERIFY
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Smtp\Exceptions\*
	 */
	public function Vrfy(string $sUser) : self
	{
		$sUser = \MailSo\Base\Utils::Trim($sUser);
/*
		// RFC 6531
		if ($this->hasCapability('SMTPUTF8')) {
			$this->sendRequestWithCheck('VRFY ' . IDN::emailToUtf8($sUser) . ' SMTPUTF8', [250, 251, 252]);
		} else {
*/
		$this->sendRequestWithCheck('VRFY ' . IDN::emailToAscii($sUser), [250, 251, 252]);
		return $this;
	}

	/**
	 * EXPAND command, the string identifies a mailing list, and the
	 * successful (i.e., 250) multiline response MAY include the full name
	 * of the users and MUST give the mailboxes on the mailing list.
	 *
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Smtp\Exceptions\*
	 */
/*
	public function Expn(string $sUser) : self
	{
		$sUser = \MailSo\Base\Utils::Trim($sUser);
		// RFC 6531
		if ($this->hasCapability('SMTPUTF8')) {
			$this->sendRequestWithCheck('EXPN ' . IDN::emailToUtf8($sUser) . ' SMTPUTF8', [250, 251, 252]);
		} else {
			$this->sendRequestWithCheck('EXPN ' . IDN::emailToAscii($sUser), [250, 251, 252]);
		}
		return $this;
	}
*/

	/**
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Smtp\Exceptions\*
	 */
	public function Noop() : self
	{
		$this->sendRequestWithCheck('NOOP', 250);
		return $this;
	}

	/**
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Smtp\Exceptions\*
	 */
	public function Logout() : void
	{
		if ($this->IsConnected()) {
			$this->sendRequestWithCheck('QUIT', 221);
		}
		$this->bMail = false;
		$this->bRcpt = false;
	}

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Smtp\Exceptions\*
	 */
	private function sendRequestWithCheck(string $sCommand, $mExpectCode, string $sErrorPrefix = '') : string
	{
		if (!\strlen(\trim($sCommand))) {
			$this->writeLogException(new \InvalidArgumentException, \LOG_ERR);
		}
		$this->IsConnected(true);
		$this->sendRaw($sCommand, true, '');
		$this->validateResponse($mExpectCode, $sErrorPrefix);
		return empty($this->aResults[0]) ? '' : \trim(\substr($this->aResults[0], 4));
	}

	private function ehloOrHelo(string $sHost) : void
	{
		try
		{
			$this->ehlo($sHost);
		}
		catch (\Throwable $oException)
		{
			try
			{
				$this->helo($sHost);
			}
			catch (\Throwable $oException)
			{
				throw $oException;
			}
		}
	}

	/**
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Smtp\Exceptions\*
	 */
	private function ehlo(string $sHost) : void
	{
		$this->sendRequestWithCheck("EHLO {$sHost}", 250);
		/*
		250-PIPELINING\r\n
		250-SIZE 256000000\r\n
		250-ETRN\r\n
		250-ENHANCEDSTATUSCODES\r\n
		*/
		$this->aCapa = [];
		foreach ($this->aResults as $sLine) {
			$aMatch = array();
			if (\preg_match('/[\d]+[ \-](.+)$/', $sLine, $aMatch) && isset($aMatch[1]) && \strlen($aMatch[1])) {
				$aLine = \preg_split('/[ =]/', \trim($aMatch[1]), 2);
				if (!empty($aLine[0])) {
					$sCapa = \strtoupper($aLine[0]);
					if (!empty($aLine[1]) && ('AUTH' === $sCapa || 'SIZE' === $sCapa)) {
						$sSubLine = \trim(\strtoupper($aLine[1]));
						if (\strlen($sSubLine)) {
							if ('AUTH' === $sCapa) {
								$this->aAuthTypes = \explode(' ', $sSubLine);
							} else if ('SIZE' === $sCapa && \is_numeric($sSubLine)) {
								$this->iSizeCapaValue = (int) $sSubLine;
							}
						}
					}
					$this->aCapa[] = $sCapa;
				}
			}
		}
	}

	/**
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Smtp\Exceptions\*
	 */
	private function helo(string $sHost) : void
	{
		$this->sendRequestWithCheck("HELO {$sHost}", 250);
		$this->aAuthTypes = array();
		$this->iSizeCapaValue = 0;
		$this->aCapa = [];
	}

	/**
	 * @throws \MailSo\Smtp\Exceptions\ResponseException
	 */
	private function validateResponse($mExpectCode, string $sErrorPrefix = '') : void
	{
		$mExpectCode = \is_array($mExpectCode)
			? \array_map('intval', $mExpectCode)
			: array((int) $mExpectCode);

		$aParts = array('', '', '');
		$this->aResults = array();
		do
		{
			$sResponse = $this->getNextBuffer();
			$aParts = \preg_split('/([\s\-]+)/', $sResponse, 2, PREG_SPLIT_DELIM_CAPTURE);

			if (3 === \count($aParts) && \is_numeric($aParts[0])) {
				if ('-' !== \substr($aParts[1], 0, 1) && !\in_array((int) $aParts[0], $mExpectCode)) {
					$this->writeLogException(
						new Exceptions\NegativeResponseException($this->aResults,
							('' === $sErrorPrefix ? '' : $sErrorPrefix.': ').\trim(
							(\count($this->aResults) ? \implode("\r\n", $this->aResults)."\r\n" : '').
							$sResponse)), \LOG_ERR);
				}
			} else {
				$this->writeLogException(
					new Exceptions\ResponseException($this->aResults,
						('' === $sErrorPrefix ? '' : $sErrorPrefix.': ').\trim(
						(\count($this->aResults) ? \implode("\r\n", $this->aResults)."\r\n" : '').
						$sResponse)), \LOG_ERR);
			}

			$this->aResults[] = $sResponse;
		}
		while ('-' === \substr($aParts[1], 0, 1));
	}

	public function getLogName() : string
	{
		return 'SMTP';
	}

}
