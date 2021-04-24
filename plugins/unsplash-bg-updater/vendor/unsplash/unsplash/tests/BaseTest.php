<?php

namespace Crew\Unsplash\Tests;

use Mockery as m;
use \VCR\VCR;
use \VCR\Request;
use Dotenv\Dotenv;
use \League\OAuth2\Client\Token\AccessToken;

/**
 * Class BaseTest
 * @package Crew\Unsplash\Tests
 */
abstract class BaseTest extends \PHPUnit_Framework_TestCase
{
    /**
     * @var m\MockInterface
     */
    protected $provider;

    protected $accessToken;

    public function setUp()
    {
        // Only load env file if it exist.
        // It will use the env variable on server if there's no file
        if (file_exists(__DIR__ . '/.env')) {
            $dotenv = new Dotenv(__DIR__);
            $dotenv->load();
        }

        $this->provider = m::mock('Unsplash\OAuth2\Client\Provider\Unsplash', [
            'clientId' => 'mock_client_id',
            'clientSecret' => 'mock_secret',
            'redirectUri' => 'none'
        ]);
        $this->provider->shouldReceive('getClientId')->andReturn('mock_client_id');

        $this->accessToken = new AccessToken([
            'access_token' => getenv('ACCESS_TOKEN'),
            'refresh_token' => 'mock_refresh_token_1',
            'expires_in' => time() + 3600
        ]);

        VCR::configure()->setStorage('json')
            ->addRequestMatcher(
                'validate_authorization',
                function (Request $first, Request $second) {
                    if ($first->getHeaders()['Authorization'] == $second->getHeaders()['Authorization']) {
                        return true;
                    } else {
                        return false;
                    }
                }
            )
            ->enableRequestMatchers(['method', 'url', 'host', 'query_string', 'post_fields', 'validate_authorization']);
        VCR::turnOn();
    }

    /**
     * getPrivateMethod
     *
     * @author Joe Sexton <joe@webtipblog.com>
     * @param object $object
     * @param string $methodName
     * @param array $params
     * @return \ReflectionMethod
    */
    public function executePrivateMethod($object, $methodName, $params = [])
    {
        $className = get_class($object);
        $reflector = new \ReflectionClass($className);
        $method = $reflector->getMethod($methodName);
        $method->setAccessible(true);
        return $method->invokeArgs($object, $params);
    }
}
