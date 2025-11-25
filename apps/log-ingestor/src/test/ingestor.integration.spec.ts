import { start } from '../src/index';
import amqplib from 'amqplib';
import { Client } from '@elastic/elasticsearch';
import { setTimeout } from 'timers/promises';

describe('Log Ingestor (integration)', () => {
  let esClient: Client;

  beforeAll(() => {
    esClient = new Client({ node: process.env.ELASTICSEARCH_URL });
  });

  it('should receive log from RabbitMQ and index in Elasticsearch', async () => {
    // Start ingestor in background
    const stop = await start();

    // Publish test log
    const conn = await amqplib.connect(process.env.RABBITMQ_URL!);
    const ch = await conn.createChannel();
    await ch.assertExchange('app-logs', 'fanout', { durable: false });
    ch.publish('app-logs', '', Buffer.from(JSON.stringify({
      level: 'info',
      message: 'TEST LOG',
      context: 'TestService',
    })));

    // Wait for indexing
    await setTimeout(2000);

    // Verify in ES
    const result = await esClient.search({
      index: 'app-logs*',
      query: { match: { message: 'TEST LOG' } },
    });

    expect(result.hits.total).toBeGreaterThan(0);
    expect(result.hits.hits[0]._source).toMatchObject({
      message: 'TEST LOG',
      context: 'TestService',
    });

    await stop();
    await conn.close();
  }, 30_000);
});