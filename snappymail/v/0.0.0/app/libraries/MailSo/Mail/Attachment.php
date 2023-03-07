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

use MailSo\Imap\BodyStructure;

/**
 * @category MailSo
 * @package Mail
 */
class Attachment implements \JsonSerializable
{
	private string $sFolder;

	private int $iUid;

	private ?BodyStructure $oBodyStructure;

	function __construct(string $sFolder, int $iUid, BodyStructure $oBodyStructure)
	{
		$this->sFolder = $sFolder;
		$this->iUid = $iUid;
		$this->oBodyStructure = $oBodyStructure;
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

	public function __call(string $name, array $arguments) //: mixed
	{
		return $this->oBodyStructure->{$name}(...$arguments);
	}

	#[\ReturnTypeWillChange]
	public function jsonSerialize()
	{
		$aResult = \array_merge([
			'@Object' => 'Object/Attachment',
			'folder' => $this->sFolder,
			'uid' => $this->iUid
		], $this->oBodyStructure->jsonSerialize());
		$aResult['isThumbnail'] = \MailSo\Base\Utils::fileHasThumbnail($aResult['fileName']);
		$oActions = \RainLoop\Api::Actions();
		$aResult['download'] = $oActions->encodeRawKey(array(
			'folder' => $aResult['folder'],
			'uid' => $aResult['uid'],
			'mimeIndex' => $aResult['mimeIndex'],
			'mimeType' => $aResult['mimeType'],
			'fileName' => $aResult['fileName']
		));
		return $aResult;
	}
}
