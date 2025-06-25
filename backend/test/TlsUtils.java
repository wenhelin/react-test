package com.example.redis;

import javax.net.ssl.*;
import java.io.FileInputStream;
import java.security.KeyStore;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;

public class TlsUtils {

    public static SSLContext createSSLContextWithCaCert(String certPath) throws Exception {
        // 1. 加载 CA 证书
        CertificateFactory cf = CertificateFactory.getInstance("X.509");
        try (FileInputStream fis = new FileInputStream(certPath)) {
            X509Certificate caCert = (X509Certificate) cf.generateCertificate(fis);

            // 2. 创建 KeyStore 并添加证书
            KeyStore keyStore = KeyStore.getInstance(KeyStore.getDefaultType());
            keyStore.load(null, null);
            keyStore.setCertificateEntry("redis-ca", caCert);

            // 3. 初始化 TrustManagerFactory
            TrustManagerFactory tmf = TrustManagerFactory
                .getInstance(TrustManagerFactory.getDefaultAlgorithm());
            tmf.init(keyStore);

            // 4. 初始化 SSLContext
            SSLContext sslContext = SSLContext.getInstance("TLS");
            sslContext.init(null, tmf.getTrustManagers(), null);

            return sslContext;
        }
    }
}