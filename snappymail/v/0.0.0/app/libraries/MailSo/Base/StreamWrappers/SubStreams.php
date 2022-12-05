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
 * https://www.php.net/streamwrapper
 */
class SubStreams
{
	/** @var resource|null */
	public $context;

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
	 * @return resource|bool
	 */
	public static function CreateStream(array $aSubStreams)
	{
		$sHashName = \MailSo\Base\Utils::Sha1Rand();

		self::$aStreams[$sHashName] = \array_map(function ($mItem) {
			return \is_resource($mItem) ? $mItem :
				\MailSo\Base\ResourceRegistry::CreateMemoryResourceFromString($mItem);
		}, $aSubStreams);

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

	public function stream_open(string $sPath) : bool
	{
		$this->aSubStreams = array();

		$bResult = false;
		$aPath = \parse_url($sPath);

		if (isset($aPath['host'], $aPath['scheme']) &&
			\strlen($aPath['host']) && \strlen($aPath['scheme']) &&
			self::STREAM_NAME === $aPath['scheme'])
		{
			$sHashName = $aPath['host'];
			if (isset(self::$aStreams[$sHashName]) &&
				\is_array(self::$aStreams[$sHashName]) &&
				\count(self::$aStreams[$sHashName]))
			{
				$this->iIndex = 0;
				$this->iPos = 0;
				$this->bIsEnd = false;
				$this->sBuffer = '';
				$this->aSubStreams = self::$aStreams[$sHashName];
			}

			$bResult = \count($this->aSubStreams);
		}

		return $bResult;
	}

	public function stream_read(int $iCount) : string
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
							$sReadResult = \fread($mCurrentPart, 8192);
							if (false === $sReadResult)
							{
								return false;
							}
							$sReturn .= $sReadResult;
						}
						else
						{
							$this->iIndex++;
						}
					}

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
			}

			$this->iPos += \strlen($sReturn);
			return $sReturn;
		}

		return false;
	}

	public function stream_write() : int
	{
		return 0;
	}

	public function stream_tell() : int
	{
		return $this->iPos;
	}

	public function stream_eof() : bool
	{
		return $this->bIsEnd;
	}

	public function stream_stat() : array
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

	public function stream_seek() : bool
	{
		return false;
	}
}

\stream_wrapper_register(SubStreams::STREAM_NAME, SubStreams::class);
