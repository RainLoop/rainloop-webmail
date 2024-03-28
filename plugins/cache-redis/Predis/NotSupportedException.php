<?php

/*
 * This file is part of the Predis package.
 *
 * (c) Daniele Alessandri <suppakilla@gmail.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace Predis;

/**
 * Exception class thrown when trying to use features not supported by certain
 * classes or abstractions of Predis.
 *
 * @author Daniele Alessandri <suppakilla@gmail.com>
 */
class NotSupportedException extends PredisException
{
}
