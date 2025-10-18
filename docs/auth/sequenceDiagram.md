sequenceDiagram
    actor Client
    participant UserController
    participant AuthController
    participant UserService
    participant AuthService
    participant UserRepository
    participant PrismaService
    participant JwtService
    participant ConfigService
    participant argon2

    %% Registration Flow
    Client->>UserController: POST /users {name, email, password}
    UserController->>UserService: create(CreateUserDto)
    UserService->>argon2: hash(password)
    argon2-->>UserService: hashedPassword
    UserService->>ConfigService: get('JWT_SECRET')
    ConfigService-->>UserService: JWT_SECRET
    UserService->>JwtService: sign({ sub: 0, email }, JWT_SECRET)
    JwtService-->>UserService: access_token
    UserService->>ConfigService: get('JWT_REFRESH_SECRET')
    ConfigService-->>UserService: JWT_REFRESH_SECRET
    UserService->>JwtService: sign({ sub: 0, email }, JWT_REFRESH_SECRET)
    JwtService-->>UserService: refresh_token
    UserService->>UserRepository: create({ name, email, hashedPassword, refresh_token })
    UserRepository->>PrismaService: create({ data: { name, email, password, refreshToken } })
    PrismaService-->>UserRepository: User
    UserRepository-->>UserService: User
    UserService->>ConfigService: get('JWT_SECRET')
    ConfigService-->>UserService: JWT_SECRET
    UserService->>JwtService: sign({ sub: user.id, email }, JWT_SECRET)
    JwtService-->>UserService: final_access_token
    UserService->>ConfigService: get('JWT_REFRESH_SECRET')
    ConfigService-->>UserService: JWT_REFRESH_SECRET
    UserService->>JwtService: sign({ sub: user.id, email }, JWT_REFRESH_SECRET)
    JwtService-->>UserService: final_refresh_token
    UserService->>UserRepository: update(user.id, { refreshToken: final_refresh_token })
    UserRepository->>PrismaService: update({ where: { id }, data: { refreshToken } })
    PrismaService-->>UserRepository: User
    UserRepository-->>UserService: User
    UserService-->>UserController: { user, access_token, refresh_token }
    UserController-->>Client: 201 { user, access_token, refresh_token }

    %% Login Flow
    Client->>AuthController: POST /auth/login {email, password}
    AuthController->>AuthService: login(LoginUserDto)
    AuthService->>UserRepository: findOneByEmail(email)
    UserRepository->>PrismaService: findUnique({ where: { email } })
    PrismaService-->>UserRepository: User | null
    UserRepository-->>AuthService: User | null
    alt User not found
        AuthService-->>AuthController: UnauthorizedException
        AuthController-->>Client: 401 Invalid credentials
    else User found
        AuthService->>argon2: verify(password, user.password)
        argon2-->>AuthService: boolean
        alt Password invalid
            AuthService-->>AuthController: UnauthorizedException
            AuthController-->>Client: 401 Invalid credentials
        else Password valid
            AuthService->>ConfigService: get('JWT_SECRET')
            ConfigService-->>AuthService: JWT_SECRET
            AuthService->>JwtService: sign({ sub: user.id, email }, JWT_SECRET)
            JwtService-->>AuthService: access_token
            AuthService->>ConfigService: get('JWT_REFRESH_SECRET')
            ConfigService-->>AuthService: JWT_REFRESH_SECRET
            AuthService->>JwtService: sign({ sub: user.id, email }, JWT_REFRESH_SECRET)
            JwtService-->>AuthService: refresh_token
            AuthService->>UserRepository: update(user.id, { refreshToken })
            UserRepository->>PrismaService: update({ where: { id }, data: { refreshToken } })
            PrismaService-->>UserRepository: User
            UserRepository-->>AuthService: User
            AuthService-->>AuthController: { access_token, refresh_token }
            AuthController-->>Client: 200 { access_token, refresh_token }
        end
    end

    %% Refresh Token Flow
    Client->>AuthController: POST /auth/refresh { refreshToken }
    AuthController->>AuthService: refresh(RefreshTokenDto)
    AuthService->>ConfigService: get('JWT_REFRESH_SECRET')
    ConfigService-->>AuthService: JWT_REFRESH_SECRET
    AuthService->>JwtService: verifyAsync(refreshToken, JWT_REFRESH_SECRET)
    JwtService-->>AuthService: payload | error
    alt Invalid refresh token
        AuthService-->>AuthController: UnauthorizedException
        AuthController-->>Client: 401 Invalid refresh token
    else Valid refresh token
        AuthService->>UserRepository: findOne(payload.sub)
        UserRepository->>PrismaService: findUnique({ where: { id } })
        PrismaService-->>UserRepository: User | null
        UserRepository-->>AuthService: User | null
        alt User not found or refreshToken mismatch
            AuthService-->>AuthController: UnauthorizedException
            AuthController-->>Client: 401 Invalid refresh token
        else Valid user and refresh token
            AuthService->>ConfigService: get('JWT_SECRET')
            ConfigService-->>AuthService: JWT_SECRET
            AuthService->>JwtService: sign({ sub: user.id, email }, JWT_SECRET)
            JwtService-->>AuthService: access_token
            AuthService-->>AuthController: { access_token }
            AuthController-->>Client: 200 { access_token }
        end
    end