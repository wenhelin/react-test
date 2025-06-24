
// File: E:\project\java\hello-spring-boot\src\main\java\com\example\hellospringboot\util\SessionUtils.java
package com.example.hellospringboot.util;

import com.example.hellospringboot.service.RedisSessionService;

public class SessionUtils {

    // 模拟从请求中获取 sessionId（前端需传入 sessionId）
    public static String getCurrentSessionId() {
        // TODO: 从 RequestHeader 或 Cookie 中获取 sessionId
        return "test-session-id"; // 示例值，应改为真实获取方式
    }

    public static String getUsernameFromSession() {
        RedisSessionService redisSessionService = com.example.hellospringboot.config.ApplicationContextProvider.getBean(RedisSessionService.class);
        String sessionId = getCurrentSessionId();
        return redisSessionService.getSessionAttribute(sessionId, "username");
    }
}