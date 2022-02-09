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
class TempFile
{
	/**
	 * @var string
	 */
	const STREAM_NAME = 'mailsotempfile';

	/**
	 * @var array
	 */
	private static $aStreams = array();

	/**
	 * @var resource
	 */
	private $rSream;

	/**
	 * @return resource|bool
	 */
	public static function CreateStream(string $sHash, string &$sFileName = '')
	{
		$sFileName = self::STREAM_NAME.'://'.$sHash;
		return fopen($sFileName, 'r+b');
	}

	public function stream_open(string $sPath) : bool
	{
		$bResult = false;
		$aPath = \parse_url($sPath);

		if (isset($aPath['host']) && isset($aPath['scheme']) &&
			\strlen($aPath['host']) && \strlen($aPath['scheme']) &&
			self::STREAM_NAME === $aPath['scheme'])
		{
			$sHashName = $aPath['host'];
			if (isset(self::$aStreams[$sHashName]) &&
				\is_resource(self::$aStreams[$sHashName]))
			{
				$this->rSream = self::$aStreams[$sHashName];
				\fseek($this->rSream, 0);
				$bResult = true;
			}
			else
			{
				$this->rSream = \fopen('php://memory', 'r+b');
				self::$aStreams[$sHashName] = $this->rSream;

				$bResult = true;
			}
		}

		return $bResult;
	}

	public function stream_close() : bool
	{
		return true;
	}

	public function stream_flush() : bool
	{
		return \fflush($this->rSream);
	}

	public function stream_read(int $iLen) : string
	{
		return \fread($this->rSream, $iLen);
	}

	public function stream_write(string $sInputString) : int
	{
		return \fwrite($this->rSream, $sInputString);
	}

	public function stream_tell() : int
	{
		return \ftell($this->rSream);
	}

	public function stream_eof() : bool
	{
		return \feof($this->rSream);
	}

	public function stream_stat() : array
	{
		return \fstat($this->rSream);
	}

	public function stream_seek(int $iOffset, int $iWhence = SEEK_SET) : int
	{
		return \fseek($this->rSream, $iOffset, $iWhence);
	}
}

\stream_wrapper_register(TempFile::STREAM_NAME, '\\MailSo\\Base\\StreamWrappers\\TempFile');
