<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Net;

/**
 * @category MailSo
 * @package Net
 */
abstract class NetClient
{
	use \MailSo\Log\Inherit;

	/**
	 * @var resource
	 */
	private $rConnect = null;

	private bool $bUnreadBuffer = false;

	protected bool $bRunningCallback = false;

	private string $sConnectedHost = '';

	private bool $ssl = false;

	private int $iConnectTimeOut = 10;

	private float $iStartConnectTime = 0;

	public ConnectSettings $Settings;

	public function __destruct()
	{
		try
		{
			$this->Disconnect();
		}
		catch (\Throwable $oException) {}
	}

	public function GetConnectedHost() : string
	{
		return $this->sConnectedHost;
	}

	public function SetTimeOuts(int $iConnectTimeOut = 10) : void
	{
		$this->iConnectTimeOut = \max(5, $iConnectTimeOut);
	}

	/**
	 * @return resource|null
	 */
	public function ConnectionResource()
	{
		return $this->rConnect;
	}

	public function capturePhpErrorWithException(int $iErrNo, string $sErrStr, string $sErrFile, int $iErrLine) : bool
	{
		throw new \MailSo\RuntimeException($sErrStr, $iErrNo);
	}

	/**
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\SocketAlreadyConnectedException
	 * @throws \MailSo\Net\Exceptions\SocketCanNotConnectToHostException
	 */
	public function Connect(ConnectSettings $oSettings) : void
	{
		$oSettings->host = \trim($oSettings->host);
		if (!\strlen($oSettings->host) || 0 > $oSettings->port || 65535 < $oSettings->port) {
			$this->writeLogException(new \MailSo\Base\Exceptions\InvalidArgumentException, \LOG_ERR);
		}

		if ($this->IsConnected()) {
			$this->writeLogException(new Exceptions\SocketAlreadyConnectedException, \LOG_ERR, false);
//			$this->Disconnect();
			return;
		}

		$this->Settings = $oSettings;

		$sErrorStr = '';
		$iErrorNo = 0;

		$this->sConnectedHost = $oSettings->host;

		$this->ssl = \MailSo\Net\Enumerations\ConnectionSecurityType::UseSSL($this->Settings->port, $this->Settings->type);

		if (!\preg_match('/^[a-z0-9._]{2,8}:\/\//i', $this->sConnectedHost)) {
			$this->sConnectedHost = ($this->ssl ? 'ssl://' : 'tcp://') . $this->sConnectedHost;
//			$this->sConnectedHost = ($this->ssl ? 'ssl://' : '') . $this->sConnectedHost;
		}

		if (!$this->ssl && \MailSo\Net\Enumerations\ConnectionSecurityType::SSL === $this->Settings->type) {
			$this->writeLogException(
				new \MailSo\Net\Exceptions\SocketUnsuppoterdSecureConnectionException('SSL isn\'t supported: ('.\implode(', ', \stream_get_transports()).')'),
				\LOG_ERR);
		}

		$this->iStartConnectTime = \microtime(true);
		$this->writeLog('Start connection to "'.$this->sConnectedHost.':'.$this->Settings->port.'"');

		$rStreamContext = \stream_context_create(array(
			'ssl' => $oSettings->ssl->jsonSerialize()
		));

		\set_error_handler(array($this, 'capturePhpErrorWithException'));

		try
		{
			$this->rConnect = \stream_socket_client($this->sConnectedHost.':'.$this->Settings->port,
				$iErrorNo, $sErrorStr, $this->iConnectTimeOut, STREAM_CLIENT_CONNECT, $rStreamContext);
		}
		catch (\Throwable $oExc)
		{
			$sErrorStr = $oExc->getMessage();
			$iErrorNo = $oExc->getCode();
		}

		\restore_error_handler();

		$this->writeLog('Connect ('.($this->rConnect ? 'success' : 'failed').')');

		if (!$this->rConnect) {
			$this->writeLogException(
				new Exceptions\SocketCanNotConnectToHostException(
					\MailSo\Base\Locale::ConvertSystemString($sErrorStr), (int) $iErrorNo,
					'Can\'t connect to host "'.$this->sConnectedHost.':'.$this->Settings->port.'"'
				)
			);
		}

		$this->writeLog((\microtime(true) - $this->iStartConnectTime).' (raw connection)', \LOG_DEBUG);

		if ($this->rConnect && \MailSo\Base\Utils::FunctionCallable('stream_set_timeout')) {
			\stream_set_timeout($this->rConnect, \max(5, $oSettings->timeout));
		}
	}

	public function Encrypted() : bool
	{
		return $this->rConnect && !empty(\stream_get_meta_data($this->rConnect)['crypto']);
	}

	public function EnableCrypto() : void
	{
		$bSuccess = false;
		if ($this->rConnect && \MailSo\Base\Utils::FunctionCallable('stream_socket_enable_crypto')) {
			$crypto_method = STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT;
			if (\defined('STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT') && OPENSSL_VERSION_NUMBER >= 0x10101000) {
				$crypto_method |= STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT;
			}
//			if ($this->Settings->tls_weak) {
//				$crypto_method |= STREAM_CRYPTO_METHOD_TLSv1_0_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_1_CLIENT;
//			}
			$bSuccess = \stream_socket_enable_crypto($this->rConnect, true, $crypto_method);
		}

		$bSuccess || $this->writeLogException(new \MailSo\RuntimeException('Cannot enable STARTTLS.'), \LOG_ERR);
	}

	/**
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 */
	public function Disconnect() : void
	{
		if ($this->rConnect) {
			if (!$this->bUnreadBuffer && !$this->bRunningCallback) {
				$this->Logout();
			}

			$bResult = \fclose($this->rConnect);

			$this->writeLog('Disconnected from "'.$this->sConnectedHost.':'.$this->Settings->port.'" ('.
				(($bResult) ? 'success' : 'unsuccess').')');

			if ($this->iStartConnectTime) {
				$this->writeLog((\microtime(true) - $this->iStartConnectTime).' (net session)', \LOG_DEBUG);
				$this->iStartConnectTime = 0;
			}
			$this->rConnect = null;
		}
	}

	abstract public function supportsAuthType(string $sasl_type) : bool;
//	abstract public function Login(ConnectSettings $oSettings) : self;
	abstract public function Logout() : void;

	public function IsConnected(bool $bThrowExceptionOnFalse = false) : bool
	{
		if ($this->rConnect) {
			return true;
		}
		if ($bThrowExceptionOnFalse) {
			$this->writeLogException(new Exceptions\SocketConnectionDoesNotAvailableException, \LOG_ERR);
		}
		return false;
	}

	public function StreamContextParams() : array
	{
		return $this->rConnect && \MailSo\Base\Utils::FunctionCallable('stream_context_get_options')
			? \stream_context_get_params($this->rConnect) : false;
	}

	/**
	 * @throws \MailSo\Net\Exceptions\SocketConnectionDoesNotAvailableException
	 * @throws \MailSo\Net\Exceptions\SocketWriteException
	 */
	protected function sendRaw(string $sRaw, bool $bWriteToLog = true, string $sFakeRaw = '') : void
	{
		if ($this->bUnreadBuffer) {
			$this->writeLogException(new Exceptions\SocketUnreadBufferException, \LOG_ERR);
		}

		$sRaw .= "\r\n";

		$bFake = \strlen($sFakeRaw) && $this->oLogger && !$this->oLogger->ShowSecrets();
		if ($bFake) {
			$sFakeRaw .= "\r\n";
		}

		$mResult = \fwrite($this->rConnect, $sRaw);
		if (false === $mResult) {
			$this->IsConnected(true);
			$this->writeLogException(new Exceptions\SocketWriteException, \LOG_ERR);
		} else if ($bWriteToLog) {
			$this->writeLogWithCrlf('> '.($bFake ? $sFakeRaw : $sRaw));
		}
	}

	/**
	 * @throws \MailSo\Net\Exceptions\SocketConnectionDoesNotAvailableException
	 * @throws \MailSo\Net\Exceptions\SocketReadException
	 */
	protected function getNextBuffer(?int $iReadLen = null) : ?string
	{
		if (null === $iReadLen) {
			$sResponseBuffer = \fgets($this->rConnect);
		} else {
			$sResponseBuffer = '';
			$iRead = $iReadLen;
			while (0 < $iRead) {
				$sAddRead = \fread($this->rConnect, $iRead);
				if (false === $sAddRead) {
					$sResponseBuffer = false;
					break;
				}
				$sResponseBuffer .= $sAddRead;
				$iRead -= \strlen($sAddRead);
			}
		}

		if (false === $sResponseBuffer) {
			$this->IsConnected(true);
			$this->bUnreadBuffer = true;
			$aSocketStatus = \stream_get_meta_data($this->rConnect);
			if (isset($aSocketStatus['timed_out']) && $aSocketStatus['timed_out']) {
				$this->writeLogException(new Exceptions\SocketReadTimeoutException, \LOG_ERR);
			} else {
				$this->writeLog('Stream Meta: '.\print_r($aSocketStatus, true), \LOG_ERR);
				$this->writeLogException(new Exceptions\SocketReadException, \LOG_ERR);
			}
			return null;
		}

		$iReadBytes = \strlen($sResponseBuffer);
//		$iReadLen && $this->writeLog('Received '.$iReadBytes.'/'.$iReadLen.' bytes.');
		$iLimit = 5000; // 5KB
		if ($iLimit < $iReadBytes) {
			$this->writeLogWithCrlf('[cutted:'.$iReadBytes.'] < '.\substr($sResponseBuffer, 0, $iLimit).'...');
		} else {
			$this->writeLogWithCrlf('< '.$sResponseBuffer);
		}

		return $sResponseBuffer;
	}

	abstract function getLogName() : string;

	protected function writeLog(string $sDesc, int $iDescType = \LOG_INFO) : void
	{
		$this->logWrite($sDesc, $iDescType, $this->getLogName());
	}

	protected function writeLogWithCrlf(string $sDesc) : void
	{
		$this->logWrite($sDesc, \LOG_INFO, $this->getLogName(), true, true);
	}

	protected function writeLogException(\Throwable $oException, int $iDescType = \LOG_NOTICE, bool $bThrowException = true) : void
	{
		if ($oException instanceof Exceptions\SocketCanNotConnectToHostException) {
			$this->logWrite('Socket: ['.$oException->getSocketCode().'] '.$oException->getSocketMessage(), $iDescType, $this->getLogName());
		}
		$this->logException($oException, $iDescType, $this->getLogName());
		if ($bThrowException) {
			throw $oException;
		}
	}
}
