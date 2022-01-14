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
class Attachment implements \JsonSerializable
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

	function __construct()
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
		if (!$this->oBodyStructure) {
			return '';
		}

		$sFileName = \trim($this->oBodyStructure->FileName());
		if (\strlen($sFileName) || !$bCalculateOnEmpty) {
			return $sFileName;
		}

		$sIdx = '-' . $this->MimeIndex();

		$sMimeType = \strtolower(\trim($this->MimeType()));
		if ('message/rfc822' === $sMimeType) {
			return "message{$sIdx}.eml";
		}
		if ('text/calendar' === $sMimeType) {
			return "calendar{$sIdx}.ics";
		}
		if ('text/plain' === $sMimeType) {
			return "part{$sIdx}.txt";
		}
		if (\preg_match('@text/(vcard|html|csv|xml|css|asp)@', $sMimeType, $aMatch)
		 || \preg_match('@image/(png|jpeg|gif|bmp|cgm|ief|tiff|webp)@', $sMimeType, $aMatch)) {
			return "part{$sIdx}.{$aMatch[1]}";
		}
		if (\strlen($sMimeType)) {
			return \str_replace('/', $sIdx.'.', $sMimeType);
		}

		return ($this->oBodyStructure->IsInline() ? 'part' : 'inline' ) . $sIdx;
	}

	public function MimeType() : string
	{
		return $this->oBodyStructure ? $this->oBodyStructure->ContentType() : '';
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

	public static function NewBodyStructureInstance(string $sFolder, int $iUid, \MailSo\Imap\BodyStructure $oBodyStructure) : self
	{
		return (new self)->InitByBodyStructure($sFolder, $iUid, $oBodyStructure);
	}

	public function InitByBodyStructure(string $sFolder, int $iUid, \MailSo\Imap\BodyStructure $oBodyStructure) : self
	{
		$this->sFolder = $sFolder;
		$this->iUid = $iUid;
		$this->oBodyStructure = $oBodyStructure;
		return $this;
	}

	public function jsonSerialize()
	{
		return array(
			'@Object' => 'Object/Attachment',
			'Folder' => $this->Folder(),
			'Uid' => (string) $this->Uid(),
			'MimeIndex' => (string) $this->MimeIndex(),
			'MimeType' => $this->MimeType(),
			'FileName' => \MailSo\Base\Utils::ClearFileName(\MailSo\Base\Utils::ClearXss($this->FileName(true))),
			'EstimatedSize' => $this->EstimatedSize(),
			'Cid' => $this->Cid(),
			'ContentLocation' => $this->ContentLocation(),
			'IsInline' => $this->IsInline()
		);
	}
}
