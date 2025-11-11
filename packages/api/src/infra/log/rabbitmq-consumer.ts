import * as amqplib from 'amqplib';

async function start() {
  const conn = await amqplib.connect(process.env.RABBITMQ_URL!);
  const ch = await conn.createChannel();
  await ch.assertExchange('app-logs', 'fanout', { durable: false });

  const q = await ch.assertQueue('', { exclusive: true });
  await ch.bindQueue(q.queue, 'app-logs', '');

  console.log(' [*] Waiting for logs. To exit press CTRL+C');
  ch.consume(q.queue, msg => {
    if (msg) console.log(' [x] %s', msg.content.toString());
  }, { noAck: true });
}

start().catch(console.error);