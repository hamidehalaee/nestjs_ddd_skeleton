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
    participant AuthController
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

  %% Login Flow
  Client->>AuthController: 1. FrontEnd Send Login Request With Defiend Dto
  activate AuthController
  AuthController->>AuthService: 2. login(LoginUserDto)
  activate AuthService
  AuthService->>UserRepo: 3. Find User By Identifier Like Email or UserName
  activate UserRepo
  UserRepo->>DB: 4. Find User
  activate DB
  DB-->>UserRepo: 5. Return User
  deactivate DB
  UserRepo-->>AuthService: 6. Return User
  deactivate UserRepo
  alt User NOT Found
    AuthService-->>AuthController: 7. Unauthorized Exception
    AuthController-->>Client: 8. 401 Invalid credentials
  else User FOUND
    AuthService ->> AuthService: 9. Verify Password
    alt INCORRECT Password
      AuthService-->>AuthController: 10. Unauthorized Exception
      AuthController-->>Client: 11. 401 Invalid credentials
    else Password is CORRECT
      AuthService->>AuthService: 12. generate Access Token
      AuthService->>AuthService: 13. generate Refresh Token

      AuthService->>RedisService: 14. Set Access Token
      activate RedisService
      RedisService->>Redis: 15. Set Access Token
      activate Redis
      Redis-->>RedisService:

      RedisService-->>AuthService:
      AuthService->>RedisService: 16. Set Refresh Token
      RedisService->>Redis: 17. Set Refresh Token
      Redis-->>RedisService:
      deactivate Redis
      RedisService-->>AuthService:
      deactivate RedisService
      AuthService-->>AuthController: 18. Return Access Token And Refresh Token
      deactivate AuthService
      AuthController-->>Client: 19. Return Access Token And Refresh Token
      deactivate AuthController
    end
  end

```
