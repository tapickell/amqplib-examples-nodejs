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
        return ch.get(qok.queue, {noAck: false});
      })
      .then(function(msg) {
        if (msg) {
          console.log(" " + msg.fields.deliveryTag + " [x] " + msg.content.toString());
          ch.ack(msg);
          console.log(" Msg: " + msg.fields.deliveryTag + " Ack'd ");
        } else {
          console.log("logMessage: " + "No Messages At This Time.");
        }
      })
      .then(function() {
        console.log(' [C] Closing Connection');
      });
  });
}).then(null, console.warn);
