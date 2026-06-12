package com.smartride.smartride.security;

import org.springframework.stereotype.Service;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

/**
 * In-memory token blacklist for logout.
 * When a user logs out, their token is stored here.
 * JwtAuthFilter checks this before allowing a request.
 *
 * Note: For production use a Redis-based store so tokens
 * are shared across multiple server instances.
 */
@Service
public class TokenBlacklistService {

    private final Set<String> blacklistedTokens =
            Collections.synchronizedSet(new HashSet<>());

    public void blacklist(String token) {
        blacklistedTokens.add(token);
    }

    public boolean isBlacklisted(String token) {
        return blacklistedTokens.contains(token);
    }
}
