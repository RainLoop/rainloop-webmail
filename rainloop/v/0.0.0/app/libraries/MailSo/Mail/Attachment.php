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

	public function Clear() : self
	{
		$this->sFolder = '';
		$this->iUid = 0;
		$this->oBodyStructure = null;

		return $this;
	}

	public function Folder() : string
	{
		return $this->sFolder;
	}

	public function Uid() : int
	{
		return $this->iUid;
	}

	public function MimeIndex() : string
	{
		return $this->oBodyStructure ? $this->oBodyStructure->PartID() : '';
	}

	public function FileName(bool $bCalculateOnEmpty = false) : string
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

	public function MimeType() : string
	{
		return $this->oBodyStructure ? $this->oBodyStructure->ContentType() : '';
	}

	public function ContentTransferEncoding() : string
	{
		return $this->oBodyStructure ? $this->oBodyStructure->MailEncodingName() : '';
	}

	public function EncodedSize() : int
	{
		return $this->oBodyStructure ? $this->oBodyStructure->Size() : 0;
	}

	public function EstimatedSize() : int
	{
		return $this->oBodyStructure ? $this->oBodyStructure->EstimatedSize() : 0;
	}

	public function Cid() : string
	{
		return $this->oBodyStructure ? $this->oBodyStructure->ContentID() : '';
	}

	public function ContentLocation() : string
	{
		return $this->oBodyStructure ? $this->oBodyStructure->ContentLocation() : '';
	}

	public function IsInline() : bool
	{
		return $this->oBodyStructure ? $this->oBodyStructure->IsInline() : false;
	}

	public function IsImage() : bool
	{
		return $this->oBodyStructure ? $this->oBodyStructure->IsImage() : false;
	}

	public function IsArchive() : bool
	{
		return $this->oBodyStructure ? $this->oBodyStructure->IsArchive() : false;
	}

	public function IsPdf() : bool
	{
		return $this->oBodyStructure ? $this->oBodyStructure->IsPdf() : false;
	}

	public function IsDoc() : bool
	{
		return $this->oBodyStructure ? $this->oBodyStructure->IsDoc() : false;
	}

	public function IsPgpSignature() : bool
	{
		return $this->oBodyStructure ? $this->oBodyStructure->IsPgpSignature() : false;
	}

	public static function NewInstance() : self
	{
		return new self();
	}

	public static function NewBodyStructureInstance(string $sFolder, int $iUid, \MailSo\Imap\BodyStructure $oBodyStructure) : self
	{
		return self::NewInstance()->InitByBodyStructure($sFolder, $iUid, $oBodyStructure);
	}

	public function InitByBodyStructure(string $sFolder, int $iUid, \MailSo\Imap\BodyStructure $oBodyStructure) : self
	{
		$this->sFolder = $sFolder;
		$this->iUid = $iUid;
		$this->oBodyStructure = $oBodyStructure;
		return $this;
	}
}
