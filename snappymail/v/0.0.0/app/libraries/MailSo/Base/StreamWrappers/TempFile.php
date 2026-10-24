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
	/** @var resource|null */
	public $context;

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
	private $rStream;

	/**
	 * @return resource|bool
	 */
	public static function CreateStream(string $sHash, string &$sFileName = '')
	{
		return \fopen(self::STREAM_NAME.'://'.$sHash, 'r+b');
	}

	public function stream_cast(int $cast_as) /*: resource*/
	{
		return $this->rStream;
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
			if (isset(self::$aStreams[$sHashName]) && \is_resource(self::$aStreams[$sHashName])) {
				$this->rStream = self::$aStreams[$sHashName];
				\fseek($this->rStream, 0);
				$bResult = true;
			} else {
				$this->rStream = \fopen('php://temp', 'r+b');
				self::$aStreams[$sHashName] = $this->rStream;

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
		return \fflush($this->rStream);
	}

	public function stream_read(int $iLen) : string
	{
		return \fread($this->rStream, $iLen);
	}

	public function stream_write(string $sInputString) : int
	{
		return \fwrite($this->rStream, $sInputString);
	}

	public function stream_tell() : int
	{
		return \ftell($this->rStream);
	}

	public function stream_eof() : bool
	{
		return \feof($this->rStream);
	}

	public function stream_stat() : array
	{
		return \fstat($this->rStream);
	}

	public function stream_seek(int $iOffset, int $iWhence = SEEK_SET) : int
	{
		return \fseek($this->rStream, $iOffset, $iWhence);
	}
}

\stream_wrapper_register(TempFile::STREAM_NAME, TempFile::class);
