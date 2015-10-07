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
	/**
	 * @var resource
	 */
	protected $rConnect;

	/**
	 * @var bool
	 */
	protected $bUnreadBuffer;

	/**
	 * @var bool
	 */
	protected $bRunningCallback;

	/**
	 * @var string
	 */
	protected $sResponseBuffer;

	/**
	 * @var int
	 */
	protected $iSecurityType;

	/**
	 * @var string
	 */
	protected $sConnectedHost;

	/**
	 * @var int
	 */
	protected $iConnectedPort;

	/**
	 * @var bool
	 */
	protected $bSecure;

	/**
	 * @var int
	 */
	protected $iConnectTimeOut;

	/**
	 * @var int
	 */
	protected $iSocketTimeOut;

	/**
	 * @var int
	 */
	protected $iStartConnectTime;

	/**
	 * @var \MailSo\Log\Logger
	 */
	protected $oLogger;

	/**
	 * @var bool
	 */
	public $__AUTOLOGOUT__;

	/**
	 * @access protected
	 */
	protected function __construct()
	{
		$this->rConnect = null;
		$this->bUnreadBuffer = false;
		$this->bRunningCallback = false;
		$this->oLogger = null;

		$this->__AUTOLOGOUT__ = true;

		$this->sResponseBuffer = '';

		$this->iSecurityType = \MailSo\Net\Enumerations\ConnectionSecurityType::NONE;
		$this->sConnectedHost = '';
		$this->iConnectedPort = 0;

		$this->bSecure = false;

		$this->iConnectTimeOut = 10;
		$this->iSocketTimeOut = 10;

		$this->Clear();
	}

	/**
	 * @return void
	 */
	public function __destruct()
	{
		try
		{
			if ($this->__AUTOLOGOUT__)
			{
				$this->LogoutAndDisconnect();
			}
			else
			{
				$this->Disconnect();
			}
		}
		catch (\Exception $oException) {}
	}

	/**
	 * @return void
	 */
	public function Clear()
	{
		$this->sResponseBuffer = '';

		$this->sConnectedHost = '';
		$this->iConnectedPort = 0;

		$this->iStartConnectTime = 0;
		$this->bSecure = false;
	}

	/**
	 * @return string
	 */
	public function GetConnectedHost()
	{
		return $this->sConnectedHost;
	}

	/**
	 * @return int
	 */
	public function GetConnectedPort()
	{
		return $this->iConnectedPort;
	}

	/**
	 * @param int $iConnectTimeOut = 10
	 * @param int $iSocketTimeOut = 10
	 *
	 * @return void
	 */
	public function SetTimeOuts($iConnectTimeOut = 10, $iSocketTimeOut = 10)
	{
		$this->iConnectTimeOut = 5 < $iConnectTimeOut ? $iConnectTimeOut : 5;
		$this->iSocketTimeOut = 5 < $iSocketTimeOut ? $iSocketTimeOut : 5;
	}

	/**
	 * @return resource|null
	 */
	public function ConnectionResource()
	{
		return $this->rConnect;
	}

	/**
	 * @param int $iErrNo
	 * @param string $sErrStr
	 * @param string $sErrFile
	 * @param int $iErrLine
	 *
	 * @return bool
	 */
	public function capturePhpErrorWithException($iErrNo, $sErrStr, $sErrFile, $iErrLine)
	{
		throw new \MailSo\Base\Exceptions\Exception($sErrStr, $iErrNo);
	}

	/**
	 * @param string $sServerName
	 * @param int $iPort
	 * @param int $iSecurityType = \MailSo\Net\Enumerations\ConnectionSecurityType::AUTO_DETECT
	 * @param bool $bVerifySsl = false
	 * @param bool $bAllowSelfSigned = true
	 *
	 * @return void
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\SocketAlreadyConnectedException
	 * @throws \MailSo\Net\Exceptions\SocketCanNotConnectToHostException
	 */
	public function Connect($sServerName, $iPort,
		$iSecurityType = \MailSo\Net\Enumerations\ConnectionSecurityType::AUTO_DETECT,
		$bVerifySsl = false, $bAllowSelfSigned = true)
	{
		if (!\MailSo\Base\Validator::NotEmptyString($sServerName, true) || !\MailSo\Base\Validator::PortInt($iPort))
		{
			$this->writeLogException(
				new \MailSo\Base\Exceptions\InvalidArgumentException(),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		if ($this->IsConnected())
		{
			$this->writeLogException(
				new Exceptions\SocketAlreadyConnectedException(),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		$sServerName = \trim($sServerName);

		$sErrorStr = '';
		$iErrorNo = 0;

		$this->sConnectedHost = $sServerName;
		$this->iConnectedPort = $iPort;
		$this->iSecurityType = $iSecurityType;
		$this->bSecure = \MailSo\Net\Enumerations\ConnectionSecurityType::UseSSL(
			$this->iConnectedPort, $this->iSecurityType);

		if (!\preg_match('/^[a-z0-9._]{2,8}:\/\//i', $this->sConnectedHost))
		{
			$this->sConnectedHost = ($this->bSecure ? 'ssl://' : 'tcp://').$this->sConnectedHost;
//			$this->sConnectedHost = ($this->bSecure ? 'ssl://' : '').$this->sConnectedHost;
		}

		if (!$this->bSecure && \MailSo\Net\Enumerations\ConnectionSecurityType::SSL === $this->iSecurityType)
		{
			$this->writeLogException(
				new \MailSo\Net\Exceptions\SocketUnsuppoterdSecureConnectionException('SSL isn\'t supported: ('.\implode(', ', \stream_get_transports()).')'),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		$this->iStartConnectTime = \microtime(true);
		$this->writeLog('Start connection to "'.$this->sConnectedHost.':'.$this->iConnectedPort.'"',
			\MailSo\Log\Enumerations\Type::NOTE);

//		$this->rConnect = @\fsockopen($this->sConnectedHost, $this->iConnectedPort,
//			$iErrorNo, $sErrorStr, $this->iConnectTimeOut);

		$bVerifySsl = !!$bVerifySsl;
		$bAllowSelfSigned = $bVerifySsl ? !!$bAllowSelfSigned : true;

		$aStreamContextSettings = array(
			'ssl' => array(
				'verify_host' => $bVerifySsl,
				'verify_peer' => $bVerifySsl,
				'verify_peer_name' => $bVerifySsl,
				'allow_self_signed' => $bAllowSelfSigned
			)
		);

		\MailSo\Hooks::Run('Net.NetClient.StreamContextSettings/Filter', array(&$aStreamContextSettings));

		$rStreamContext = \stream_context_create($aStreamContextSettings);

		\set_error_handler(array(&$this, 'capturePhpErrorWithException'));

		try
		{
			$this->rConnect = \stream_socket_client($this->sConnectedHost.':'.$this->iConnectedPort,
				$iErrorNo, $sErrorStr, $this->iConnectTimeOut, STREAM_CLIENT_CONNECT, $rStreamContext);
		}
		catch (\Exception $oExc)
		{
			$sErrorStr = $oExc->getMessage();
			$iErrorNo = $oExc->getCode();
		}

		\restore_error_handler();

		$this->writeLog('Connected ('.(\is_resource($this->rConnect) ? 'success' : 'unsuccess').')',
			\MailSo\Log\Enumerations\Type::NOTE);

		if (!\is_resource($this->rConnect))
		{
			$this->writeLogException(
				new Exceptions\SocketCanNotConnectToHostException(
					\MailSo\Base\Utils::ConvertSystemString($sErrorStr), (int) $iErrorNo,
					'Can\'t connect to host "'.$this->sConnectedHost.':'.$this->iConnectedPort.'"'
				), \MailSo\Log\Enumerations\Type::NOTICE, true);
		}

		$this->writeLog((\microtime(true) - $this->iStartConnectTime).' (raw connection)',
			\MailSo\Log\Enumerations\Type::TIME);

		if ($this->rConnect)
		{
			if (\MailSo\Base\Utils::FunctionExistsAndEnabled('stream_set_timeout'))
			{
				@\stream_set_timeout($this->rConnect, $this->iSocketTimeOut);
			}
		}
	}

	public function EnableCrypto()
	{
		$bError = true;
		if (\is_resource($this->rConnect) &&
			\MailSo\Base\Utils::FunctionExistsAndEnabled('stream_socket_enable_crypto'))
		{
			switch (true)
			{
				case defined('STREAM_CRYPTO_METHOD_ANY_CLIENT') &&
					@\stream_socket_enable_crypto($this->rConnect, true, STREAM_CRYPTO_METHOD_ANY_CLIENT):
				case @\stream_socket_enable_crypto($this->rConnect, true, STREAM_CRYPTO_METHOD_TLS_CLIENT):
				case @\stream_socket_enable_crypto($this->rConnect, true, STREAM_CRYPTO_METHOD_SSLv23_CLIENT):
					$bError = false;
					break;
			}
		}

		if ($bError)
		{
			$this->writeLogException(
				new \MailSo\Net\Exceptions\Exception('Cannot enable STARTTLS.'),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}
	}

	/**
	 * @return void
	 */
	public function Disconnect()
	{
		if (\is_resource($this->rConnect))
		{
			$bResult = \fclose($this->rConnect);

			$this->writeLog('Disconnected from "'.$this->sConnectedHost.':'.$this->iConnectedPort.'" ('.
				(($bResult) ? 'success' : 'unsuccess').')', \MailSo\Log\Enumerations\Type::NOTE);

			if (0 !== $this->iStartConnectTime)
			{
				$this->writeLog((\microtime(true) - $this->iStartConnectTime).' (net session)',
					\MailSo\Log\Enumerations\Type::TIME);

				$this->iStartConnectTime = 0;
			}

			$this->rConnect = null;
		}
	}

	/**
	 * @retun void
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 */
	public function LogoutAndDisconnect()
	{
		if (\method_exists($this, 'Logout') && !$this->bUnreadBuffer && !$this->bRunningCallback)
		{
			$this->Logout();
		}

		$this->Disconnect();
	}

	/**
	 * @param bool $bThrowExceptionOnFalse = false
	 *
	 * @return bool
	 */
	public function IsConnected($bThrowExceptionOnFalse = false)
	{
		$bResult = \is_resource($this->rConnect);
		if (!$bResult && $bThrowExceptionOnFalse)
		{
			$this->writeLogException(
				new Exceptions\SocketConnectionDoesNotAvailableException(),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		return $bResult;
	}

	/**
	 * @return void
	 *
	 * @throws \MailSo\Net\Exceptions\SocketConnectionDoesNotAvailableException
	 */
	public function IsConnectedWithException()
	{
		$this->IsConnected(true);
	}

	/**
	 * @return array|bool
	 */
	public function StreamContextParams()
	{
		return \is_resource($this->rConnect) && \MailSo\Base\Utils::FunctionExistsAndEnabled('stream_context_get_options')
			? \stream_context_get_params($this->rConnect) : false;
	}

	/**
	 * @param string $sRaw
	 * @param bool $bWriteToLog = true
	 * @param string $sFakeRaw = ''
	 *
	 * @return void
	 *
	 * @throws \MailSo\Net\Exceptions\SocketConnectionDoesNotAvailableException
	 * @throws \MailSo\Net\Exceptions\SocketWriteException
	 */
	protected function sendRaw($sRaw, $bWriteToLog = true, $sFakeRaw = '')
	{
		if ($this->bUnreadBuffer)
		{
			$this->writeLogException(
				new Exceptions\SocketUnreadBufferException(),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		$bFake = 0 < \strlen($sFakeRaw);
		$sRaw .= "\r\n";

		if ($this->oLogger && $this->oLogger->IsShowSecter())
		{
			$bFake = false;
		}

		if ($bFake)
		{
			$sFakeRaw .= "\r\n";
		}

		$mResult = @\fwrite($this->rConnect, $sRaw);
		if (false === $mResult)
		{
			$this->IsConnected(true);

			$this->writeLogException(
				new Exceptions\SocketWriteException(),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}
		else
		{
			\MailSo\Base\Loader::IncStatistic('NetWrite', $mResult);

			if ($bWriteToLog)
			{
				$this->writeLogWithCrlf('> '.($bFake ? $sFakeRaw : $sRaw), //.' ['.$iWriteSize.']',
					$bFake ? \MailSo\Log\Enumerations\Type::SECURE : \MailSo\Log\Enumerations\Type::INFO);
			}
		}
	}

	/**
	 * @param mixed $mReadLen = null
	 * @param bool $bForceLogin = false
	 *
	 * @return void
	 *
	 * @throws \MailSo\Net\Exceptions\SocketConnectionDoesNotAvailableException
	 * @throws \MailSo\Net\Exceptions\SocketReadException
	 */
	protected function getNextBuffer($mReadLen = null, $bForceLogin = false)
	{
		if (null === $mReadLen)
		{
			$this->sResponseBuffer = @\fgets($this->rConnect);
		}
		else
		{
			$this->sResponseBuffer = '';
			$iRead = $mReadLen;
			while (0 < $iRead)
			{
				$sAddRead = @\fread($this->rConnect, $iRead);
				if (false === $sAddRead)
				{
					$this->sResponseBuffer = false;
					break;
				}

				$this->sResponseBuffer .= $sAddRead;
				$iRead -= \strlen($sAddRead);
			}
		}

		if (false === $this->sResponseBuffer)
		{
			$this->IsConnected(true);
			$this->bUnreadBuffer = true;

			$aSocketStatus = @\stream_get_meta_data($this->rConnect);
			if (isset($aSocketStatus['timed_out']) && $aSocketStatus['timed_out'])
			{
				$this->writeLogException(
					new Exceptions\SocketReadTimeoutException(),
						\MailSo\Log\Enumerations\Type::ERROR, true);
			}
			else
			{
				$this->writeLog('Stream Meta: '.
					\print_r($aSocketStatus, true), \MailSo\Log\Enumerations\Type::ERROR);

				$this->writeLogException(
					new Exceptions\SocketReadException(),
						\MailSo\Log\Enumerations\Type::ERROR, true);
			}
		}
		else
		{
			$iReadedLen = \strlen($this->sResponseBuffer);
			if (null === $mReadLen || $bForceLogin)
			{
				$iLimit = 5000; // 5KB
				if ($iLimit < $iReadedLen)
				{
					$this->writeLogWithCrlf('[cutted:'.$iReadedLen.'] < '.\substr($this->sResponseBuffer, 0, $iLimit).'...',
						\MailSo\Log\Enumerations\Type::INFO);
				}
				else
				{
					$this->writeLogWithCrlf('< '.$this->sResponseBuffer, //.' ['.$iReadedLen.']',
						\MailSo\Log\Enumerations\Type::INFO);
				}
			}
			else
			{
				$this->writeLog('Received '.$iReadedLen.'/'.$mReadLen.' bytes.',
					\MailSo\Log\Enumerations\Type::INFO);
			}

			\MailSo\Base\Loader::IncStatistic('NetRead', $iReadedLen);
		}
	}

	/**
	 * @return string
	 */
	protected function getLogName()
	{
		return 'NET';
	}

	/**
	 * @param string $sDesc
	 * @param int $iDescType = \MailSo\Log\Enumerations\Type::INFO
	 *
	 * @return void
	 */
	protected function writeLog($sDesc, $iDescType = \MailSo\Log\Enumerations\Type::INFO, $bDiplayCrLf = false)
	{
		if ($this->oLogger)
		{
			$this->oLogger->Write($sDesc, $iDescType, $this->getLogName(), true, $bDiplayCrLf);
		}
	}

	/**
	 * @param string $sDesc
	 * @param int $iDescType = \MailSo\Log\Enumerations\Type::INFO
	 *
	 * @return void
	 */
	protected function writeLogWithCrlf($sDesc, $iDescType = \MailSo\Log\Enumerations\Type::INFO)
	{
		$this->writeLog($sDesc, $iDescType, true);
	}

	/**
	 * @param \Exception $oException
	 * @param int $iDescType = \MailSo\Log\Enumerations\Type::NOTICE
	 * @param bool $bThrowException = false
	 *
	 * @return void
	 */
	protected function writeLogException($oException,
		$iDescType = \MailSo\Log\Enumerations\Type::NOTICE, $bThrowException = false)
	{
		if ($this->oLogger)
		{
			if ($oException instanceof Exceptions\SocketCanNotConnectToHostException)
			{
				$this->oLogger->Write('Socket: ['.$oException->getSocketCode().'] '.$oException->getSocketMessage(), $iDescType, $this->getLogName());
			}

			$this->oLogger->WriteException($oException, $iDescType, $this->getLogName());
		}

		if ($bThrowException)
		{
			throw $oException;
		}
	}

	/**
	 * @param \MailSo\Log\Logger $oLogger
	 *
	 * @return void
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	public function SetLogger($oLogger)
	{
		if (!($oLogger instanceof \MailSo\Log\Logger))
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException();
		}

		$this->oLogger = $oLogger;
	}

	/**
	 * @return \MailSo\Log\Logger|null
	 */
	public function Logger()
	{
		return $this->oLogger;
	}
}
