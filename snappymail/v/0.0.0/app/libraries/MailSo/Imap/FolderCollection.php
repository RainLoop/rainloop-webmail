<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Imap;

/**
 * @category MailSo
 * @package Mail
 */
class FolderCollection extends \MailSo\Base\Collection
{
//	public bool $Optimized = false;

	public function append($oFolder, bool $bToTop = false) : void
	{
		assert($oFolder instanceof Folder);
		parent::append($oFolder, $bToTop);
	}

	#[\ReturnTypeWillChange]
	public function jsonSerialize()
	{
		return array(
			'@Object' => 'Collection/FolderCollection',
			'@Collection' => \array_values($this->getArrayCopy()),
//			'optimized' => $this->Optimized
		);
	}
}
