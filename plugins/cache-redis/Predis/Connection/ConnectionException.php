<?php

/*
 * This file is part of the Predis package.
 *
 * (c) Daniele Alessandri <suppakilla@gmail.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace Predis\Connection;

use Predis\CommunicationException;

/**
 * Exception class that identifies connection-related errors.
 *
 * @author Daniele Alessandri <suppakilla@gmail.com>
 */
class ConnectionException extends CommunicationException
{
}
