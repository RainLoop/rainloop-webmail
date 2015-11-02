<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Mail;

/**
 * @category MailSo
 * @package Mail
 */
class Attachment
{
	/**
	 * @var string
	 */
	private $sFolder;

	/**
	 * @var int
	 */
	private $iUid;

	/**
	 * @var \MailSo\Imap\BodyStructure
	 */
	private $oBodyStructure;

	/**
	 * @access private
	 */
	private function __construct()
	{
		$this->Clear();
	}

	/**
	 * @return \MailSo\Mail\Attachment
	 */
	public function Clear()
	{
		$this->sFolder = '';
		$this->iUid = 0;
		$this->oBodyStructure = null;

		return $this;
	}

	/**
	 * @return string
	 */
	public function Folder()
	{
		return $this->sFolder;
	}

	/**
	 * @return int
	 */
	public function Uid()
	{
		return $this->iUid;
	}

	/**
	 * @return string
	 */
	public function MimeIndex()
	{
		return $this->oBodyStructure ? $this->oBodyStructure->PartID() : '';
	}

	/**
	 * @param bool $bCalculateOnEmpty = false
	 *
	 * @return string
	 */
	public function FileName($bCalculateOnEmpty = false)
	{
		$sFileName = '';
		if ($this->oBodyStructure)
		{
			$sFileName = $this->oBodyStructure->FileName();
			if ($bCalculateOnEmpty && 0 === \strlen(trim($sFileName)))
			{
				$sMimeType = \strtolower(\trim($this->MimeType()));
				if ('message/rfc822' === $sMimeType)
				{
					$sFileName = 'message'.$this->MimeIndex().'.eml';
				}
				else if ('text/calendar' === $sMimeType)
				{
					$sFileName = 'calendar'.$this->MimeIndex().'.ics';
				}
				else if (0 < \strlen($sMimeType))
				{
					$sFileName = \str_replace('/', $this->MimeIndex().'.', $sMimeType);
				}
			}
		}

		return $sFileName;
	}

	/**
	 * @return string
	 */
	public function MimeType()
	{
		return $this->oBodyStructure ? $this->oBodyStructure->ContentType() : '';
	}

	/**
	 * @return string
	 */
	public function ContentTransferEncoding()
	{
		return $this->oBodyStructure ? $this->oBodyStructure->MailEncodingName() : '';
	}

	/**
	 * @return int
	 */
	public function EncodedSize()
	{
		return $this->oBodyStructure ? $this->oBodyStructure->Size() : 0;
	}

	/**
	 * @return int
	 */
	public function EstimatedSize()
	{
		return $this->oBodyStructure ? $this->oBodyStructure->EstimatedSize() : 0;
	}

	/**
	 * @return string
	 */
	public function Cid()
	{
		return $this->oBodyStructure ? $this->oBodyStructure->ContentID() : '';
	}

	/**
	 * @return string
	 */
	public function ContentLocation()
	{
		return $this->oBodyStructure ? $this->oBodyStructure->ContentLocation() : '';
	}

	/**
	 * @return bool
	 */
	public function IsInline()
	{
		return $this->oBodyStructure ? $this->oBodyStructure->IsInline() : false;
	}

	/**
	 * @return bool
	 */
	public function IsImage()
	{
		return $this->oBodyStructure ? $this->oBodyStructure->IsImage() : false;
	}

	/**
	 * @return bool
	 */
	public function IsArchive()
	{
		return $this->oBodyStructure ? $this->oBodyStructure->IsArchive() : false;
	}

	/**
	 * @return bool
	 */
	public function IsPdf()
	{
		return $this->oBodyStructure ? $this->oBodyStructure->IsPdf() : false;
	}

	/**
	 * @return bool
	 */
	public function IsDoc()
	{
		return $this->oBodyStructure ? $this->oBodyStructure->IsDoc() : false;
	}

	/**
	 * @return bool
	 */
	public function IsPgpSignature()
	{
		return $this->oBodyStructure ? $this->oBodyStructure->IsPgpSignature() : false;
	}

	/**
	 * @return \MailSo\Mail\Attachment
	 */
	public static function NewInstance()
	{
		return new self();
	}

	/**
	 * @param string $sFolder
	 * @param int $iUid
	 * @param \MailSo\Imap\BodyStructure $oBodyStructure
	 * @return \MailSo\Mail\Attachment
	 */
	public static function NewBodyStructureInstance($sFolder, $iUid, $oBodyStructure)
	{
		return self::NewInstance()->InitByBodyStructure($sFolder, $iUid, $oBodyStructure);
	}

	/**
	 * @param string $sFolder
	 * @param int $iUid
	 * @param \MailSo\Imap\BodyStructure $oBodyStructure
	 * @return \MailSo\Mail\Attachment
	 */
	public function InitByBodyStructure($sFolder, $iUid, $oBodyStructure)
	{
		$this->sFolder = $sFolder;
		$this->iUid = $iUid;
		$this->oBodyStructure = $oBodyStructure;
		return $this;
	}
}
