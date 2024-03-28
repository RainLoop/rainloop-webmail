<?php

/*
 * This file is part of the Predis package.
 *
 * (c) Daniele Alessandri <suppakilla@gmail.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace Predis\Command;

/**
 * @link http://redis.io/commands/watch
 *
 * @author Daniele Alessandri <suppakilla@gmail.com>
 */
class TransactionWatch extends Command
{
    /**
     * {@inheritdoc}
     */
    public function getId()
    {
        return 'WATCH';
    }

    /**
     * {@inheritdoc}
     */
    protected function filterArguments(array $arguments)
    {
        if (isset($arguments[0]) && is_array($arguments[0])) {
            return $arguments[0];
        }

        return $arguments;
    }
}
