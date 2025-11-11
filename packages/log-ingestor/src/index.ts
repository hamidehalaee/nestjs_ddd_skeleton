import 'dotenv/config';
import amqplib from 'amqplib';
import { Client } from '@elastic/elasticsearch';

const RABBITMQ_URL = process.env.RABBITMQ_URL!;
const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL!;
const INDEX = process.env.ELASTICSEARCH_INDEX || 'app-logs';

const esClient = new Client({ node: ELASTICSEARCH_URL });

async function start() {
  console.log('🚀 Log Ingestor started');
  console.log(`RabbitMQ: ${RABBITMQ_URL}`);
  console.log(`Elasticsearch: ${ELASTICSEARCH_URL} → ${INDEX}`);

  const conn = await amqplib.connect(RABBITMQ_URL);
  const channel = await conn.createChannel();
  await channel.assertExchange('app-logs', 'fanout', { durable: false });

  const q = await channel.assertQueue('', { exclusive: true });
  await channel.bindQueue(q.queue, 'app-logs', '');

  console.log('Waiting for logs...');

  channel.consume(q.queue, async (msg) => {
    if (msg !== null) {
      const log = JSON.parse(msg.content.toString());

      try {
        await esClient.index({
          index: INDEX,
          body: {
            ...log,
            '@timestamp': new Date().toISOString(),
          },
        });
        console.log(`Indexed → ${log.level} [${log.context}] ${log.message}`);
      } catch (err) {
        console.error('Failed to index:', err);
      }

      channel.ack(msg);
    }
  });
}

start().catch(err => {
  console.error('Ingestor crashed:', err);
  process.exit(1);
});