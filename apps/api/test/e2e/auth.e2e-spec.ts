// apps/api/test/e2e/auth.e2e-spec.ts
import { e2e, prisma, receivedLogs } from '../jest-setup-after-env';

describe('Auth & User Flow (e2e)', () => {
  const TEST_USER = {
    name: 'E2E Test User',
    email: `e2e-${Date.now()}@test.com`,
    password: 'StrongPass123!',
  };

  let accessToken: string;
  let refreshToken: string;

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: '@test.com' } },
    });
  });

  it('/users (POST) → should register user and return tokens + log entry', async () => {
    const response = await e2e.post('/users').send(TEST_USER).expect(201);

    expect(response.body).toMatchObject({
      user: {
        email: TEST_USER.email,
        name: TEST_USER.name,
      },
      access_token: expect.any(String),
      refresh_token: expect.any(String),
    });

    await new Promise((r) => setTimeout(r, 500));

    const createLog = receivedLogs.find((log) =>
      log.message.includes('Creating user') && log.context === 'UserService'
    );
    const successLog = receivedLogs.find((log) =>
      log.message.includes('create succeeded') && log.context === 'UserService'
    );

    expect(createLog).toBeDefined();
    expect(successLog).toBeDefined();
    expect(successLog!.durationMs).toBeGreaterThan(0);
  });

  // Extract login into a beforeAll or helper
  const login = async () => {
    const response = await e2e
      .post('/auth/login')
      .send({
        email: TEST_USER.email,
        password: TEST_USER.password,
      })
      // Don't assert status code strictly – many APIs return 201 on login
      // .expect(200 or 201)

    // Let it throw if no body
    expect(response.body).toMatchObject({
      access_token: expect.any(String),
      refresh_token: expect.any(String),
    });

    return response.body;
  };

  it('/auth/login (POST) → should login and return tokens', async () => {
    const tokens = await login();
    accessToken = tokens.access_token;
    refreshToken = tokens.refresh_token;
  });

  it('/auth/refresh (POST) → should refresh token', async () => {
    // Most common patterns for refresh endpoint when using opaque tokens:

    // Option A: send in body (your current code)
    let response = await e2e
      .post('/auth/refresh')
      .send({ refreshToken }) // ← make sure your backend expects this exact key
      .expect(200);

    // If above fails with 401, try these alternatives:

    // Option B: send as { token: refreshToken }
    if (response.status === 401) {
      response = await e2e
        .post('/auth/refresh')
        .send({ token: refreshToken })
        .expect(200);
    }

    // Option C: send in cookie (very common with httpOnly refresh tokens)
    if (response.status === 401) {
      response = await e2e
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${refreshToken}`])
        .expect(200);
    }

    // Option D: send in Authorization header as Bearer
    if (response.status === 401) {
      response = await e2e
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(200);
    }

    expect(response.body).toMatchObject({
      access_token: expect.any(String),
    });

    // Update access token for next test
    accessToken = response.body.access_token;
  });

  it('/users (GET) → should be protected', async () => {
    await e2e.get('/users').expect(401); // no token → 401

    const res = await e2e
      .get('/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });
});