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
	 *
	 * @return resource|bool
	 */
	public static function CreateStream(string $sRawResponse)
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

		return fopen(self::STREAM_NAME.'://'.$sHashName, 'r+b');
	}

	public function stream_open(string $sPath) : bool
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

	public function stream_read(int $iCount) : string
	{
		return fread($this->rReadSream, $iCount);
	}

	public function stream_write(string $sInputString) : int
	{
		return strlen($sInputString);
	}

	public function stream_tell() : int
	{
		return ftell($this->rReadSream);
	}

	public function stream_eof() : bool
	{
		return feof($this->rReadSream);
	}

	public function stream_stat() : array
	{
		return fstat($this->rReadSream);
	}

	public function stream_seek() : bool
	{
		return false;
	}
}
