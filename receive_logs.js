#!/usr/bin/env node

var amqp = require('amqplib');

amqp.connect('amqp://localhost').then(function(conn) {
  process.once('SIGINT', function() { conn.close(); });
  return conn.createChannel().then(function(ch) {
    return ch.assertExchange('logs', 'fanout', {durable: true})
      .then(function() {
        var queueName = process.argv.slice(2).join(' ');
        return ch.assertQueue(queueName, {exclusive: false});
      })
      .then(function(qok) {
        return ch.bindQueue(qok.queue, 'logs', '').then(function() {
          return qok.queue;
        });
      })
      .then(function(queue) {
        return ch.consume(queue, logMessage, {noAck: true});
      })
      .then(function() {
        console.log(' [*] Waiting for logs. To exit press CTRL+C');
      });

    function logMessage(msg) {
      console.log(" " + msg.fields.deliveryTag + " [x] " + msg.content.toString());
    }
  });
}).then(null, console.warn);
