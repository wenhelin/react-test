package com.example.redis.client;

import com.google.cloud.redis.v1beta1.CloudRedisClient;
import com.google.cloud.redis.v1beta1.Instance;
import com.google.cloud.redis.v1beta1.InstanceName;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;
import redis.clients.jedis.JedisPoolConfig;

import javax.net.ssl.*;
import java.security.KeyManagementException;
import java.security.NoSuchAlgorithmException;
import java.security.cert.X509Certificate;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

public class GoogleCloudRedisClient {

    // 缓存每个 Instance 对应的 JedisPool
    private final Map<String, JedisPool> jedisPoolMap = new ConcurrentHashMap<>();

    // 创建信任所有证书的 SSLContext（测试环境可用）
    private SSLContext createTrustAllSSLContext() throws NoSuchAlgorithmException, KeyManagementException {
        SSLContext sslContext = SSLContext.getInstance("TLS");
        sslContext.init(null, new TrustManager[]{new X509TrustManager() {
            public void checkClientTrusted(X509Certificate[] chain, String authType) {}
            public void checkServerTrusted(X509Certificate[] chain, String authType) {}
            public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
        }}, null);
        return sslContext;
    }

    // 根据 project/location/instanceId 获取 Instance 信息
    public Instance getInstance(String projectId, String location, String instanceId) throws Exception {
        try (CloudRedisClient redisClient = CloudRedisClient.create()) {
            InstanceName instanceName = InstanceName.of(projectId, location, instanceId);
            return redisClient.getInstance(instanceName);
        }
    }

    // 根据 Instance 创建或复用 JedisPool
    private JedisPool getOrCreateJedisPool(Instance instance) throws KeyManagementException, NoSuchAlgorithmException {
        String key = instance.getName();

        return jedisPoolMap.computeIfAbsent(key, k -> {
            try {
                JedisPoolConfig poolConfig = new JedisPoolConfig();
                poolConfig.setMaxTotal(128);
                poolConfig.setMaxIdle(128);
                poolConfig.setMinIdle(16);

                SSLContext sslContext = createTrustAllSSLContext();

                return new JedisPool(
                        poolConfig,
                        instance.getHost(),
                        instance.getPort(),
                        2000,
                        null, null, 0, false, null,
                        sslContext.getSocketFactory(),
                        null
                );
            } catch (Exception e) {
                throw new RuntimeException("Failed to create JedisPool", e);
            }
        });
    }

    // 创建会话
    public String createSession(Instance instance, String userId) {
        JedisPool jedisPool = getOrCreateJedisPool(instance);
        String sessionId = UUID.randomUUID().toString();
        try (Jedis jedis = jedisPool.getResource()) {
            jedis.auth("rhSharedKey");
            jedis.setex("session:" + sessionId, Duration.ofMinutes(30).getSeconds(), userId);
        }
        return sessionId;
    }

    // 获取会话中的用户 ID
    public String getUserIdFromSession(Instance instance, String sessionId) {
        JedisPool jedisPool = getOrCreateJedisPool(instance);
        try (Jedis jedis = jedisPool.getResource()) {
            jedis.auth("rhSharedKey");
            return jedis.get("session:" + sessionId);
        }
    }

    // 删除会话
    public void deleteSession(Instance instance, String sessionId) {
        JedisPool jedisPool = getOrCreateJedisPool(instance);
        try (Jedis jedis = jedisPool.getResource()) {
            jedis.auth("rhSharedKey");
            jedis.del("session:" + sessionId);
        }
    }

    // 关闭所有连接池（用于 shutdown hook 或测试清理）
    public void closeAll() {
        jedisPoolMap.values().forEach(JedisPool::close);
    }
}
