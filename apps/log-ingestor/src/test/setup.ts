import { GenericContainer, StartedTestContainer } from 'testcontainers';

declare global {
  var rabbitmqContainer: StartedTestContainer;
  var esContainer: StartedTestContainer;
}

beforeAll(async () => {
  global.rabbitmqContainer = await new GenericContainer('rabbitmq:3-management')
    .withExposedPorts(5672)
    .start();

  global.esContainer = await new GenericContainer('docker.elastic.co/elasticsearch/elasticsearch:8.15.0')
    .withEnvironment({ 'discovery.type': 'single-node', 'xpack.security.enabled': 'false' })
    .withExposedPorts(9200)
    .start();

  process.env.RABBITMQ_URL = `amqp://localhost:${global.rabbitmqContainer.getMappedPort(5672)}`;
  process.env.ELASTICSEARCH_URL = `http://localhost:${global.esContainer.getMappedPort(9200)}`;
}, 60_000);

afterAll(async () => {
  await global.rabbitmqContainer?.stop();
  await global.esContainer?.stop();
});