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
class SubStreams
{
	/**
	 * @var string
	 */
	const STREAM_NAME = 'mailsosubstreams';

	/**
	 * @var array
	 */
	private static $aStreams = array();

	/**
	 * @var array
	 */
	private $aSubStreams;

	/**
	 * @var int
	 */
	private $iIndex;

	/**
	 * @var string
	 */
	private $sBuffer;

	/**
	 * @var bool
	 */
	private $bIsEnd;

	/**
	 * @var int
	 */
	private $iPos;

	/**
	 * @param array $aSubStreams
	 *
	 * @return resource|bool
	 */
	public static function CreateStream($aSubStreams)
	{
		if (!\in_array(self::STREAM_NAME, \stream_get_wrappers()))
		{
			\stream_wrapper_register(self::STREAM_NAME, '\MailSo\Base\StreamWrappers\SubStreams');
		}

		$sHashName = \MailSo\Base\Utils::Md5Rand();

		self::$aStreams[$sHashName] = \array_map(function ($mItem) {
			return \is_resource($mItem) ? $mItem :
				\MailSo\Base\ResourceRegistry::CreateMemoryResourceFromString($mItem);
		}, $aSubStreams);

		\MailSo\Base\Loader::IncStatistic('CreateStream/SubStreams');

		return \fopen(self::STREAM_NAME.'://'.$sHashName, 'rb');
	}

	/**
	 * @return resource|null
	 */
	protected function &getPart()
	{
		$nNull = null;
		if (isset($this->aSubStreams[$this->iIndex]))
		{
			return $this->aSubStreams[$this->iIndex];
		}

		return $nNull;
	}

	/**
	 * @param string $sPath
	 *
	 * @return bool
	 */
	public function stream_open($sPath)
	{
		$this->aSubStreams = array();

		$bResult = false;
		$aPath = \parse_url($sPath);

		if (isset($aPath['host'], $aPath['scheme']) &&
			0 < \strlen($aPath['host']) && 0 < \strlen($aPath['scheme']) &&
			self::STREAM_NAME === $aPath['scheme'])
		{
			$sHashName = $aPath['host'];
			if (isset(self::$aStreams[$sHashName]) &&
				\is_array(self::$aStreams[$sHashName]) &&
				0 < \count(self::$aStreams[$sHashName]))
			{
				$this->iIndex = 0;
				$this->iPos = 0;
				$this->bIsEnd = false;
				$this->sBuffer = '';
				$this->aSubStreams = self::$aStreams[$sHashName];
			}

			$bResult = 0 < \count($this->aSubStreams);
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
		$sReturn = '';
		$mCurrentPart = null;
		if ($iCount > 0)
		{
			if ($iCount < \strlen($this->sBuffer))
			{
				$sReturn = \substr($this->sBuffer, 0, $iCount);
				$this->sBuffer = \substr($this->sBuffer, $iCount);
			}
			else
			{
				$sReturn = $this->sBuffer;
				while ($iCount > 0)
				{
					$mCurrentPart =& $this->getPart();
					if (null === $mCurrentPart)
					{
						$this->bIsEnd = true;
						$this->sBuffer = '';
						$iCount = 0;
						break;
					}

					if (\is_resource($mCurrentPart))
					{
						if (!\feof($mCurrentPart))
						{
							$sReadResult = @\fread($mCurrentPart, 8192);
							if (false === $sReadResult)
							{
								return false;
							}

							$sReturn .= $sReadResult;

							$iLen = \strlen($sReturn);
							if ($iCount < $iLen)
							{
								$this->sBuffer = \substr($sReturn, $iCount);
								$sReturn = \substr($sReturn, 0, $iCount);
								$iCount = 0;
							}
							else
							{
								$iCount -= $iLen;
							}
						}
						else
						{
							$this->iIndex++;
						}
					}
				}
			}

			$this->iPos += \strlen($sReturn);
			return $sReturn;
		}

		return false;
	}

	/**
	 * @return int
	 */
	public function stream_write()
	{
		return 0;
	}

	/**
	 * @return int
	 */
	public function stream_tell()
	{
		return $this->iPos;
	}

	/**
	 * @return bool
	 */
	public function stream_eof()
	{
		return $this->bIsEnd;
	}

	/**
	 * @return array
	 */
	public function stream_stat()
	{
		return array(
			'dev' => 2,
			'ino' => 0,
			'mode' => 33206,
			'nlink' => 1,
			'uid' => 0,
			'gid' => 0,
			'rdev' => 2,
			'size' => 0,
			'atime' => 1061067181,
			'mtime' => 1056136526,
			'ctime' => 1056136526,
			'blksize' => -1,
			'blocks' => -1
		);
	}

	/**
	 * @return bool
	 */
	public function stream_seek()
	{
		return false;
	}
}
