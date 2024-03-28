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
 * @link http://redis.io/commands/pfcount
 *
 * @author Daniele Alessandri <suppakilla@gmail.com>
 */
class HyperLogLogCount extends Command
{
    /**
     * {@inheritdoc}
     */
    public function getId()
    {
        return 'PFCOUNT';
    }

    /**
     * {@inheritdoc}
     */
    protected function filterArguments(array $arguments)
    {
        return self::normalizeArguments($arguments);
    }
}
