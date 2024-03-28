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
 * @link http://redis.io/commands/hincrbyfloat
 *
 * @author Daniele Alessandri <suppakilla@gmail.com>
 */
class HashIncrementByFloat extends Command
{
    /**
     * {@inheritdoc}
     */
    public function getId()
    {
        return 'HINCRBYFLOAT';
    }
}
