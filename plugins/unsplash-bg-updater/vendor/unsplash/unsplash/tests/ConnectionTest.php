<?php

namespace Crew\Unsplash\Tests;

use \Crew\Unsplash as Unsplash;
use \League\OAuth2\Client\Token\AccessToken;

/**
 * Class ConnectionTest
 * @package Crew\Unsplash\Tests
 */
class ConnectionTest extends BaseTest
{
    /**
     * @var Unsplash\Connection
     */
    protected $connection;

    public function setUp()
    {
        parent::setUp();

        // If the class is not cloned, the mock method will get stick
        // to it
        $provider = clone $this->provider;

        $provider->shouldReceive('getAuthorizationUrl')->times(1)->andReturn(
            '{getenv(SITE_URI)}/oauth/authorize?client_id=mock_client_id&client_secret=mock_secret&redirect_uri=none'
        );

        $provider->shouldReceive('getState')->times(1)->andReturn('teststate');

        $provider->shouldReceive('getAccessToken')->times(1)->andReturn(
            new AccessToken([
                'access_token' => 'mock_access_token_1',
                'refresh_token' => 'mock_refresh_token_1',
                'expires_in' => time() + 3600
            ])
        );

        $this->connection = new Unsplash\Connection($provider);
    }

    public function testClientIdAsAuthorizationToken()
    {
        $this->assertEquals('Client-ID mock_client_id', $this->connection->getAuthorizationToken());
    }

    public function testAccessTokenAsAuthorizationToken()
    {
        $this->connection->setToken(new AccessToken([
            'access_token' => 'mock_access_token',
            'refresh_token' => 'mock_refresh_token',
            'expires_in' => time() + 3600
        ]));

        $this->assertEquals('Bearer mock_access_token', $this->connection->getAuthorizationToken());
    }

    public function testSetStateInSession()
    {
        $this->connection->getConnectionUrl();

        $this->assertNotEmpty($_SESSION[Unsplash\Connection::STATE]);
    }

    public function testValidState()
    {
        $this->connection->getConnectionUrl();

        $this->assertTrue($this->connection->isStateValid('teststate'));
    }

    public function testInvalidState()
    {
        $this->connection->getConnectionUrl();

        $this->assertFalse($this->connection->isStateValid('testbadstate'));
    }

    public function testGenerateTokenWithGoodCode()
    {
        $token = $this->connection->generateToken('mock_code');

        $this->assertEquals($token, new AccessToken([
            'access_token' => 'mock_access_token_1',
            'refresh_token' => 'mock_refresh_token_1',
            'expires_in' => time() + 3600
        ]));
    }

    public function testRegenerateToken()
    {
        $this->connection->setToken(
            new AccessToken([
                'access_token' => 'mock_access_token',
                'refresh_token' => 'mock_refresh_token',
                'expires_in' => time() + 3600
            ])
        );

        $token = $this->connection->refreshToken();

        $this->assertEquals('mock_access_token_1', $token->getToken());
    }

    public function testRegenerateTokenWithNoToken()
    {
        $token = $this->connection->refreshToken();

        $this->assertEquals(null, $token);
    }

    public function testRegenerateTokenOnAuthorization()
    {
        $this->connection->setToken(new AccessToken([
            'access_token' => 'mock_access_token',
            'refresh_token' => 'mock_refresh_token',
            'expires_in' => -3600
        ]));

        $this->assertEquals('Bearer mock_access_token_1', $this->connection->getAuthorizationToken());
    }
}
