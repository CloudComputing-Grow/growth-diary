const amqp = require('amqplib');
const growthEventController = require('../controllers/growthEventController');

async function connectRabbitMQ() {
  try {
    const conn = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    const channel = await conn.createChannel();

    // 1. [유저 팀] Topic 방식 - 회원탈퇴
    const userExchange = 'user.events';
    await channel.assertExchange(userExchange, 'topic', { durable: true });
    const userQ = await channel.assertQueue('growth-diary.user-events.queue', { durable: true }); // 큐 이름 수정
    await channel.bindQueue(userQ.queue, userExchange, 'user.deleted');

    channel.consume(userQ.queue, async (msg) => {
      if (msg !== null) {
        try {
          const eventData = JSON.parse(msg.content.toString());
          console.log('[growth-diary] 회원탈퇴 이벤트 수신:', eventData);
          if (eventData.eventType === 'UserDeleted') {
            await growthEventController.handleUserDeleted(eventData);
            console.log('[growth-diary] 회원탈퇴 데이터 삭제 완료 userId:', eventData.userId);
          }
          channel.ack(msg);
        } catch (error) {
          console.error('[growth-diary] 회원탈퇴 이벤트 처리 에러:', error);
          channel.nack(msg, false, true);
        }
      }
    });

    console.log('[growth-diary] 회원탈퇴 이벤트 구독 완료');

    // 2. [미션 팀] Fanout 방식 - 미션 완료
    const missionExchange = 'grow.mission.fanout';
    await channel.assertExchange(missionExchange, 'fanout', { durable: true });
    const missionQ = await channel.assertQueue('growth-diary.mission.queue', { durable: true });
    await channel.bindQueue(missionQ.queue, missionExchange, '');

    channel.consume(missionQ.queue, async (msg) => {
      if (msg !== null) {
        try {
          const eventData = JSON.parse(msg.content.toString());
          console.log('[growth-diary] 미션 완료 이벤트 수신:', eventData);
          await growthEventController.handleMissionCompleted(eventData);
          console.log('[growth-diary] 미션 완료 처리 완료 userId:', eventData.userId);
          channel.ack(msg);
        } catch (error) {
          console.error('[growth-diary] 미션 완료 이벤트 처리 에러:', error);
          channel.nack(msg, false, true);
        }
      }
    });

    console.log('[growth-diary] 미션 완료 이벤트 구독 완료');

  } catch (err) {
    console.error('RabbitMQ 연결 에러:', err);
  }
}

connectRabbitMQ();

module.exports = { connectRabbitMQ };