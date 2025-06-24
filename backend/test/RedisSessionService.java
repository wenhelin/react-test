
// File: E:\project\java\hello-spring-boot\src\main\java\com\example\hellospringboot\service\RedisSessionService.java
package com.example.hellospringboot.service;

import org.springframework.stereotype.Service;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;
import redis.clients.jedis.JedisPoolConfig;

import javax.net.ssl.SSLContext;
import java.security.KeyManagementException;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;

@Service
public class RedisSessionService {

    private final JedisPool jedisPool;

    public RedisSessionService() throws NoSuchAlgorithmException, KeyManagementException {
        JedisPoolConfig poolConfig = new JedisPoolConfig();
        poolConfig.setMaxTotal(128);
        poolConfig.setMaxIdle(128);
        poolConfig.setMinIdle(16);

        // 示例 Redis 地址和端口，请根据实际配置修改
        this.jedisPool = new JedisPool(
                poolConfig,
                "your-redis-host",
                6379,
                2000,
                null,
                null,
                0,
                "default",
                SSLContext.getDefault().getSocketFactory(),
                null
        );
    }

    public String getSessionAttribute(String sessionId, String key) {
        try (Jedis jedis = jedisPool.getResource()) {
            jedis.auth("rhSharedKey"); // IAM 认证方式
            return jedis.get("session:" + sessionId + ":" + key);
        }
    }

    public void setSessionAttribute(String sessionId, String key, String value) {
        try (Jedis jedis = jedisPool.getResource()) {
            jedis.auth("rhSharedKey");
            jedis.setex("session:" + sessionId + ":" + key, Duration.ofMinutes(30).getSeconds(), value);
        }
    }

    public void deleteSession(String sessionId) {
        try (Jedis jedis = jedisPool.getResource()) {
            jedis.auth("rhSharedKey");
            jedis.del("session:" + sessionId + ":*");
        }
    }
}