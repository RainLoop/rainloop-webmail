<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Mime\Enumerations;

/**
 * @category MailSo
 * @package Mime
 * @subpackage Enumerations
 */
abstract class Parameter
{
	const CHARSET = 'charset';
	const NAME = 'name';
	const FILENAME = 'filename';
	const FORMAT = 'format';
	const BOUNDARY = 'boundary';
	const PROTOCOL = 'protocol';
}
