```mermaid
---
config:
  theme: 'neutral'
  themeVariables:
    primaryColor: '#4f96e7ff'
    primaryBorderColor: 'rgba(153, 188, 241, 1)'
    lineColor: '#F8B229'
    secondaryColor: '#006100'
    tertiaryColor: '#ffffff60'
---
sequenceDiagram
box cadetblue Frontend
    participant Client
  end

  box rgba(135, 217, 223, 1) App
    participant TokenAuthGuard
    participant AuthController
    participant UserController
    participant UserService
    participant AuthService
    participant RedisService
    participant UserRepo as UserRepository
  end

  box rgba(243, 131, 131, 1) Redis
    participant Redis
  end

  box coral DB
    participant DB as Database
  end

    %% === Login from Device 1 ===
    Client->>AuthController: POST /auth/login {email, password}
    AuthController->>AuthService: login(dto, deviceInfo)
    AuthService->>DB: findOneByEmail(email)
    DB-->>AuthService: User
    AuthService ->> AuthService: argon2.verify(user.password, loginUserDto.password)
    AuthService->>AuthService: generateAccessToken()
    AuthService-->>AuthService: accessToken
    AuthService->>AuthService: generateRefreshToken()
    AuthService-->>AuthService: refreshToken
    AuthService->>RedisService: setAccessToken(user.id, user.id:accessToken)
    RedisService->>Redis: SET access_token:user.id user.id:accessToken EX 3600
    Redis-->>RedisService: OK
    RedisService-->>AuthService: OK
    AuthService->>RedisService: setRefreshToken(user.id, user.id:refreshToken)
    RedisService->>Redis: SET refresh_token:user.id user.id:refreshToken EX 604800
    Redis-->>RedisService: OK
    RedisService-->>AuthService: OK
    AuthService->>RedisService: setSession(userId, sessionId1, refreshToken1, device1, now)
    RedisService-->>Redis: HSET user_sessions:1 sessionId1 "{refreshToken, device, lastActive}"
    RedisService-->>Redis: EXPIRE user_sessions:1 604800
    AuthService-->>AuthController: {access_token, refresh_token, session_id: sessionId1}
    AuthController-->>Client: 200 OK + tokens + session_id

    %% === Login from Device 2 ===
    Client->>AuthController: POST /auth/login (same user, different device)
    AuthController->>AuthService: login(dto, deviceInfo2)
    AuthService->>AuthService: generateRefreshToken()
    AuthService-->>AuthService: refreshToken
    AuthService->>RedisService: setAccessToken(user.id, user.id:accessToken)
    RedisService->>Redis: SET access_token:user.id user.id:accessToken EX 3600
    Redis-->>RedisService: OK
    RedisService-->>AuthService: OK
    AuthService->>RedisService: setRefreshToken(user.id, user.id:refreshToken)
    RedisService->>Redis: SET refresh_token:user.id user.id:refreshToken EX 604800
    Redis-->>RedisService: OK
    RedisService-->>AuthService: OK
    AuthService->>RedisService: setSession(userId, sessionId2, refreshToken2, device2, now)
    RedisService-->>Redis: HSET user_sessions:1 sessionId2 "{...}"
    AuthService-->>Client: 200 OK + session_id2

    %% === Refresh Session (Device 1) ===
    Client->>AuthController: POST /auth/refresh {refreshToken1}
    AuthController->>AuthService: refresh(refreshTokenDto)
    AuthService->>AuthService: verify(refreshToken1, refresh_secret)
    AuthService-->>AuthService: payload {sub: userId}
    AuthService->>RedisService: findSessionByToken(userId, refreshToken1)
    RedisService-->>Redis: HGETALL → scan for matching refreshToken
    RedisService-->>AuthService: sessionId1
    AuthService->>AuthService: generateRefreshToken()
    AuthService-->>AuthService: refreshToken
    AuthService->>RedisService: setAccessToken(user.id, user.id:accessToken)
    RedisService->>Redis: SET access_token:user.id user.id:accessToken EX 3600
    Redis-->>RedisService: OK
    RedisService-->>AuthService: OK
    AuthService->>RedisService: setRefreshToken(user.id, user.id:refreshToken)
    RedisService->>Redis: SET refresh_token:user.id user.id:refreshToken EX 604800
    Redis-->>RedisService: OK
    RedisService-->>AuthService: OK
    AuthService->>RedisService: updateSession(userId, sessionId1, new_refresh_token, now)
    RedisService-->>Redis: HSET sessionId1 → updated token + lastActive
    AuthService-->>Client: {access_token, refresh_token (new)}

    %% === Terminate Session (Device 2) ===
    Client->>AuthController: DELETE /auth/sessions/sessionId2 (Bearer access_token)
    AuthController->>TokenAuthGuard: Validate Opaque Token
    AuthController->>AuthService: terminateSession(userId, sessionId2)
    AuthService->>RedisService: deleteSession(userId, sessionId2)
    RedisService-->>Redis: HDEL user_sessions:1 sessionId2
    AuthService-->>Client: 200 OK (session terminated)

    %% === Failed Refresh (Terminated Token) ===
    Client->>AuthController: POST /auth/refresh {old_refresh_token2}
    AuthController->>AuthService: refresh(...)
    AuthService->>RedisService: findSessionByToken(userId, old_refresh_token2)
    RedisService-->>AuthService: null (not found)
    AuthService-->>Client: 401 Invalid refresh token
```