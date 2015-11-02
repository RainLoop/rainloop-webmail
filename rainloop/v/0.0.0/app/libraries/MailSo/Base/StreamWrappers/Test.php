<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Base\StreamWrappers;

/**
 * @category MailSo
 * @package Base
 * @subpackage StreamWrappers
 */
class Test
{
	/**
	 * @var string
	 */
	const STREAM_NAME = 'mailsotest';

	/**
	 * @var array
	 */
	private static $aStreams = array();

	/**
	 * @var resource
	 */
	private $rReadSream;

	/**
	 * @param string $sRawResponse
	 *
	 * @return resource|bool
	 */
	public static function CreateStream($sRawResponse)
	{
		if (!in_array(self::STREAM_NAME, stream_get_wrappers()))
		{
			stream_wrapper_register(self::STREAM_NAME, '\MailSo\Base\StreamWrappers\Test');
		}

		$sHashName = md5(microtime(true).rand(1000, 9999));

		$rConnect = fopen('php://memory', 'r+b');
		fwrite($rConnect, $sRawResponse);
		fseek($rConnect, 0);

		self::$aStreams[$sHashName] = $rConnect;

		\MailSo\Base\Loader::IncStatistic('CreateStream/Test');

		return fopen(self::STREAM_NAME.'://'.$sHashName, 'r+b');
	}

	/**
	 * @param string $sPath
	 *
	 * @return bool
	 */
	public function stream_open($sPath)
	{
		$bResult = false;
		$aPath = parse_url($sPath);

		if (isset($aPath['host']) && isset($aPath['scheme']) &&
			0 < strlen($aPath['host']) && 0 < strlen($aPath['scheme']) &&
			self::STREAM_NAME === $aPath['scheme'])
		{
			$sHashName = $aPath['host'];
			if (isset(self::$aStreams[$sHashName]) &&
				is_resource(self::$aStreams[$sHashName]))
			{
				$this->rReadSream = self::$aStreams[$sHashName];
				$bResult = true;
			}
		}

		return $bResult;
	}

	/**
	 * @param int $iCount
	 *
	 * @return string
	 */
	public function stream_read($iCount)
	{
		return fread($this->rReadSream, $iCount);
	}

	/**
	 * @param string $sInputString
	 *
	 * @return int
	 */
	public function stream_write($sInputString)
	{
		return strlen($sInputString);
	}

	/**
	 * @return int
	 */
	public function stream_tell()
	{
		return ftell($this->rReadSream);
	}

	/**
	 * @return bool
	 */
	public function stream_eof()
	{
		return feof($this->rReadSream);
	}

	/**
	 * @return array
	 */
	public function stream_stat()
	{
		return fstat($this->rReadSream);
	}

	/**
	 * @return bool
	 */
	public function stream_seek()
	{
		return false;
	}
}
