<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Imap\Enumerations;

/**
 * @category MailSo
 * @package Imap
 * @subpackage Enumerations
 */
abstract class StoreAction
{
//	const SET_FLAGS = 'FLAGS';
//	const SET_FLAGS_SILENT = 'FLAGS.SILENT';
	const ADD_FLAGS = '+FLAGS';
	const ADD_FLAGS_SILENT = '+FLAGS.SILENT';
	const REMOVE_FLAGS = '-FLAGS';
	const REMOVE_FLAGS_SILENT = '-FLAGS.SILENT';
}
